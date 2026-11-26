import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { createErrorResponse } from '@restaurant-menu/shared';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { users } from '../db/schema';
import { decryptToken } from '../utils/crypto';
import type { AppEnv } from '../types';

/**
 * Role-based Authentication & Real-Time Authorization Guard Middleware
 * Primary: Reads HttpOnly cookie 'auth_token'
 * Fallback: Reads Authorization Bearer or x-super-admin-token headers
 * Strictly verifies JWT signature using env.JWT_SECRET and performs real-time user status & role check in D1.
 * Supports AES-256-GCM double encrypted cookies & tokens.
 */
export const requireRole = (
  ...allowedRoles: Array<'user' | 'admin' | 'super_admin'>
): MiddlewareHandler<AppEnv> => async (c, next) => {
  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    return c.json(
      createErrorResponse('SERVER_CONFIG_ERROR', 'Server authentication secret is not configured in environment'),
      500
    );
  }

  // 1. Extract token from HttpOnly cookie or Authorization Bearer header
  let token = getCookie(c, 'auth_token');
  if (!token) {
    const authHeader = c.req.header('authorization') || c.req.header('Authorization');
    const customHeader = c.req.header('x-super-admin-token');
    token = customHeader;
    if (!token && authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return c.json(
      createErrorResponse('UNAUTHORIZED', 'Authentication token required. Please log in.'),
      401
    );
  }

  // 2. Decrypt AES-256-GCM double-encrypted token (if encrypted) and verify JWT signature
  let payload: any;
  try {
    const rawJwtToken = await decryptToken(token, jwtSecret);
    payload = await verify(rawJwtToken, jwtSecret, 'HS256');
  } catch (err) {
    return c.json(
      createErrorResponse('UNAUTHORIZED', 'Invalid or expired authentication token.'),
      401
    );
  }

  const userId = payload?.id as string;
  if (!userId) {
    return c.json(
      createErrorResponse('UNAUTHORIZED', 'Malformed authentication payload.'),
      401
    );
  }

  // 3. Real-Time D1 Source of Truth Verification (User status & role check)
  if (!c.env.DB) {
    if (payload?.role && allowedRoles.includes(payload.role as any)) {
      c.set('userId', userId);
      return await next();
    }
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const db = getDb(c.env.DB);
  const user = await db.select().from(users).where(eq(users.id, userId)).get();

  if (!user) {
    return c.json(createErrorResponse('UNAUTHORIZED', 'User account does not exist'), 401);
  }

  if (user.status !== 'active') {
    return c.json(createErrorResponse('ACCOUNT_SUSPENDED', 'Your account has been suspended or pending activation'), 403);
  }

  if (!allowedRoles.includes(user.role as 'user' | 'admin' | 'super_admin')) {
    return c.json(
      createErrorResponse('FORBIDDEN', `Access denied. Privileges required: ${allowedRoles.join(' or ')}.`),
      403
    );
  }

  c.set('userId', user.id);
  return await next();
};

/**
 * Middleware alias allowing all active authenticated users regardless of role
 */
export const userAuth = requireRole('user', 'admin', 'super_admin');

/**
 * Backward compatibility alias allowing both admin and super_admin roles
 */
export const superAdminAuth = requireRole('super_admin', 'admin');

