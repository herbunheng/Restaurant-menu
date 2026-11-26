import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  gender: text('gender', { enum: ['male', 'female', 'other'] }).notNull().default('male'),
  role: text('role').notNull().default('waiter'),
  telegram: text('telegram'),
  phone: text('phone'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type StaffSelect = typeof staff.$inferSelect;
export type StaffInsert = typeof staff.$inferInsert;
