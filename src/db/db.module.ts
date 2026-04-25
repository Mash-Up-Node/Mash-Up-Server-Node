import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import * as schema from './schema';
import { createDb, createPool } from './client';
import { DRIZZLE_DB, DB_POOL } from './db.constants';

@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: (): Pool => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is required to initialize database client.',
          );
        }
        return createPool(databaseUrl);
      },
    },
    {
      provide: DRIZZLE_DB,
      useFactory: (pool: Pool): NodePgDatabase<typeof schema> => createDb(pool),
      inject: [DB_POOL],
    },
  ],
  exports: [DB_POOL, DRIZZLE_DB],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
