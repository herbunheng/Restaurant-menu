import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(), // CREATE, UPDATE, DELETE, LOGIN, SETTING_CHANGE, VIEW_PAGE, etc.
  entity: text('entity').notNull(), // users, site_settings, super_admins, pages, etc.
  entityId: text('entity_id'),
  userId: text('user_id'),
  userEmail: text('user_email'),
  userRole: text('user_role'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  route: text('route'), // e.g. /admin/logs, /admin/settings
  country: text('country'), // Cloudflare cf-ipcountry (e.g. KH, US)
  region: text('region'), // Cloudflare cf-region (e.g. Phnom Penh)
  city: text('city'), // Cloudflare cf-ipcity
  details: text('details'), // JSON stringified payload or diff metadata
  status: text('status', { enum: ['SUCCESS', 'FAILED'] }).notNull().default('SUCCESS'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
