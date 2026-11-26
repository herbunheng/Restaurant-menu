import type { Context } from 'hono';
import { createSuccessResponse } from '@restaurant-menu/shared';
import { desc, gte } from 'drizzle-orm';
import { getDb } from '../db';
import { auditLogs } from '../db/schema/audit_logs';
import type { AppEnv } from '../types';

/**
 * Controller to list audit logs with time period filter
 */
export async function listAuditLogsController(c: Context<AppEnv>) {
  const page = Number(c.req.query('page') || '1');
  const limit = Number(c.req.query('limit') || '50');
  const period = c.req.query('period') || 'ALL'; // 1D, 1W, 1M, 3M, 6M, 1Y, ALL
  const offset = (page - 1) * limit;

  const db = getDb(c.env.DB);

  let startDate: Date | undefined;
  const now = Date.now();

  switch (period) {
    case '1D':
      startDate = new Date(now - 24 * 60 * 60 * 1000);
      break;
    case '1W':
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
      break;
    case '1M':
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3M':
      startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6M':
      startDate = new Date(now - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1Y':
      startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = undefined;
  }

  const logs = await db
    .select()
    .from(auditLogs)
    .where(startDate ? gte(auditLogs.createdAt, startDate) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json(createSuccessResponse(logs), 200);
}
