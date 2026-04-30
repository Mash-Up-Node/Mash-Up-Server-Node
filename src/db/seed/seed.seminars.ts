import {
  attendanceCheckpoints,
  seminarItems,
  seminarSchedules,
  seminarSections,
} from '../../schema';
import type { SeedTx } from './tx';
import { addDays, addHours, thisSaturdayKst } from './util';

export type SeededSeminars = {
  pastSeminarId: number;
  thisWeekSeminarId: number;
  futureSeminarIds: number[];
  /** past 세미나의 attendance checkpoint id 목록 (순서대로 1부/2부/최종) */
  pastCheckpointIds: number[];
  /** thisWeek 세미나의 attendance checkpoint id 목록 */
  thisWeekCheckpointIds: number[];
};

/**
 * 시드 세미나 구성:
 * - 1차 정기 세미나 (OT): 2주 전, attendance records 가짐
 * - 2차 정기 세미나: 이번 주 토요일, BEFORE 상태 (records 없음)
 * - 3차 정기 세미나: 2주 후
 * - 4차 정기 세미나: 4주 후
 */
export async function seedSeminars(
  tx: SeedTx,
  ctx: { generationId: number },
): Promise<SeededSeminars> {
  const thisWeekSat = thisSaturdayKst();
  const past = addDays(thisWeekSat, -14);
  const future1 = addDays(thisWeekSat, 14);
  const future2 = addDays(thisWeekSat, 28);

  const [pastSeminar, thisWeekSeminar, futureSeminar1, futureSeminar2] =
    await tx
      .insert(seminarSchedules)
      .values([
        {
          generationId: ctx.generationId,
          title: '1차 정기 세미나 - (OT)',
          description: 'OT 및 자기소개',
          startedAt: past,
          endedAt: addHours(past, 16),
          venueName: '종각 문화마을',
          venueAddress: '서울 특별시 종로구 00동 131-6번지',
          venueLat: '37.570100',
          venueLng: '126.983000',
          notice:
            '여러분 이번 디자인 세미나는 오프라인으로 진행합니다!\n3분 발표 준비해주세요!',
        },
        {
          generationId: ctx.generationId,
          title: '2차 정기 세미나',
          description: '플랫폼별 발표',
          startedAt: thisWeekSat,
          endedAt: addHours(thisWeekSat, 16),
          venueName: '종각 문화마을',
          venueAddress: '서울 특별시 종로구 00동 131-6번지',
          venueLat: '37.570100',
          venueLng: '126.983000',
          notice: '준비물: 노트북',
        },
        {
          generationId: ctx.generationId,
          title: '3차 정기 세미나',
          description: null,
          startedAt: future1,
          endedAt: addHours(future1, 16),
          venueName: '디스코드',
          notice: null,
        },
        {
          generationId: ctx.generationId,
          title: '해커톤',
          description: '1박 2일 해커톤',
          startedAt: future2,
          endedAt: addDays(future2, 1),
          venueName: null,
          venueAddress: null,
          notice: null,
        },
      ])
      .returning();

  // sections + items: past 세미나에만 (상세 화면 검증용)
  const [pastSection1, pastSection2] = await tx
    .insert(seminarSections)
    .values([
      {
        seminarScheduleId: pastSeminar.id,
        title: '1부',
        startedAt: past,
        endedAt: addHours(past, 1),
        sortOrder: 1,
      },
      {
        seminarScheduleId: pastSeminar.id,
        title: '2부',
        startedAt: addHours(past, 1),
        endedAt: addHours(past, 4),
        sortOrder: 2,
      },
    ])
    .returning();

  await tx.insert(seminarItems).values([
    {
      seminarSectionId: pastSection1.id,
      title: '안드로이드 팀 세미나',
      description: 'Android Crew',
      startedAt: past,
      sortOrder: 1,
    },
    {
      seminarSectionId: pastSection1.id,
      title: '안드로이드 팀 세미나',
      description: 'Android Crew',
      startedAt: addHours(past, 1),
      sortOrder: 2,
    },
    {
      seminarSectionId: pastSection2.id,
      title: '매쉬업 뉴스',
      description: null,
      startedAt: addHours(past, 1),
      sortOrder: 1,
    },
  ]);

  // attendance checkpoints: past + thisWeek
  const pastCheckpoints = await tx
    .insert(attendanceCheckpoints)
    .values([
      {
        seminarScheduleId: pastSeminar.id,
        roundNo: 1,
        title: '1부',
        openedAt: past,
        lateAt: addHours(past, 1),
        closedAt: addHours(past, 2),
      },
      {
        seminarScheduleId: pastSeminar.id,
        roundNo: 2,
        title: '2부',
        openedAt: addHours(past, 4),
        lateAt: addHours(past, 5),
        closedAt: addHours(past, 6),
      },
      {
        seminarScheduleId: pastSeminar.id,
        roundNo: 3,
        title: '최종',
        openedAt: addHours(past, 8),
        lateAt: addHours(past, 9),
        closedAt: addHours(past, 10),
      },
    ])
    .returning();

  const thisWeekCheckpoints = await tx
    .insert(attendanceCheckpoints)
    .values([
      {
        seminarScheduleId: thisWeekSeminar.id,
        roundNo: 1,
        title: '1부',
        openedAt: thisWeekSat,
        lateAt: addHours(thisWeekSat, 1),
        closedAt: addHours(thisWeekSat, 2),
      },
      {
        seminarScheduleId: thisWeekSeminar.id,
        roundNo: 2,
        title: '2부',
        openedAt: addHours(thisWeekSat, 4),
        lateAt: addHours(thisWeekSat, 5),
        closedAt: addHours(thisWeekSat, 6),
      },
      {
        seminarScheduleId: thisWeekSeminar.id,
        roundNo: 3,
        title: '최종',
        openedAt: addHours(thisWeekSat, 8),
        lateAt: addHours(thisWeekSat, 9),
        closedAt: addHours(thisWeekSat, 10),
      },
    ])
    .returning();

  return {
    pastSeminarId: pastSeminar.id,
    thisWeekSeminarId: thisWeekSeminar.id,
    futureSeminarIds: [futureSeminar1.id, futureSeminar2.id],
    pastCheckpointIds: pastCheckpoints.map((c) => c.id),
    thisWeekCheckpointIds: thisWeekCheckpoints.map((c) => c.id),
  };
}
