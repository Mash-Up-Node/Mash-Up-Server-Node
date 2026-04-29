import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';

export type ActiveGeneration = {
  id: number;
  number: number;
};

export type SeminarSchedule = typeof schema.seminarSchedules.$inferSelect;

@Injectable()
export class SeminarRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findActiveGeneration(
    memberId: number,
  ): Promise<ActiveGeneration | null> {
    const [row] = await this.db
      .select({
        id: schema.generations.id,
        number: schema.generations.number,
      })
      .from(schema.memberGenerationActivities)
      .innerJoin(
        schema.generations,
        eq(
          schema.memberGenerationActivities.generationId,
          schema.generations.id,
        ),
      )
      .where(
        and(
          eq(schema.memberGenerationActivities.memberId, memberId),
          eq(schema.memberGenerationActivities.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  findSchedulesByGeneration(generationId: number): Promise<SeminarSchedule[]> {
    return this.db
      .select()
      .from(schema.seminarSchedules)
      .where(eq(schema.seminarSchedules.generationId, generationId))
      .orderBy(asc(schema.seminarSchedules.startedAt)); // PostgreSQL ASC: NULLS LAST
  }
}
