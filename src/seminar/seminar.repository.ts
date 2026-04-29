import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';

@Injectable()
export class SeminarRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // 쿼리 메서드는 후속 커밋에서 추가
  // - findActiveActivity(memberId)
  // - findSchedulesByGeneration(generationId)
  // - findThisWeekSchedules / findNextSchedule
  // - findCheckpointsBySchedule / findRecordsByMemberAndCheckpoints
  // - findScheduleWithRelations(seminarId)
}
