import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

/** Neon over HTTP: one round-trip per query, no pool to manage in API routes or tasks. */
export const db = drizzle(neon(databaseUrl), { schema });
