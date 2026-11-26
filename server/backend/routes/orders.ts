import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listOrdersController,
  createOrderController,
  updateOrderController,
  getActiveOrdersController,
  getDailyReportController,
} from '../controllers/orders.controller';
import type { AppEnv } from '../types';

export const ordersRouter = new OpenAPIHono<AppEnv>();

// GET /api/orders/daily-report
ordersRouter.get('/daily-report', getDailyReportController);

// GET /api/orders/active - List all currently occupied / open tables
ordersRouter.get('/active', getActiveOrdersController);

// GET /api/orders
ordersRouter.get('/', listOrdersController);

// POST /api/orders
ordersRouter.post('/', createOrderController);

// PUT /api/orders/:id - Append items, update note, or checkout
ordersRouter.put('/:id', updateOrderController);
