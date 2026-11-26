import type { EnvConfig } from "../config/env";

/**
 * Cloudflare Worker Environment Bindings Interface
 */
export interface CloudflareBindings extends Partial<EnvConfig> {
  // Optional Cloudflare Storage Bindings
  DB: D1Database;
  KV?: KVNamespace;
  BUCKET?: R2Bucket;
}

/**
 * Hono Application Context Environment Type
 */
export interface AppEnv {
  Bindings: CloudflareBindings;
  Variables: {
    requestId: string;
    userId?: string;
  };
}
