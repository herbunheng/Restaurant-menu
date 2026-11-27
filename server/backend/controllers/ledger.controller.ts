import type { Context } from 'hono';
import {
  createSuccessResponse,
  createErrorResponse,
  CreateLedgerEntryInputSchema,
  type LedgerEntry,
} from '@restaurant-menu/shared';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { cashLedger } from '../db/schema/ledger';
import type { AppEnv } from '../types';

export async function listLedgerController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const targetDate = c.req.query('date');
  try {
    const db = getDb(c.env.DB);
    const rows = await db.select().from(cashLedger).orderBy(desc(cashLedger.createdAt)).all();
    const list = (rows as LedgerEntry[]).filter((row) => {
      if (!targetDate) return true;
      const d = new Date(row.createdAt || Date.now()).toISOString().slice(0, 10);
      return d === targetDate;
    });
    return c.json(createSuccessResponse(list), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to load ledger entries'), 500);
  }
}

export async function createLedgerController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = CreateLedgerEntryInputSchema.safeParse(rawBody);
  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid ledger entry'),
      400
    );
  }

  const data = parsed.data;
  const entry = {
    id: `ldg_${crypto.randomUUID().slice(0, 8)}`,
    type: data.type,
    personName: (data.personName ?? '').trim() || null,
    amountKHR: Math.round(Number(data.amountKHR) || 0),
    amountUSD: Number((Number(data.amountUSD) || 0).toFixed(2)),
    note: (data.note ?? '').trim() || null,
    recordedBy: (data.recordedBy ?? '').trim() || 'Cashier 01',
    createdAt: new Date(),
  };

  try {
    const db = getDb(c.env.DB);
    await db.insert(cashLedger).values(entry);
    return c.json(createSuccessResponse(entry), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to save ledger entry'), 500);
  }
}

export async function deleteLedgerController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const id = c.req.param('id');
  if (!id) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Ledger entry ID is required'), 400);
  }

  try {
    const db = getDb(c.env.DB);
    await db.delete(cashLedger).where(eq(cashLedger.id, id));
    return c.json(createSuccessResponse({ id }), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to delete ledger entry'), 500);
  }
}
