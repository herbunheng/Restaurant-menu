import type { Context } from 'hono';
import { createSuccessResponse } from '@restaurant-menu/shared';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { superAdmins, users } from '../db/schema';
import { logAudit } from '../services/audit';
import type { AppEnv } from '../types';

/**
 * Controller to list super admins
 */
export async function listSuperAdminsController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(
      createSuccessResponse([
        {
          id: 'sa_default',
          userId: 'user_admin',
          canManageSettings: true,
          canManageAdmins: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      200
    );
  }
  const db = getDb(c.env.DB);
  const list = await db.select().from(superAdmins).all();
  return c.json(createSuccessResponse(list), 200);
}

/**
 * Controller to assign super admin role
 */
export async function createSuperAdminController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  // Promote user role to super_admin
  await db.update(users).set({ role: 'super_admin' }).where(eq(users.id, body.userId));

  const newSuperAdmin = {
    id: crypto.randomUUID(),
    userId: body.userId,
    canManageSettings: body.canManageSettings ?? true,
    canManageAdmins: body.canManageAdmins ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(superAdmins).values(newSuperAdmin);

  // Log Audit Event
  await logAudit(c.env.DB, c, {
    action: 'CREATE',
    entity: 'super_admins',
    entityId: newSuperAdmin.id,
    userId: body.userId,
    details: { promotedUserId: body.userId },
  });

  return c.json(createSuccessResponse(newSuperAdmin), 201);
}
