import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listStaffController,
  createStaffController,
  updateStaffController,
  deleteStaffController,
} from '../controllers/staff.controller';
import type { AppEnv } from '../types';

export const staffRouter = new OpenAPIHono<AppEnv>();

// GET /api/staff
staffRouter.get('/', listStaffController);

// POST /api/staff
staffRouter.post('/', createStaffController);

// PUT /api/staff/:id
staffRouter.put('/:id', updateStaffController);

// DELETE /api/staff/:id
staffRouter.delete('/:id', deleteStaffController);
