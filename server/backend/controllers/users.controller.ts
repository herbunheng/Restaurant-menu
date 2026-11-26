import type { Context } from 'hono';
import { createSuccessResponse } from '@restaurant-menu/shared';
import { getDb } from '../db';
import { users } from '../db/schema';
import { logAudit } from '../services/audit';
import type { AppEnv } from '../types';

/**
 * Controller to list all users
 */
export async function listUsersController(c: Context<AppEnv>) {
  const db = getDb(c.env.DB);
  const allUsers = await db.select().from(users).all();
  return c.json(createSuccessResponse(allUsers), 200);
}

/**
 * Controller to create a new user
 */
export async function createUserController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  const newId = crypto.randomUUID();
  const newUser = {
    id: newId,
    name: body.name,
    email: body.email,
    role: body.role || 'user',
    avatarUrl: body.avatarUrl || null,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(users).values(newUser);

  // Log Audit Event
  await logAudit(c.env.DB, c, {
    action: 'CREATE',
    entity: 'users',
    entityId: newId,
    userEmail: body.email,
    details: { name: body.name, email: body.email, role: body.role },
  });

  return c.json(createSuccessResponse(newUser), 201);
}
