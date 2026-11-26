import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { SuperAdminSchema, ApiResponseSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import { listSuperAdminsController, createSuperAdminController } from '../controllers/super_admins.controller';
import type { AppEnv } from '../types';

export const superAdminsRouter = new OpenAPIHono<AppEnv>();

// GET /api/super-admins
const listSuperAdminsRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List Super Admins',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.array(SuperAdminSchema)),
        },
      },
      description: 'List of super admins',
    },
  },
});

// POST /api/super-admins
const createSuperAdminSchema = z.object({
  userId: z.string(),
  canManageSettings: z.boolean().default(true),
  canManageAdmins: z.boolean().default(true),
});

const createSuperAdminRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Grant Super Admin role to user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSuperAdminSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(SuperAdminSchema),
        },
      },
      description: 'Super Admin assigned',
    },
  },
});

// Attach Controllers
superAdminsRouter.openapi(listSuperAdminsRoute, listSuperAdminsController as any);
superAdminsRouter.openapi(createSuperAdminRoute, createSuperAdminController as any);
