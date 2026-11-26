import type { Context } from 'hono';
import { createSuccessResponse, createErrorResponse } from '@restaurant-menu/shared';
import { desc, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { visitorAnalytics, customEvents } from '../db/schema/visitor_analytics';
import { trackVisitorHit, trackCustomEventHit, extractVisitorDetails, formatAudienceAnalysis, isSuperAdminRequest } from '../services/analytics';
import type { AppEnv } from '../types';

/**
 * Controller to fetch Analytics Summary (Country, Province/Region, Device, OS, ISP, Domain metrics & Audience Analyses)
 */
export async function getAnalyticsSummaryController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const db = getDb(c.env.DB);

  // 1. Total Visits
  const totalCountResult = await db.select({ count: sql<number>`count(*)` }).from(visitorAnalytics).get();
  const totalVisits = totalCountResult?.count || 0;

  // 2. Top Countries
  const topCountries = await db
    .select({
      country: visitorAnalytics.country,
      count: sql<number>`count(*)`,
    })
    .from(visitorAnalytics)
    .groupBy(visitorAnalytics.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 3. Top Provinces / Regions
  const topRegions = await db
    .select({
      region: visitorAnalytics.region,
      country: visitorAnalytics.country,
      count: sql<number>`count(*)`,
    })
    .from(visitorAnalytics)
    .groupBy(visitorAnalytics.region, visitorAnalytics.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 4. Device Breakdown (Desktop, Mobile, Tablet)
  const devices = await db
    .select({
      device: visitorAnalytics.device,
      count: sql<number>`count(*)`,
    })
    .from(visitorAnalytics)
    .groupBy(visitorAnalytics.device)
    .orderBy(desc(sql`count(*)`));

  // 5. Operating System (OS) Breakdown
  const osBreakdown = await db
    .select({
      os: visitorAnalytics.os,
      count: sql<number>`count(*)`,
    })
    .from(visitorAnalytics)
    .groupBy(visitorAnalytics.os)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 6. Network / ISP Connection Breakdown
  const ispBreakdown = await db
    .select({
      isp: visitorAnalytics.isp,
      count: sql<number>`count(*)`,
    })
    .from(visitorAnalytics)
    .groupBy(visitorAnalytics.isp)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 7. Top Visited Paths & Domains
  const topPaths = await db
    .select({
      path: visitorAnalytics.path,
      count: sql<number>`count(*)`,
    })
    .from(visitorAnalytics)
    .groupBy(visitorAnalytics.path)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // 8. Recent Visitor Logs
  const recentVisits = await db
    .select()
    .from(visitorAnalytics)
    .orderBy(desc(visitorAnalytics.createdAt))
    .limit(20);

  // 9. Recent Custom Interaction Events
  const recentEvents = await db
    .select()
    .from(customEvents)
    .orderBy(desc(customEvents.createdAt))
    .limit(20);

  // 10. Structured Audience Analysis for Recent Visits
  const audienceAnalyses = recentVisits.map((visit) =>
    formatAudienceAnalysis({
      device: visit.device || undefined,
      os: visit.os || undefined,
      brand: visit.brand || undefined,
      browser: visit.browser || undefined,
      ipAddress: visit.ipAddress || undefined,
      connectionType: visit.connectionType || undefined,
      isp: visit.isp || undefined,
      country: visit.country || undefined,
      region: visit.region || undefined,
      city: visit.city || undefined,
      latitude: visit.latitude || undefined,
      longitude: visit.longitude || undefined,
      userAgent: visit.userAgent || undefined,
      createdAt: visit.createdAt || undefined,
    })
  );

  return c.json(
    createSuccessResponse({
      totalVisits,
      topCountries,
      topRegions,
      devices,
      osBreakdown,
      ispBreakdown,
      topPaths,
      recentVisits,
      recentEvents,
      audienceAnalyses,
    }),
    200
  );
}

/**
 * Controller to extract and format audience analysis for the current client request
 */
export async function analyzeCurrentVisitorController(c: Context<AppEnv>) {
  const details = extractVisitorDetails(c);
  const audience = formatAudienceAnalysis(details);
  return c.json(createSuccessResponse(audience), 200);
}

/**
 * Controller for client frontend (Nuxt) to track pageviews
 */
export async function trackPageViewController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  // Skip pageview tracking if the request is from a super_admin user
  const isSuperAdmin = await isSuperAdminRequest(c);
  if (isSuperAdmin) {
    return c.json(createSuccessResponse({ message: 'Pageview tracking skipped for super_admin' }), 200);
  }

  const body = await c.req.json().catch(() => ({}));
  const path = body.path || '/';

  await trackVisitorHit(c.env.DB, c, path);

  return c.json(createSuccessResponse({ message: 'Pageview tracked successfully' }), 200);
}

/**
 * Controller for client frontend (Nuxt) to track custom events (button clicks, form submits, etc.)
 */
export async function trackCustomEventController(c: Context<AppEnv>) {
  if (!c.env.DB) {
    return c.json(createErrorResponse('DB_MISSING', 'Database binding missing'), 500);
  }

  const isSuperAdmin = await isSuperAdminRequest(c);
  if (isSuperAdmin) {
    return c.json(createSuccessResponse({ message: 'Event tracking skipped for super_admin' }), 200);
  }

  const body = await c.req.json().catch(() => ({}));
  if (!body.eventName) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'eventName is required'), 400);
  }

  await trackCustomEventHit(c.env.DB, c, body);

  return c.json(createSuccessResponse({ message: 'Custom event tracked successfully' }), 200);
}
