import type { Context } from 'hono';
import {
  createSuccessResponse,
  createErrorResponse,
  CreateStaffInputSchema,
  UpdateStaffInputSchema,
  type Staff,
} from '@restaurant-menu/shared';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { staff } from '../db/schema/staff';
import type { AppEnv } from '../types';

// Mock storage / seed for local development
const defaultSeedStaff: Staff[] = [
  {
    id: 'staff_01',
    name: 'សុខា',
    gender: 'female',
    role: 'waiter',
    telegram: '@sokha_service',
    phone: '012 345 678',
    status: 'active',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: 'staff_02',
    name: 'ដារ៉ា',
    gender: 'male',
    role: 'waiter',
    telegram: '@dara_waiter',
    phone: '098 765 432',
    status: 'active',
    createdAt: new Date('2026-01-02'),
    updatedAt: new Date('2026-01-02'),
  },
  {
    id: 'staff_03',
    name: 'ចាន់ណា',
    gender: 'female',
    role: 'cashier',
    telegram: '@channa_cashier',
    phone: '088 123 456',
    status: 'active',
    createdAt: new Date('2026-01-03'),
    updatedAt: new Date('2026-01-03'),
  },
  {
    id: 'staff_04',
    name: 'ពិសិដ្ឋ',
    gender: 'male',
    role: 'chef',
    telegram: '@piseth_chef',
    phone: '097 555 888',
    status: 'active',
    createdAt: new Date('2026-01-04'),
    updatedAt: new Date('2026-01-04'),
  },
  {
    id: 'staff_05',
    name: 'កញ្ញា',
    gender: 'female',
    role: 'manager',
    telegram: '@kanya_manager',
    phone: '010 999 777',
    status: 'active',
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05'),
  },
];

let mockStaffList: Staff[] = [...defaultSeedStaff];

export async function listStaffController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(createSuccessResponse(mockStaffList), 200);
  }

  try {
    const db = getDb(c.env.DB);
    let rows = await db.select().from(staff).orderBy(desc(staff.createdAt)).all();

    // Auto-seed initial staff if table is empty
    if (rows.length === 0) {
      for (const s of defaultSeedStaff) {
        await db.insert(staff).values({
          id: s.id,
          name: s.name,
          gender: s.gender,
          role: s.role,
          telegram: s.telegram || null,
          phone: s.phone || null,
          status: s.status,
          createdAt: s.createdAt as Date,
          updatedAt: s.updatedAt as Date,
        });
      }
      rows = await db.select().from(staff).orderBy(desc(staff.createdAt)).all();
    }

    return c.json(createSuccessResponse(rows as Staff[]), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list staff'), 500);
  }
}

export async function createStaffController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const parsed = CreateStaffInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid staff data'),
      400
    );
  }

  const { name, gender, role, telegram, phone, status } = parsed.data;

  const newStaff: Staff = {
    id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    gender,
    role: role.trim(),
    telegram: telegram?.trim() || null,
    phone: phone?.trim() || null,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!c.env?.DB) {
    mockStaffList.unshift(newStaff);
    return c.json(createSuccessResponse(newStaff), 201);
  }

  try {
    const db = getDb(c.env.DB);
    await db.insert(staff).values({
      id: newStaff.id,
      name: newStaff.name,
      gender: newStaff.gender,
      role: newStaff.role,
      telegram: newStaff.telegram,
      phone: newStaff.phone,
      status: newStaff.status,
      createdAt: newStaff.createdAt as Date,
      updatedAt: newStaff.updatedAt as Date,
    });

    return c.json(createSuccessResponse(newStaff), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to create staff'), 500);
  }
}

export async function updateStaffController(c: Context<AppEnv>) {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateStaffInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid staff data'),
      400
    );
  }

  const updates = parsed.data;

  if (!c.env?.DB) {
    const idx = mockStaffList.findIndex((s) => s.id === id);
    if (idx === -1) {
      return c.json(createErrorResponse('NOT_FOUND', 'Staff member not found'), 404);
    }

    const current = mockStaffList[idx]!;
    const updated: Staff = {
      ...current,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      gender: updates.gender !== undefined ? updates.gender : current.gender,
      role: updates.role !== undefined ? updates.role.trim() : current.role,
      telegram: updates.telegram !== undefined ? updates.telegram?.trim() || null : current.telegram,
      phone: updates.phone !== undefined ? updates.phone?.trim() || null : current.phone,
      status: updates.status !== undefined ? updates.status : current.status,
      updatedAt: new Date(),
    };

    mockStaffList[idx] = updated;
    return c.json(createSuccessResponse(updated), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const existing = await db.select().from(staff).where(eq(staff.id, id)).get();

    if (!existing) {
      return c.json(createErrorResponse('NOT_FOUND', 'Staff member not found'), 404);
    }

    const updatePayload: any = {
      ...updates,
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.role !== undefined) updatePayload.role = updates.role.trim();
    if (updates.telegram !== undefined) updatePayload.telegram = updates.telegram?.trim() || null;
    if (updates.phone !== undefined) updatePayload.phone = updates.phone?.trim() || null;

    await db.update(staff).set(updatePayload).where(eq(staff.id, id));
    const finalStaff = await db.select().from(staff).where(eq(staff.id, id)).get();

    return c.json(createSuccessResponse(finalStaff as unknown as Staff), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to update staff'), 500);
  }
}

export async function deleteStaffController(c: Context<AppEnv>) {
  const id = c.req.param('id');

  if (!c.env?.DB) {
    const idx = mockStaffList.findIndex((s) => s.id === id);
    if (idx === -1) {
      return c.json(createErrorResponse('NOT_FOUND', 'Staff member not found'), 404);
    }
    mockStaffList.splice(idx, 1);
    return c.json(createSuccessResponse({ id }), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const existing = await db.select().from(staff).where(eq(staff.id, id)).get();

    if (!existing) {
      return c.json(createErrorResponse('NOT_FOUND', 'Staff member not found'), 404);
    }

    await db.delete(staff).where(eq(staff.id, id));
    return c.json(createSuccessResponse({ id }), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to delete staff'), 500);
  }
}
