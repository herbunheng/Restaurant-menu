import type { MiddlewareHandler } from 'hono';
import { getClientIp } from '../services/audit';
import type { AppEnv } from '../types';

interface RateLimitConfig {
  windowMs: number;
  limit: number;
  message: string;
  code?: string;
  useKvIfAvailable?: boolean;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * Best-effort per-isolate Rate Limiter Store
 * Note: Memory state is maintained per V8 isolate and does not sync across multiple distributed Cloudflare Worker isolates.
 * (Does NOT use global setInterval timers, 100% compliant with workerd runtime)
 */
class CloudflareRateLimiterStore {
  private hits = new Map<string, RequestRecord>();

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const record = this.hits.get(key);

    // Expired or new record
    if (!record || now > record.resetTime) {
      const newRecord = { count: 1, resetTime: now + windowMs };
      this.hits.set(key, newRecord);
      this.lazyCleanup(now);
      return newRecord;
    }

    record.count += 1;
    return record;
  }

  /**
   * Lazy cleanup of expired entries without using global setInterval timers
   */
  private lazyCleanup(now: number) {
    if (this.hits.size > 1000) {
      for (const [k, v] of this.hits.entries()) {
        if (now > v.resetTime) {
          this.hits.delete(k);
        }
      }
    }
  }
}

const store = new CloudflareRateLimiterStore();

/**
 * Increments rate limit state in Cloudflare KV if bound, otherwise falls back to memory store.
 */
async function getRateLimitRecord(
  c: Parameters<MiddlewareHandler<AppEnv>>[0],
  key: string,
  windowMs: number
): Promise<{ count: number; resetTime: number }> {
  const kv = c.env?.RATE_LIMIT_KV;
  if (!kv) {
    return store.increment(key, windowMs);
  }

  const now = Date.now();
  try {
    const record = await kv.get<RequestRecord>(key, 'json');
    if (!record || now > record.resetTime) {
      const newRecord: RequestRecord = { count: 1, resetTime: now + windowMs };
      const ttlSeconds = Math.ceil(windowMs / 1000);
      await kv.put(key, JSON.stringify(newRecord), { expirationTtl: Math.max(60, ttlSeconds) });
      return newRecord;
    }

    const updatedRecord: RequestRecord = { count: record.count + 1, resetTime: record.resetTime };
    const ttlRemaining = Math.max(60, Math.ceil((record.resetTime - now) / 1000));
    await kv.put(key, JSON.stringify(updatedRecord), { expirationTtl: ttlRemaining });
    return updatedRecord;
  } catch (err) {
    // Fall back to memory store if KV call fails
    return store.increment(key, windowMs);
  }
}

/**
 * Creates Cloudflare-friendly rate limiting middleware (supports KV-backed distributed limits)
 */
export function createCloudflareRateLimiter(config: RateLimitConfig): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = getClientIp(c);
    const key = `rl:${config.code || 'default'}:${ip}`;

    const { count, resetTime } = config.useKvIfAvailable
      ? await getRateLimitRecord(c, key, config.windowMs)
      : store.increment(key, config.windowMs);

    const remaining = Math.max(0, config.limit - count);
    const resetSeconds = Math.ceil((resetTime - Date.now()) / 1000);

    c.header('X-RateLimit-Limit', String(config.limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    if (count > config.limit) {
      c.header('Retry-After', String(resetSeconds));
      return c.json(
        {
          success: false,
          error: {
            code: config.code || 'TOO_MANY_REQUESTS',
            message: config.message,
          },
          timestamp: new Date().toISOString(),
        },
        429
      );
    }

    await next();
  };
}

/**
 * Standard Security Rate Limiter (100 requests / minute per IP - best-effort per isolate)
 */
export const globalRateLimiter = createCloudflareRateLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  code: 'GLOBAL_RATE_LIMIT_EXCEEDED',
  message: 'Too many requests from this IP. Please try again after 1 minute.',
  useKvIfAvailable: false,
});

/**
 * Strict Security Rate Limiter for sensitive endpoints (10 requests / minute per IP - KV distributed store when available)
 */
export const sensitiveRateLimiter = createCloudflareRateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  code: 'SENSITIVE_RATE_LIMIT_EXCEEDED',
  message: 'Rate limit exceeded for sensitive action. Please wait 1 minute before retrying.',
  useKvIfAvailable: true,
});
