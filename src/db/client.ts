import { Pool } from 'pg';

import * as schema from './schema';
import { drizzle } from 'drizzle-orm/node-postgres';

export function createPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
  });
}

export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}
