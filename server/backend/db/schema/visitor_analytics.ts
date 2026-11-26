import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const visitorAnalytics = sqliteTable('visitor_analytics', {
  id: text('id').primaryKey(),
  path: text('path').notNull(),
  domain: text('domain'),
  referrer: text('referrer'),
  ipAddress: text('ip_address'),
  country: text('country'), // Country code e.g. 'US', 'KH', 'JP'
  region: text('region'),   // Province / State e.g. 'Phnom Penh', 'California'
  city: text('city'),       // City name
  timezone: text('timezone'),
  isp: text('isp'),         // Network / ISP connection e.g. 'Metfone', 'AT&T'
  device: text('device', { enum: ['desktop', 'mobile', 'tablet', 'bot', 'unknown'] }).default('unknown'),
  os: text('os'),           // 'Windows', 'macOS', 'iOS', 'Android', 'Linux'
  browser: text('browser'),   // 'Chrome', 'Safari', 'Firefox', 'Edge'
  brand: text('brand'),       // 'Apple', 'Samsung', 'Google', 'Unknown'
  connectionType: text('connection_type'), // 'Datacenter/VPN', 'Mobile Data', 'Broadband / ISP'
  latitude: text('latitude'),
  longitude: text('longitude'),
  locationSource: text('location_source', { enum: ['gps', 'ip', 'unknown'] }).default('unknown'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type VisitorAnalytic = typeof visitorAnalytics.$inferSelect;
export type NewVisitorAnalytic = typeof visitorAnalytics.$inferInsert;

export const customEvents = sqliteTable('custom_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id'),
  userId: text('user_id'),
  eventName: text('event_name').notNull(),
  eventCategory: text('event_category'),
  eventLabel: text('event_label'),
  eventValue: integer('event_value'),
  path: text('path').notNull(),
  metadata: text('metadata'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type CustomEventRecord = typeof customEvents.$inferSelect;
export type NewCustomEventRecord = typeof customEvents.$inferInsert;
