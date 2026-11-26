import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { ApiResponseSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import {
  subscribePushController,
  getPushSubscribersCountController,
  broadcastPushController,
} from '../controllers/push.controller';
import { requireRole } from '../middleware/super-admin-auth';
import type { AppEnv } from '../types';

export const pushRouter = new OpenAPIHono<AppEnv>();

// POST /api/push/subscribe - Register client browser Web Push subscription
const subscribeRoute = createRoute({
  method: 'post',
  path: '/subscribe',
  summary: 'Register Client Web Push Subscription',
  description: 'Saves browser web push subscription endpoint and keys for push notifications.',
  responses: {
    200: {
      description: 'Subscription registered successfully',
    },
  },
});

// GET /api/push/subscribers-count - Fetch total push subscribers
const subscribersCountRoute = createRoute({
  method: 'get',
  path: '/subscribers-count',
  summary: 'Get Total Web Push Subscribers Count',
  responses: {
    200: {
      description: 'Total subscribers count response',
    },
  },
});

// POST /api/push/broadcast - Broadcast Push Notification to viewers (Admin only)
const broadcastRoute = createRoute({
  method: 'post',
  path: '/broadcast',
  summary: 'Broadcast Push Notification to All Viewers',
  description: 'Sends a Web Push notification alert to all subscribed devices / home screen PWA users.',
  responses: {
    200: {
      description: 'Push notification broadcast response',
    },
  },
});

pushRouter.openapi(subscribeRoute, subscribePushController as any);
pushRouter.openapi(subscribersCountRoute, getPushSubscribersCountController as any);

// Protect broadcast endpoint so only admins can broadcast push notifications
pushRouter.use('/broadcast', requireRole('admin', 'super_admin'));
pushRouter.openapi(broadcastRoute, broadcastPushController as any);
