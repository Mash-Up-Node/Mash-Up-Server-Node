import 'dotenv/config';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { db, pool } from './client';

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
