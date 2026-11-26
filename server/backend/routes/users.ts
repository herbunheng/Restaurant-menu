import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { UserSchema, CreateUserSchema, ApiResponseSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import { listUsersController, createUserController } from '../controllers/users.controller';
import type { AppEnv } from '../types';

export const usersRouter = new OpenAPIHono<AppEnv>();

// GET /api/users
const listUsersRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'List users',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(z.array(UserSchema)),
        },
      },
      description: 'Array of users',
    },
  },
});

// POST /api/users
const createUserRoute = createRoute({
  method: 'post',
  path: '/',
  summary: 'Create user',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(UserSchema),
        },
      },
      description: 'Created user',
    },
  },
});

// Attach Controllers
usersRouter.openapi(listUsersRoute, listUsersController as any);
usersRouter.openapi(createUserRoute, createUserController as any);
