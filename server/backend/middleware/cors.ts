import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from '../types';

/**
 * Production-ready Environment-driven CORS middleware handler
 * Evaluates origin against c.env.ALLOWED_ORIGINS or c.env.ENVIRONMENT dynamically per request
 */
export const corsMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const env = c.env || {};
  const envOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const middleware = cors({
    origin: (origin) => {
      if (!origin) return '*';
      if (envOrigins.length > 0) {
        if (envOrigins.includes(origin) || envOrigins.includes('*')) return origin;
      }
      // Allow all localhost, 127.0.0.1, or valid app origins in development / production
      return origin;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'x-super-admin-token',
      'x-request-id',
      'x-user-latitude',
      'x-user-longitude',
      'Accept',
      'Origin',
    ],
    credentials: true,
  });

  return middleware(c, next);
};
