import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createErrorResponse } from '@restaurant-menu/shared';
import type { AppEnv } from '../types';

/**
 * Centralized Hono Global Error Handler
 */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  console.error('[Unhandled API Error]:', err);

  // Handle Hono HTTP Exceptions
  if (err instanceof HTTPException) {
    return c.json(
      createErrorResponse('HTTP_ERROR', err.message),
      err.status
    );
  }

  // Handle Zod Validation Errors
  if ('issues' in err && Array.isArray((err as any).issues)) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', 'Invalid request parameters', (err as any).issues),
      400
    );
  }

  // Handle Unknown Internal Server Errors
  const isDev = c.env?.ENVIRONMENT === 'development';
  return c.json(
    createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      isDev ? err.message : 'An unexpected error occurred',
      isDev ? err.stack : undefined
    ),
    500
  );
};

/**
 * Centralized 404 Not Found Handler
 */
export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  return c.json(createErrorResponse('NOT_FOUND', `Route ${c.req.method} ${c.req.path} not found`), 404);
};
