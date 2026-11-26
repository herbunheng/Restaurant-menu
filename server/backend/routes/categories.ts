import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listCategoriesController,
  createCategoryController,
  deleteCategoryController,
} from '../controllers/categories.controller';
import type { AppEnv } from '../types';

export const categoriesRouter = new OpenAPIHono<AppEnv>();

// GET /api/categories
categoriesRouter.get('/', listCategoriesController);

// POST /api/categories
categoriesRouter.post('/', createCategoryController);

// DELETE /api/categories/:id
categoriesRouter.delete('/:id', deleteCategoryController);
