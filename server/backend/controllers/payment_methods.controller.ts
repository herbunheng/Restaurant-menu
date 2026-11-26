import type { Context } from 'hono';
import {
  createSuccessResponse,
  createErrorResponse,
  CreatePaymentMethodInputSchema,
  UpdatePaymentMethodInputSchema,
  type PaymentMethodConfig,
} from '@restaurant-menu/shared';
import { asc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { paymentMethods } from '../db/schema/payment_methods';
import type { AppEnv } from '../types';

// Default Seed Options (ពេញនិយមបំផុតនៅកម្ពុជា)
const defaultSeedPaymentMethods: PaymentMethodConfig[] = [
  {
    id: 'pay_cash',
    name: 'សាច់ប្រាក់ (Cash)',
    code: 'cash',
    accountName: null,
    accountNumber: null,
    qrImageUrl: null,
    isEnabled: true,
    sortOrder: 1,
    description: 'ទូទាត់ជាក្រដាសប្រាក់ដុល្លារ ($) ឬប្រាក់រៀល (៛)',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'pay_aba',
    name: 'ABA Bank',
    code: 'aba',
    accountName: 'RESTAURANT OWNER',
    accountNumber: '001 234 567',
    qrImageUrl: null,
    isEnabled: true,
    sortOrder: 2,
    description: 'ស្កេនទូទាត់តាម ABA Mobile ឬ Bakong KHQR',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'pay_acleda',
    name: 'ACLEDA Bank',
    code: 'acleda',
    accountName: 'RESTAURANT OWNER',
    accountNumber: '1234-5678-9012',
    qrImageUrl: null,
    isEnabled: true,
    sortOrder: 3,
    description: 'ស្កេនទូទាត់តាម ACLEDA Mobile ឬ Bakong KHQR',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'pay_wing',
    name: 'Wing Bank',
    code: 'wing',
    accountName: 'RESTAURANT OWNER',
    accountNumber: '01234567',
    qrImageUrl: null,
    isEnabled: false,
    sortOrder: 4,
    description: 'ស្កេនទូទាត់តាម Wing Bank App ឬ KHQR',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'pay_card',
    name: 'កាតធនាគារ (Visa/Mastercard)',
    code: 'card',
    accountName: null,
    accountNumber: null,
    qrImageUrl: null,
    isEnabled: false,
    sortOrder: 5,
    description: 'ឆូតកាតតាមម៉ាស៊ីន POS Terminal',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
];

let mockPaymentMethods: PaymentMethodConfig[] = [...defaultSeedPaymentMethods];

export async function listPaymentMethodsController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(createSuccessResponse(mockPaymentMethods), 200);
  }

  try {
    const db = getDb(c.env.DB);
    let rows = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder)).all();

    // Auto-seed initial methods if table is empty
    if (rows.length === 0) {
      for (const m of defaultSeedPaymentMethods) {
        await db.insert(paymentMethods).values({
          id: m.id,
          name: m.name,
          code: m.code,
          accountName: m.accountName || null,
          accountNumber: m.accountNumber || null,
          qrImageUrl: m.qrImageUrl || null,
          isEnabled: m.isEnabled,
          sortOrder: m.sortOrder,
          description: m.description || null,
          createdAt: m.createdAt as Date,
          updatedAt: m.updatedAt as Date,
        });
      }
      rows = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder)).all();
    }

    return c.json(createSuccessResponse(rows as PaymentMethodConfig[]), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list payment methods'), 500);
  }
}

export async function getActivePaymentMethodsController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    const active = mockPaymentMethods.filter((m) => m.isEnabled);
    return c.json(createSuccessResponse(active), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const rows = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isEnabled, true))
      .orderBy(asc(paymentMethods.sortOrder))
      .all();

    return c.json(createSuccessResponse(rows as PaymentMethodConfig[]), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list active payment methods'), 500);
  }
}

