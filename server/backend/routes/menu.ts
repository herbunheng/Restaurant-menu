import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listMenuItemsController,
  createMenuItemController,
  updateMenuItemController,
  deleteMenuItemController,
} from '../controllers/menu.controller';
import type { AppEnv } from '../types';

export const menuRouter = new OpenAPIHono<AppEnv>();

// GET /api/menu
menuRouter.get('/', listMenuItemsController);

// POST /api/menu
menuRouter.post('/', createMenuItemController);

// PUT /api/menu/:id
menuRouter.put('/:id', updateMenuItemController);

// DELETE /api/menu/:id
menuRouter.delete('/:id', deleteMenuItemController);
