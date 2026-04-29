import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';

@Injectable()
export class DanggnsRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  findRoundById(roundId: number) {
    return this.db.query.carrotRounds.findFirst({
      where: eq(schema.carrotRounds.id, roundId),
    });
  }

  insertShakeEvent(payload: {
    roundId: number;
    memberId: number;
    scoreDelta: number;
  }) {
    return this.db.insert(schema.carrotShakeEvents).values(payload);
  }
}
