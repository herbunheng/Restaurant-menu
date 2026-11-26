import type { Context } from 'hono';
import { getDb } from '../db';
import { auditLogs } from '../db/schema/audit_logs';

export interface AuditParams {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'LOGIN' | 'SETTING_CHANGE' | 'VIEW_PAGE' | string;
  entity: string; // e.g. 'users', 'site_settings', 'super_admins', 'pages'
  entityId?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  route?: string;
  country?: string;
  region?: string;
  city?: string;
  details?: Record<string, unknown> | string;
  status?: 'SUCCESS' | 'FAILED';
}

/**
 * Extracts client IP address from Cloudflare Workers request headers
 */
export function getClientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Helper to persist audit logs in Cloudflare D1
 */
export async function logAudit(d1: D1Database | undefined, c: Context, params: AuditParams) {
  if (!d1) return;

  try {
    const db = getDb(d1);
    const ipAddress = getClientIp(c);
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Cloudflare Workers geo headers
    const cf = (c.req.raw as any)?.cf || {};
    const country = params.country || cf.country || c.req.header('cf-ipcountry') || null;
    const region = params.region || cf.region || cf.regionCode || c.req.header('cf-region') || c.req.header('cf-region-code') || null;
    const city = params.city || cf.city || c.req.header('cf-ipcity') || null;
    const route = params.route || c.req.path || '/';

    // Retrieve userId from Hono Context variable if not explicitly passed
    const userId = params.userId || (c.get('userId') as string | undefined) || null;
    const detailsString = typeof params.details === 'object' ? JSON.stringify(params.details) : params.details || null;

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      action: params.action,
      entity: params.entity,
      entityId: params.entityId || null,
      userId: userId,
      userEmail: params.userEmail || null,
      userRole: params.userRole || null,
      ipAddress: ipAddress,
      userAgent: userAgent,
      route: route,
      country: country,
      region: region,
      city: city,
      details: detailsString,
      status: params.status || 'SUCCESS',
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
