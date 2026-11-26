import { OpenAPIHono } from '@hono/zod-openapi';
import {
  listPaymentMethodsController,
  getActivePaymentMethodsController,
  createPaymentMethodController,
  updatePaymentMethodController,
  deletePaymentMethodController,
} from '../controllers/payment_methods.controller';
import type { AppEnv } from '../types';

export const paymentMethodsRouter = new OpenAPIHono<AppEnv>();

// GET /api/payment-methods
paymentMethodsRouter.get('/', listPaymentMethodsController);

// GET /api/payment-methods/active (for POS checkout and customer view)
paymentMethodsRouter.get('/active', getActivePaymentMethodsController);

// POST /api/payment-methods
paymentMethodsRouter.post('/', createPaymentMethodController);

// PUT /api/payment-methods/:id
paymentMethodsRouter.put('/:id', updatePaymentMethodController);

// DELETE /api/payment-methods/:id
paymentMethodsRouter.delete('/:id', deletePaymentMethodController);
