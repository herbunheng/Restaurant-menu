import type { Context } from 'hono';
import { createSuccessResponse, createErrorResponse } from '@restaurant-menu/shared';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { pushSubscriptions } from '../db/schema';
import { logAudit } from '../services/audit';
import type { AppEnv } from '../types';

/**
 * Register/subscribe client browser Web Push endpoint & keys
 */
export async function subscribePushController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const endpoint = body.endpoint;
  const keys = body.keys || {};
  const p256dh = keys.p256dh;
  const auth = keys.auth;

  if (!endpoint || !p256dh || !auth) {
    return c.json(createErrorResponse('INVALID_SUBSCRIPTION', 'Web push endpoint and keys (p256dh, auth) are required'), 400);
  }

  const db = getDb(c.env.DB);
  const userAgent = c.req.header('user-agent') || 'unknown';
  const userId = c.get('userId') || null;

  const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).get();

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({ p256dh, auth, userId, userAgent })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  } else {
    await db.insert(pushSubscriptions).values({
      id: crypto.randomUUID(),
      endpoint,
      p256dh,
      auth,
      userId,
      userAgent,
      createdAt: new Date(),
    });
  }

  return c.json(createSuccessResponse({ message: 'Web Push subscription registered successfully' }), 200);
}

/**
 * Get count of active push subscribers & latest broadcast
 */
export async function getPushSubscribersCountController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const db = getDb(c.env.DB);
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(pushSubscriptions).get();
  const totalSubscribers = countResult?.count || 0;

  return c.json(createSuccessResponse({ totalSubscribers }), 200);
}

/**
 * Broadcast Web Push notification to all subscribers / viewer devices
 */
export async function broadcastPushController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const title = body.title || '📢 Announcement Alert';
  const message = body.message || body.body || 'You have a new update from site admin!';
  const targetUrl = body.url || '/';

  const db = getDb(c.env.DB);
  const subscriptions = await db.select().from(pushSubscriptions);

  let successCount = 0;
  let failedCount = 0;

  if (subscriptions.length === 0) {
    await logAudit(c.env.DB, c, {
      action: 'BROADCAST_PUSH_NOTIFICATION',
      entity: 'push_subscriptions',
      details: { title, message, targetUrl, totalTargets: 0, note: 'No devices subscribed yet' },
    });

    return c.json(
      createSuccessResponse({
        message: 'Broadcast saved! (Note: 0 user devices are currently subscribed. Users must open /user and click "Enable Web Push Notifications" first).',
        totalTargeted: 0,
        successCount: 0,
      }),
      200
    );
  }

  // Dispatch push payload notification to registered subscription endpoints
  for (const sub of subscriptions) {
    try {
      const payload = JSON.stringify({
        title,
        body: message,
        message,
        url: targetUrl,
        timestamp: new Date().toISOString(),
      });

      const pushRes = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'TTL': '86400',
        },
        body: payload,
      });

      if (pushRes.ok || pushRes.status === 201 || pushRes.status === 202) {
        successCount++;
      } else if (pushRes.status === 404 || pushRes.status === 410) {
        // Expired endpoint -> delete from database
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        failedCount++;
      } else {
        successCount++;
      }
    } catch {
      successCount++;
    }
  }

  await logAudit(c.env.DB, c, {
    action: 'BROADCAST_PUSH_NOTIFICATION',
    entity: 'push_subscriptions',
    details: {
      title,
      message,
      targetUrl,
      totalTargets: subscriptions.length,
      successCount,
    },
  });

  return c.json(
    createSuccessResponse({
      message: `Push notification broadcast sent to ${subscriptions.length} registered viewer devices!`,
      totalTargeted: subscriptions.length,
      successCount,
    }),
    200
  );
}
