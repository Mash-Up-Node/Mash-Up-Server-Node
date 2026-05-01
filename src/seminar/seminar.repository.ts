import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, getTableColumns, gte, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';

export type ActiveGeneration = {
  id: number;
  number: number;
};

export type SeminarSchedule = typeof schema.seminarSchedules.$inferSelect;
export type AttendanceCheckpoint =
  typeof schema.attendanceCheckpoints.$inferSelect;
export type SeminarAttendanceRecord =
  typeof schema.seminarAttendanceRecords.$inferSelect;

@Injectable()
export class SeminarRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findMemberName(memberId: number): Promise<string | null> {
    const [row] = await this.db
      .select({ name: schema.members.name })
      .from(schema.members)
      .where(eq(schema.members.id, memberId))
      .limit(1);

    return row?.name ?? null;
  }

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

  /**
   * 이번 주(KST 기준 UTC range) 안에 시작하는 첫 번째 세미나를 조회 (시간 오름차순).
   * 운영 정책상 한 주에 정기 세미나는 1건이므로 단건 반환. 없으면 null.
   * startedAt이 null인 schedule은 제외.
   */
  async findThisWeekSchedule(
    generationId: number,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<SeminarSchedule | null> {
    const [row] = await this.db
      .select()
      .from(schema.seminarSchedules)
      .where(
        and(
          eq(schema.seminarSchedules.generationId, generationId),
          gte(schema.seminarSchedules.startedAt, weekStart),
          lt(schema.seminarSchedules.startedAt, weekEnd),
        ),
      )
      .orderBy(asc(schema.seminarSchedules.startedAt))
      .limit(1);

    return row ?? null;
  }

  /**
   * 현재 시각 이후 가장 가까운 세미나의 시작 시각을 조회 (이번 주 포함).
   * D-day 계산용.
   */
  async findNextScheduleStartedAt(
    generationId: number,
    now: Date,
  ): Promise<Date | null> {
    const [row] = await this.db
      .select({ startedAt: schema.seminarSchedules.startedAt })
      .from(schema.seminarSchedules)
      .where(
        and(
          eq(schema.seminarSchedules.generationId, generationId),
          gte(schema.seminarSchedules.startedAt, now),
        ),
      )
      .orderBy(asc(schema.seminarSchedules.startedAt))
      .limit(1);

    return row?.startedAt ?? null;
  }

  findCheckpointsBySchedule(
    scheduleId: number,
  ): Promise<AttendanceCheckpoint[]> {
    return this.db
      .select()
      .from(schema.attendanceCheckpoints)
      .where(eq(schema.attendanceCheckpoints.seminarScheduleId, scheduleId))
      .orderBy(asc(schema.attendanceCheckpoints.roundNo));
  }

  findRecordsByMemberAndSchedule(
    memberId: number,
    scheduleId: number,
  ): Promise<SeminarAttendanceRecord[]> {
    return this.db
      .select(getTableColumns(schema.seminarAttendanceRecords))
      .from(schema.seminarAttendanceRecords)
      .innerJoin(
        schema.attendanceCheckpoints,
        eq(
          schema.seminarAttendanceRecords.attendanceCheckpointId,
          schema.attendanceCheckpoints.id,
        ),
      )
      .where(
        and(
          eq(schema.seminarAttendanceRecords.memberId, memberId),
          eq(schema.attendanceCheckpoints.seminarScheduleId, scheduleId),
        ),
      );
  }
}
