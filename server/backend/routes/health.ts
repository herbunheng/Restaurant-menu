import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { createSuccessResponse, HealthStatusSchema, ApiResponseSchema } from '@restaurant-menu/shared';
import type { AppEnv } from '../types';

export const healthRouter = new OpenAPIHono<AppEnv>();

const startTime = Date.now();

const getHealthRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Check API health status',
  description: 'Returns uptime, service status, and timestamp.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(HealthStatusSchema),
        },
      },
      description: 'System health status payload',
    },
  },
});

healthRouter.openapi(getHealthRoute, (c) => {
  const health = {
    status: 'ok' as const,
    service: 'backend',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  };

  return c.json(createSuccessResponse(health), 200);
});
