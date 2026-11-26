import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Initializes and returns a type-safe Drizzle ORM client for Cloudflare D1
 */
export function getDb(d1?: D1Database) {
  if (!d1) {
    throw new Error('Cloudflare D1 Database binding is missing');
  }
  return drizzle(d1, { schema });
}
