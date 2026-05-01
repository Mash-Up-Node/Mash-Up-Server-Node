import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
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

  findRoundById(roundId: number): Promise<DanggnsRound | undefined> {
    return this.db.query.carrotRounds.findFirst({
      where: eq(schema.carrotRounds.id, roundId),
    });
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

  findMembersByIds(memberIds: number[]) {
    if (memberIds.length === 0) return Promise.resolve([]);
    return this.db
      .select({ id: schema.members.id, name: schema.members.name })
      .from(schema.members)
      .where(inArray(schema.members.id, memberIds));
  }

  findRoundRankings(
    roundId: number,
  ): Promise<{ memberId: number; finalRank: number; finalScore: number }[]> {
    return this.db
      .select({
        memberId: schema.carrotRoundRankings.memberId,
        finalRank: schema.carrotRoundRankings.finalRank,
        finalScore: schema.carrotRoundRankings.finalScore,
      })
      .from(schema.carrotRoundRankings)
      .where(eq(schema.carrotRoundRankings.roundId, roundId))
      .orderBy(schema.carrotRoundRankings.finalRank);
  }

  aggregatePlatformScoresBySnapshot(
    roundId: number,
    generationId: number,
  ): Promise<{ platform: string; totalScore: number }[]> {
    return this.db
      .select({
        platform: schema.memberGenerationActivities.platform,
        totalScore: sql<number>`cast(sum(${schema.carrotRoundRankings.finalScore}) as integer)`,
      })
      .from(schema.carrotRoundRankings)
      .innerJoin(
        schema.memberGenerationActivities,
        and(
          eq(
            schema.carrotRoundRankings.memberId,
            schema.memberGenerationActivities.memberId,
          ),
          eq(schema.memberGenerationActivities.generationId, generationId),
        ),
      )
      .where(eq(schema.carrotRoundRankings.roundId, roundId))
      .groupBy(schema.memberGenerationActivities.platform)
      .orderBy(sql`sum(${schema.carrotRoundRankings.finalScore}) desc`);
  }

  aggregateShakeScoresByMember(
    roundId: number,
  ): Promise<{ memberId: number; totalScore: number }[]> {
    return this.db
      .select({
        memberId: schema.carrotShakeEvents.memberId,
        totalScore: sql<number>`cast(sum(${schema.carrotShakeEvents.scoreDelta}) as integer)`,
      })
      .from(schema.carrotShakeEvents)
      .where(eq(schema.carrotShakeEvents.roundId, roundId))
      .groupBy(schema.carrotShakeEvents.memberId);
  }

  aggregateShakeScoresByPlatform(
    roundId: number,
    generationId: number,
  ): Promise<{ platform: string; totalScore: number }[]> {
    return this.db
      .select({
        platform: schema.memberGenerationActivities.platform,
        totalScore: sql<number>`cast(sum(${schema.carrotShakeEvents.scoreDelta}) as integer)`,
      })
      .from(schema.carrotShakeEvents)
      .innerJoin(
        schema.memberGenerationActivities,
        and(
          eq(
            schema.carrotShakeEvents.memberId,
            schema.memberGenerationActivities.memberId,
          ),
          eq(schema.memberGenerationActivities.generationId, generationId),
        ),
      )
      .where(eq(schema.carrotShakeEvents.roundId, roundId))
      .groupBy(schema.memberGenerationActivities.platform);
  }
}
