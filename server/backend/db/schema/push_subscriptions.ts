import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const pushSubscriptions = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userId: text('user_id'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type PushSubscriptionItem = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionItem = typeof pushSubscriptions.$inferInsert;
