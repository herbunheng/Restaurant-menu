import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const menuItems = sqliteTable('menu_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  price: real('price').notNull().default(0),
  currency: text('currency').notNull().default('USD'),
  imageUrl: text('image_url'),
  description: text('description'),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
