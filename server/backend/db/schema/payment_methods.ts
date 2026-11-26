import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  accountName: text('account_name'),
  accountNumber: text('account_number'),
  qrImageUrl: text('qr_image_url'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type PaymentMethodSelect = typeof paymentMethods.$inferSelect;
export type PaymentMethodInsert = typeof paymentMethods.$inferInsert;
