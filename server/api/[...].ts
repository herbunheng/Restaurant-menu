import { defineEventHandler, toWebRequest } from 'h3';
import app from '../backend/app';

/**
 * Nitro catch-all route handler that forwards API calls to Hono backend.
 * Provides complete support for auth, admin, settings, and analytics.
 */
export default defineEventHandler(async (event) => {
  const req = (event as any).web?.request || toWebRequest(event);
  const env = (event.context as any).cloudflare?.env || process.env;
  return app.fetch(req, env);
});
