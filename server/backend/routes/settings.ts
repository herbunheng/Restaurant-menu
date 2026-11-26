import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { SiteSettingsSchema, UpdateSiteSettingsSchema, ApiResponseSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import { sensitiveRateLimiter } from '../middleware/rate-limit';
import {
  getSettingsController,
  updateSettingsController,
  testTelegramController,
  testEmailController,
} from '../controllers/settings.controller';
import type { AppEnv } from '../types';

export const settingsRouter = new OpenAPIHono<AppEnv>();

settingsRouter.use('*', sensitiveRateLimiter);

// GET /api/settings
const getSettingsRoute = createRoute({
  method: 'get',
  path: '/',
  summary: 'Get site configuration & integration settings',
  description: 'Retrieves current site configuration including Telegram, Resend Mail, and Notification tokens.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(SiteSettingsSchema),
        },
      },
      description: 'Site settings details',
    },
  },
});

// PUT /api/settings
const updateSettingsRoute = createRoute({
  method: 'put',
  path: '/',
  summary: 'Update site configuration & integration settings (Super Admin)',
  description: 'Update settings such as telegramToken, telegramGroupId, resendApiKey, mailFrom, notificationToken, siteName, etc.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateSiteSettingsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(SiteSettingsSchema),
        },
      },
      description: 'Updated site settings payload',
    },
  },
});

// POST /api/settings/test-telegram
const testTelegramSchema = z.object({
  message: z.string().default('🔔 Test notification from Super Admin Settings'),
});

const testTelegramRoute = createRoute({
  method: 'post',
  path: '/test-telegram',
  summary: 'Test sending a Telegram notification',
  request: {
    body: {
      content: {
        'application/json': {
          schema: testTelegramSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Test notification sent result',
    },
  },
});

// POST /api/settings/test-email
const testEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().default('Test Email from Super Admin Settings'),
  message: z.string().default('<p>This is a test email sent from Resend integration!</p>'),
});

const testEmailRoute = createRoute({
  method: 'post',
  path: '/test-email',
  summary: 'Test sending a Resend email',
  request: {
    body: {
      content: {
        'application/json': {
          schema: testEmailSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Test email sent result',
    },
  },
});

// Attach Controllers
settingsRouter.openapi(getSettingsRoute, getSettingsController as any);
settingsRouter.openapi(updateSettingsRoute, updateSettingsController as any);
settingsRouter.openapi(testTelegramRoute, testTelegramController as any);
settingsRouter.openapi(testEmailRoute, testEmailController as any);
