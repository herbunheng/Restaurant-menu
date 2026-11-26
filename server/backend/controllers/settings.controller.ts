import type { Context } from 'hono';
import { createSuccessResponse, createErrorResponse } from '@restaurant-menu/shared';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { siteSettings } from '../db/schema';
import { sendTelegramNotification, sendResendEmail } from '../services/notification';
import { logAudit } from '../services/audit';
import type { AppEnv } from '../types';

/**
 * Controller to fetch site settings
 */
export async function getSettingsController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(
      createSuccessResponse({
        id: 'default',
        siteName: 'Restaurant Menu',
        siteDescription: 'Modern restaurant menu application',
        telegramEnabled: false,
        resendEnabled: false,
        allowRegistration: true,
        requireEmailVerification: false,
        maintenanceMode: false,
        maintenanceMessage: 'We are currently under scheduled maintenance. Please check back soon.',
      }),
      200
    );
  }

  const db = getDb(c.env.DB);
  
  let settings = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).get();
  
  if (!settings) {
    const defaultData = {
      id: 'default',
      siteName: 'Restaurant Menu',
      siteDescription: 'Modern restaurant menu application',
      telegramEnabled: false,
      resendEnabled: false,
      allowRegistration: true,
      requireEmailVerification: false,
      maintenanceMode: false,
      maintenanceMessage: 'We are currently under scheduled maintenance. Please check back soon.',
    };
    await db.insert(siteSettings).values(defaultData);
    settings = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).get();
  }

  return c.json(createSuccessResponse(settings!), 200);
}

/**
 * Controller to update site configuration (Branding, Telegram, Resend, Auth, Maintenance, SEO)
 */
export async function updateSettingsController(c: Context<AppEnv>) {
  const body = await c.req.json();

  if (!c.env?.DB) {
    return c.json(
      createSuccessResponse({
        id: 'default',
        siteName: 'Restaurant Menu',
        ...body,
        updatedAt: new Date(),
      }),
      200
    );
  }

  const db = getDb(c.env.DB);

  const existing = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).get();

  // Exclude metadata fields (id, createdAt, updatedAt) sent by client so Drizzle timestamp parser receives pure Date
  const { id, createdAt, updatedAt, ...fieldsToUpdate } = body;

  const updatePayload = {
    ...fieldsToUpdate,
    updatedAt: new Date(),
  };

  if (!existing) {
    await db.insert(siteSettings).values({
      id: 'default',
      siteName: body.siteName || 'My Site',
      telegramEnabled: body.telegramEnabled ?? false,
      resendEnabled: body.resendEnabled ?? false,
      allowRegistration: body.allowRegistration ?? true,
      requireEmailVerification: body.requireEmailVerification ?? false,
      maintenanceMode: body.maintenanceMode ?? false,
      ...updatePayload,
      createdAt: new Date(),
    });
  } else {
    await db.update(siteSettings).set(updatePayload).where(eq(siteSettings.id, 'default'));
  }

  const updated = await db.select().from(siteSettings).where(eq(siteSettings.id, 'default')).get();

  // Log Audit Event
  await logAudit(c.env.DB, c, {
    action: 'SETTING_CHANGE',
    entity: 'site_settings',
    entityId: 'default',
    details: {
      updatedFields: Object.keys(fieldsToUpdate),
      telegramEnabled: body.telegramEnabled,
      resendEnabled: body.resendEnabled,
      maintenanceMode: body.maintenanceMode,
    },
  });

  return c.json(createSuccessResponse(updated!), 200);
}

/**
 * Controller to test Telegram notification
 */
export async function testTelegramController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }
  const body = await c.req.json().catch(() => ({}));
  const res = await sendTelegramNotification(
    c.env.DB,
    body.message || '🔔 Test notification from Super Admin Settings',
    {
      token: body.telegramToken,
      groupId: body.telegramGroupId,
      ignoreEnabled: true, // Allow test execution from setting modal
    }
  );
  
  await logAudit(c.env.DB, c, {
    action: 'TEST_TELEGRAM',
    entity: 'site_settings',
    status: res.success ? 'SUCCESS' : 'FAILED',
    details: { error: res.error },
  });

  if (!res.success) {
    return c.json(createErrorResponse('TELEGRAM_FAILED', res.error || 'Failed to send Telegram message'), 400);
  }
  return c.json(createSuccessResponse({ message: 'Telegram message sent successfully' }), 200);
}

/**
 * Controller to test Resend Email notification
 */
export async function testEmailController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }
  const body = await c.req.json().catch(() => ({}));
  
  if (!body.to) {
    return c.json(createErrorResponse('INVALID_INPUT', 'Recipient email address (to) is required for testing'), 400);
  }

  const res = await sendResendEmail(
    c.env.DB,
    {
      to: body.to,
      subject: body.subject || 'Test Email from Super Admin Settings',
      html: body.message || '<p>This is a test email sent from Resend integration!</p>',
    },
    {
      apiKey: body.resendApiKey,
      mailFrom: body.mailFrom,
      mailFromName: body.mailFromName,
      ignoreEnabled: true, // Allow test execution from setting modal
    }
  );

  await logAudit(c.env.DB, c, {
    action: 'TEST_RESEND_EMAIL',
    entity: 'site_settings',
    status: res.success ? 'SUCCESS' : 'FAILED',
    details: { recipient: body.to, error: res.error },
  });

  if (!res.success) {
    return c.json(createErrorResponse('RESEND_FAILED', res.error || 'Failed to send email via Resend'), 400);
  }
  return c.json(createSuccessResponse({ message: 'Email sent successfully via Resend' }), 200);
}
