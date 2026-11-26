import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { AuditLogSchema, ApiResponseSchema, PaginationSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import { listAuditLogsController } from '../controllers/audit_logs.controller';
import type { AppEnv } from '../types';

export const auditLogsRouter = new OpenAPIHono<AppEnv>();

// GET /api/audit-logs
const listAuditLogsQuery = PaginationSchema.extend({
  action: z.string().optional(),
  entity: z.string().optional(),
  ipAddress: z.string().optional(),
});

const listAuditLogsRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List audit logs with IP address and user actions',
  request: {
    query: listAuditLogsQuery,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.array(AuditLogSchema)),
        },
      },
      description: 'Audit logs query result',
    },
  },
});

// Attach Controller
auditLogsRouter.openapi(listAuditLogsRoute, listAuditLogsController as any);