export async function createPaymentMethodController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const parsed = CreatePaymentMethodInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid payment method data'),
      400
    );
  }

  const { name, code, accountName, accountNumber, qrImageUrl, isEnabled, sortOrder, description } = parsed.data;

  const newMethod: PaymentMethodConfig = {
    id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    code: code.trim().toLowerCase(),
    accountName: accountName?.trim() || null,
    accountNumber: accountNumber?.trim() || null,
    qrImageUrl: qrImageUrl?.trim() || null,
    isEnabled: isEnabled ?? true,
    sortOrder: sortOrder ?? 0,
    description: description?.trim() || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!c.env?.DB) {
    mockPaymentMethods.push(newMethod);
    return c.json(createSuccessResponse(newMethod), 201);
  }

  try {
    const db = getDb(c.env.DB);
    await db.insert(paymentMethods).values({
      id: newMethod.id,
      name: newMethod.name,
      code: newMethod.code,
      accountName: newMethod.accountName,
      accountNumber: newMethod.accountNumber,
      qrImageUrl: newMethod.qrImageUrl,
      isEnabled: newMethod.isEnabled,
      sortOrder: newMethod.sortOrder,
      description: newMethod.description,
      createdAt: newMethod.createdAt as Date,
      updatedAt: newMethod.updatedAt as Date,
    });

    return c.json(createSuccessResponse(newMethod), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to create payment method'), 500);
  }
}

export async function updatePaymentMethodController(c: Context<AppEnv>) {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdatePaymentMethodInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid update data'),
      400
    );
  }

  const updates = parsed.data;

  if (!c.env?.DB) {
    const idx = mockPaymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) {
      return c.json(createErrorResponse('NOT_FOUND', 'Payment method not found'), 404);
    }

    const current = mockPaymentMethods[idx]!;
    const updated: PaymentMethodConfig = {
      ...current,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      code: updates.code !== undefined ? updates.code.trim().toLowerCase() : current.code,
      accountName: updates.accountName !== undefined ? updates.accountName?.trim() || null : current.accountName,
      accountNumber: updates.accountNumber !== undefined ? updates.accountNumber?.trim() || null : current.accountNumber,
      qrImageUrl: updates.qrImageUrl !== undefined ? updates.qrImageUrl?.trim() || null : current.qrImageUrl,
      description: updates.description !== undefined ? updates.description?.trim() || null : current.description,
      updatedAt: new Date(),
    };

    mockPaymentMethods[idx] = updated;
    return c.json(createSuccessResponse(updated), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const existing = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).get();

    if (!existing) {
      return c.json(createErrorResponse('NOT_FOUND', 'Payment method not found'), 404);
    }

    const updatePayload: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.code !== undefined) updatePayload.code = updates.code.trim().toLowerCase();
    if (updates.accountName !== undefined) updatePayload.accountName = updates.accountName?.trim() || null;
    if (updates.accountNumber !== undefined) updatePayload.accountNumber = updates.accountNumber?.trim() || null;
    if (updates.qrImageUrl !== undefined) updatePayload.qrImageUrl = updates.qrImageUrl?.trim() || null;
    if (updates.description !== undefined) updatePayload.description = updates.description?.trim() || null;

    await db.update(paymentMethods).set(updatePayload).where(eq(paymentMethods.id, id));
    const finalMethod = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).get();

    return c.json(createSuccessResponse(finalMethod as unknown as PaymentMethodConfig), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to update payment method'), 500);
  }
}

export async function deletePaymentMethodController(c: Context<AppEnv>) {
  const id = c.req.param('id');

  if (!c.env?.DB) {
    const idx = mockPaymentMethods.findIndex((m) => m.id === id);
    if (idx === -1) {
      return c.json(createErrorResponse('NOT_FOUND', 'Payment method not found'), 404);
    }
    mockPaymentMethods.splice(idx, 1);
    return c.json(createSuccessResponse({ id }), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const existing = await db.select().from(paymentMethods).where(eq(paymentMethods.id, id)).get();

    if (!existing) {
      return c.json(createErrorResponse('NOT_FOUND', 'Payment method not found'), 404);
    }

    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    return c.json(createSuccessResponse({ id }), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to delete payment method'), 500);
  }
}
