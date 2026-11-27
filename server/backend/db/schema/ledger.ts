import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const cashLedger = sqliteTable('cash_ledger', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['receivable', 'payable', 'repayment', 'owner_meal'] }).notNull(),
  personName: text('person_name'),
  amountKHR: integer('amount_khr').notNull().default(0),
  amountUSD: real('amount_usd').notNull().default(0),
  note: text('note'),
  recordedBy: text('recorded_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export type CashLedgerSelect = typeof cashLedger.$inferSelect;
export type CashLedgerInsert = typeof cashLedger.$inferInsert;
