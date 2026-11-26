import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listOrdersController,
  createOrderController,
  getDailyReportController,
} from '../controllers/orders.controller';
import type { AppEnv } from '../types';

export const ordersRouter = new OpenAPIHono<AppEnv>();

// GET /api/orders/daily-report
ordersRouter.get('/daily-report', getDailyReportController);

// GET /api/orders
ordersRouter.get('/', listOrdersController);

// POST /api/orders
ordersRouter.post('/', createOrderController);
