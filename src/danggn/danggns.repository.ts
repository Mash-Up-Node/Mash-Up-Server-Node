import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';

@Injectable()
export class DanggnsRepository {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  findActiveGenerationByMemberId(memberId: number) {
    return this.db.query.memberGenerationActivities.findFirst({
      where: and(
        eq(schema.memberGenerationActivities.memberId, memberId),
        eq(schema.memberGenerationActivities.status, 'ACTIVE'),
      ),
    });
  }

  findRecentRoundsByGenerationId(generationId: number, limit: number) {
    return this.db.query.carrotRounds.findMany({
      where: eq(schema.carrotRounds.generationId, generationId),
      orderBy: (rounds, { desc }) => [desc(rounds.roundNo)],
      limit,
    });
  }
}
