import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../schema';
import { DRIZZLE_DB } from '../db/db.constants';

export type DanggnsRound = typeof schema.carrotRounds.$inferSelect;

export type DanggnsShakeEventInsert = {
  roundId: number;
  memberId: number;
  scoreDelta: number;
};

@Injectable()
export class DanggnsRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findRoundById(roundId: number): Promise<DanggnsRound | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.carrotRounds)
      .where(eq(schema.carrotRounds.id, roundId))
      .limit(1);
    return row;
  }

  async insertShakeEvent(input: DanggnsShakeEventInsert): Promise<void> {
    await this.db.insert(schema.carrotShakeEvents).values({
      roundId: input.roundId,
      memberId: input.memberId,
      scoreDelta: input.scoreDelta,
    });
  }

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
