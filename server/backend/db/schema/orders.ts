import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import type { OrderItem } from '@restaurant-menu/shared';

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: integer('order_number').notNull(),
  tableNumber: text('table_number').notNull(),
  items: text('items', { mode: 'json' }).$type<OrderItem[]>().notNull(),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').notNull().default(0),
  totalAmount: real('total_amount').notNull(),
  paymentMethod: text('payment_method').notNull().default('cash'),
  paymentStatus: text('payment_status').notNull().default('paid'),
  cashierName: text('cashier_name').default('Cashier'),
  note: text('note'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
