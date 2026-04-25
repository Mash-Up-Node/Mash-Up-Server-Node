import 'dotenv/config';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDb, createPool } from './client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const pool = createPool(databaseUrl);
const db = createDb(pool);

async function run(): Promise<void> {
  await migrate(db, {
    migrationsFolder: './drizzle',
  });

  await pool.end();
}

run().catch(async (error) => {
  await pool.end();
  throw error;
});
