import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { corsMiddleware } from './middleware/cors';
import { requestIdMiddleware } from './middleware/request-id';
import { globalRateLimiter } from './middleware/rate-limit';
import { requireRole } from './middleware/super-admin-auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { healthRouter } from './routes/health';
import { streamRouter } from './routes/stream';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { superAdminsRouter } from './routes/super_admins';
import { settingsRouter } from './routes/settings';
import { auditLogsRouter } from './routes/audit_logs';
import { pushRouter } from './routes/push';
import { categoriesRouter } from './routes/categories';
import { menuRouter } from './routes/menu';
import { ordersRouter } from './routes/orders';
import type { AppEnv } from './types';

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request parameters',
              details: result.error.issues,
            },
            timestamp: new Date().toISOString(),
          },
          400
        );
      }
    },
  });

  // Attach Global Security Middleware
  app.use('*', requestIdMiddleware);
  app.use('*', corsMiddleware);
  app.use('*', globalRateLimiter);

  // Attach Centralized Error Handlers
  app.onError(errorHandler);
  app.notFound(notFoundHandler);

  // Protected Routes - Role Authorization Guards
  app.use('/api/users/*', requireRole('admin', 'super_admin'));
  app.use('/api/super-admins/*', requireRole('super_admin')); // Strictly Super Admin only
  app.use('/api/settings/*', requireRole('admin', 'super_admin'));
  app.use('/api/audit-logs/*', requireRole('admin', 'super_admin'));

  // Mount API Routers
  app.route('/api/health', healthRouter);
  app.route('/api/stream', streamRouter);
  app.route('/api/auth', authRouter);
  app.route('/api/users', usersRouter);
  app.route('/api/super-admins', superAdminsRouter);
  app.route('/api/settings', settingsRouter);
  app.route('/api/audit-logs', auditLogsRouter);
  app.route('/api/push', pushRouter);
  app.route('/api/categories', categoriesRouter);
  app.route('/api/menu', menuRouter);
  app.route('/api/orders', ordersRouter);

  // Root Endpoint
  app.get('/', (c) => {
    return c.text('Cloudflare Worker API Starter (Hono + D1 + OpenAPI)');
  });

  // OpenAPI JSON Spec Endpoint
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      title: 'Fullstack Monorepo API',
      version: '1.0.0',
      description: 'Production-ready OpenAPI documentation for Cloudflare Workers API',
    },
  });

  // Scalar Interactive API Documentation UI
  app.get(
    '/ui',
    apiReference({
      spec: {
        url: '/doc',
      },
      theme: 'purple',
    })
  );

  return app;
}

const app = createApp();
export default app;
