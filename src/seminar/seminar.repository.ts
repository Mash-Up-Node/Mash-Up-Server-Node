import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  eq,
  getTableColumns,
  gte,
  inArray,
  lt,
  sum,
} from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';

export type ActiveGeneration = {
  id: number;
  number: number;
};

export type SeminarSchedule = typeof schema.seminarSchedules.$inferSelect;
export type SeminarSection = typeof schema.seminarSections.$inferSelect;
export type SeminarItem = typeof schema.seminarItems.$inferSelect;
export type AttendanceCheckpoint =
  typeof schema.attendanceCheckpoints.$inferSelect;
export type SeminarAttendanceRecord =
  typeof schema.seminarAttendanceRecords.$inferSelect;
export type Platform = (typeof schema.platformEnum.enumValues)[number];
export type GenerationRole =
  (typeof schema.generationRoleEnum.enumValues)[number];

export type ActiveActivity = {
  memberId: number;
  platform: Platform;
  role: GenerationRole;
};

export type MemberProfile = typeof schema.memberProfiles.$inferSelect;
export type Member = typeof schema.members.$inferSelect;

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

  async findScheduleById(id: number): Promise<SeminarSchedule | null> {
    const [row] = await this.db
      .select()
      .from(schema.seminarSchedules)
      .where(eq(schema.seminarSchedules.id, id))
      .limit(1);

    return row ?? null;
  }

  findSectionsBySchedule(scheduleId: number): Promise<SeminarSection[]> {
    return this.db
      .select()
      .from(schema.seminarSections)
      .where(eq(schema.seminarSections.seminarScheduleId, scheduleId))
      .orderBy(asc(schema.seminarSections.sortOrder));
  }

  /**
   * 한 schedule에 속한 모든 program items를 sortOrder 순으로 조회.
   * items 테이블엔 scheduleId가 없어 sections를 거쳐 join.
   */
  findItemsBySchedule(scheduleId: number): Promise<SeminarItem[]> {
    return this.db
      .select(getTableColumns(schema.seminarItems))
      .from(schema.seminarItems)
      .innerJoin(
        schema.seminarSections,
        eq(schema.seminarItems.seminarSectionId, schema.seminarSections.id),
      )
      .where(eq(schema.seminarSections.seminarScheduleId, scheduleId))
      .orderBy(asc(schema.seminarItems.sortOrder));
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

  async findGenerationById(id: number): Promise<ActiveGeneration | null> {
    const [row] = await this.db
      .select({
        id: schema.generations.id,
        number: schema.generations.number,
      })
      .from(schema.generations)
      .where(eq(schema.generations.id, id))
      .limit(1);

    return row ?? null;
  }

  findMembersByIds(memberIds: number[]): Promise<Member[]> {
    if (memberIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(schema.members)
      .where(inArray(schema.members.id, memberIds));
  }

  findProfilesByMemberIds(memberIds: number[]): Promise<MemberProfile[]> {
    if (memberIds.length === 0) return Promise.resolve([]);
    return this.db
      .select()
      .from(schema.memberProfiles)
      .where(inArray(schema.memberProfiles.memberId, memberIds));
  }

  /**
   * 멤버별 출석 점수 합계 (전체 records 기준).
   * scoreDelta는 numeric이라 drizzle의 sum이 string을 반환하므로 Number 변환.
   */
  async findAttendanceScoresByMemberIds(
    memberIds: number[],
  ): Promise<Map<number, number>> {
    if (memberIds.length === 0) return new Map();
    const rows = await this.db
      .select({
        memberId: schema.seminarAttendanceRecords.memberId,
        score: sum(schema.seminarAttendanceRecords.scoreDelta).mapWith(Number),
      })
      .from(schema.seminarAttendanceRecords)
      .where(inArray(schema.seminarAttendanceRecords.memberId, memberIds))
      .groupBy(schema.seminarAttendanceRecords.memberId);

    return new Map(rows.map((r) => [r.memberId, r.score ?? 0]));
  }

  /**
   * 활동기수의 ACTIVE 멤버와 그 platform/role 정보를 조회.
   * 출석 현황 집계의 모집단(분모)으로 사용된다.
   */
  findActiveActivitiesByGeneration(
    generationId: number,
  ): Promise<ActiveActivity[]> {
    return this.db
      .select({
        memberId: schema.memberGenerationActivities.memberId,
        platform: schema.memberGenerationActivities.platform,
        role: schema.memberGenerationActivities.role,
      })
      .from(schema.memberGenerationActivities)
      .where(
        and(
          eq(schema.memberGenerationActivities.generationId, generationId),
          eq(schema.memberGenerationActivities.status, 'ACTIVE'),
        ),
      );
  }

  /**
   * schedule에 속한 모든 출석 records를 조회.
   * records 테이블에 scheduleId가 없어 attendance_checkpoints를 거쳐 join.
   */
  findRecordsBySchedule(
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
      .where(eq(schema.attendanceCheckpoints.seminarScheduleId, scheduleId));
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
