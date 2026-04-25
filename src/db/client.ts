import { Pool } from 'pg';

import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';

export function createPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
  });
}

export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}
