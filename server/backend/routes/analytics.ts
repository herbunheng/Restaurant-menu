import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { ApiResponseSchema, AudienceAnalysisSchema, TrackCustomEventSchema } from '@restaurant-menu/shared';
import { z } from 'zod';
import {
  getAnalyticsSummaryController,
  trackPageViewController,
  analyzeCurrentVisitorController,
  trackCustomEventController,
} from '../controllers/analytics.controller';
import type { AppEnv } from '../types';

export const analyticsRouter = new OpenAPIHono<AppEnv>();

const AnalyticsSummaryDataSchema = z.object({
  totalVisits: z.number().openapi({ example: 1250 }),
  topCountries: z.array(
    z.object({
      country: z.string().nullable().openapi({ example: 'Cambodia' }),
      count: z.number().openapi({ example: 450 }),
    })
  ),
  topRegions: z.array(
    z.object({
      region: z.string().nullable().openapi({ example: 'Phnom Penh' }),
      country: z.string().nullable().openapi({ example: 'Cambodia' }),
      count: z.number().openapi({ example: 300 }),
    })
  ),
  devices: z.array(
    z.object({
      device: z.string().nullable().openapi({ example: 'desktop' }),
      count: z.number().openapi({ example: 800 }),
    })
  ),
  osBreakdown: z.array(
    z.object({
      os: z.string().nullable().openapi({ example: 'Windows' }),
      count: z.number().openapi({ example: 600 }),
    })
  ),
  ispBreakdown: z.array(
    z.object({
      isp: z.string().nullable().openapi({ example: 'EZECOM' }),
      count: z.number().openapi({ example: 400 }),
    })
  ),
  topPaths: z.array(
    z.object({
      path: z.string().nullable().openapi({ example: '/' }),
      count: z.number().openapi({ example: 950 }),
    })
  ),
  recentVisits: z.array(z.record(z.unknown())),
  audienceAnalyses: z.array(AudienceAnalysisSchema).optional(),
});

// GET /api/analytics/summary - Get full visitor analytics summary
const getAnalyticsSummaryRoute = createRoute({
  method: 'get',
  path: '/summary',
  summary: 'Get Visitor Analytics Summary (Country, Province, Device, OS, ISP)',
  description: 'Returns metrics breakdown by country, province/region, device (mobile/desktop), OS, ISP connection, and top paths.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(AnalyticsSummaryDataSchema),
        },
      },
      description: 'Analytics summary payload',
    },
  },
});

// GET /api/analytics/audience - Get current visitor audience analysis
const getAudienceAnalysisRoute = createRoute({
  method: 'get',
  path: '/audience',
  summary: 'Analyze Current Request Visitor Audience Details',
  description: 'Returns formatted audience analysis including Device, OS, Brand, Browser, IP, Connection, ISP, Location, Coordinates, and Timestamp.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ApiResponseSchema(AudienceAnalysisSchema),
        },
      },
      description: 'Audience analysis payload',
    },
  },
});

// POST /api/analytics/track - Track client pageview from Nuxt frontend
const trackPageViewSchema = z.object({
  path: z.string().default('/'),
});

const trackPageViewRoute = createRoute({
  method: 'post',
  path: '/track',
  summary: 'Track pageview metric',
  request: {
    body: {
      content: {
        'application/json': {
          schema: trackPageViewSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Pageview tracked response',
    },
  },
});

// POST /api/analytics/event - Track custom interaction event (button clicks, downloads, etc.)
const trackCustomEventRoute = createRoute({
  method: 'post',
  path: '/event',
  summary: 'Track custom interaction event',
  description: 'Tracks user actions such as button clicks, conversions, or custom engagement events.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: TrackCustomEventSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Custom event tracked response',
    },
  },
});

// Attach Controllers
analyticsRouter.openapi(getAnalyticsSummaryRoute, getAnalyticsSummaryController as any);
analyticsRouter.openapi(getAudienceAnalysisRoute, analyzeCurrentVisitorController as any);
analyticsRouter.openapi(trackPageViewRoute, trackPageViewController as any);
analyticsRouter.openapi(trackCustomEventRoute, trackCustomEventController as any);
