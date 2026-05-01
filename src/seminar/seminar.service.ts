import { Injectable } from '@nestjs/common';
import { differenceInCalendarDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  DEFAULT_TIMEZONE,
  getThisWeekRange,
  getWeekday,
} from '../common/util/date';
import {
  BANNER_BY_PHASE,
  PLATFORM_LABEL,
  PLATFORM_SLUG,
} from './attendance.constants';
import type {
  AttendancePhase4,
  AttendancePlatformsResponseDto,
} from './dto/attendance-platforms-response.dto';
import type {
  ScheduleItem,
  SchedulesResponseDto,
} from './dto/schedules-response.dto';
import type { SeminarDetailResponseDto } from './dto/seminar-detail-response.dto';
import type {
  Attendance,
  AttendancePhase,
  AttendanceStatus,
  ThisWeekResponseDto,
  ThisWeekSeminar,
} from './dto/this-week-response.dto';
import {
  ActiveGenerationNotFoundException,
  SeminarNotFoundException,
} from './seminar.exception';
import {
  SeminarRepository,
  type ActiveActivity,
  type AttendanceCheckpoint,
  type Platform,
  type SeminarAttendanceRecord,
  type SeminarItem,
  type SeminarSchedule,
} from './seminar.repository';

type MemberAttendanceVerdict = 'attended' | 'late' | 'absent';

type ScheduleWithDate = SeminarSchedule & { startedAt: Date };

type ScheduleMonthGroup = {
  year: number;
  month: number;
  items: ScheduleWithDate[];
};

@Injectable()
export class SeminarService {
  constructor(private readonly seminarRepository: SeminarRepository) {}

  /**
   * KST 기준 연/월별로 schedule을 그룹핑. startedAt이 null인 항목은 제외.
   * 결과는 (year, month) 오름차순 정렬, 각 그룹 내 입력 순서 유지.
   */
  private groupByMonth(schedules: SeminarSchedule[]): ScheduleMonthGroup[] {
    const monthGroups = new Map<string, ScheduleMonthGroup>();

    for (const schedule of schedules) {
      if (schedule.startedAt === null) continue;
      const dated = schedule as ScheduleWithDate;
      const zoned = toZonedTime(dated.startedAt, DEFAULT_TIMEZONE);
      const year = zoned.getFullYear();
      const month = zoned.getMonth() + 1;
      const key = `${year}-${month}`;

      let group = monthGroups.get(key);
      if (!group) {
        group = { year, month, items: [] };
        monthGroups.set(key, group);
      }
      group.items.push(dated);
    }

    return Array.from(monthGroups.values()).sort(
      (a, b) => a.year - b.year || a.month - b.month,
    );
  }

  /**
   * 출석 시간별 체크포인트 목록과 현재 시각으로 phase를 계산.
   * - now < 첫 체크포인트 openedAt → BEFORE
   * - 첫 openedAt <= now <= 마지막 closedAt → IN_PROGRESS
   * - 마지막 closedAt < now → COMPLETED
   */
  private calculateAttendancePhase(
    checkpoints: AttendanceCheckpoint[],
    now: Date,
  ): AttendancePhase {
    if (checkpoints.length === 0) return 'BEFORE';

    const firstOpenedAt = Math.min(
      ...checkpoints.map((c) => c.openedAt.getTime()),
    );
    const lastClosedAt = Math.max(
      ...checkpoints.map((c) => c.closedAt.getTime()),
    );
    const nowMs = now.getTime();

    if (nowMs < firstOpenedAt) return 'BEFORE';
    if (nowMs <= lastClosedAt) return 'IN_PROGRESS';
    return 'COMPLETED';
  }

  private toScheduleItem(
    schedule: ScheduleWithDate,
    weekStart: Date,
    weekEnd: Date,
  ): ScheduleItem {
    const isThisWeek =
      schedule.startedAt >= weekStart && schedule.startedAt < weekEnd;

    return {
      seminarId: schedule.id,
      date: format(
        toZonedTime(schedule.startedAt, DEFAULT_TIMEZONE),
        'yyyy-MM-dd',
      ),
      weekday: getWeekday(schedule.startedAt),
      title: schedule.title,
      startsAt: schedule.startedAt.toISOString(),
      endsAt: schedule.endedAt?.toISOString() ?? null,
      locationName: schedule.venueName,
      isHighlighted: isThisWeek,
    };
  }

  private toThisWeekSeminar(
    schedule: SeminarSchedule,
    checkpoints: AttendanceCheckpoint[],
    recordsByCheckpoint: Map<number, SeminarAttendanceRecord>,
    viewerName: string,
    now: Date,
  ): ThisWeekSeminar {
    const attendance: Attendance = {
      phase: this.calculateAttendancePhase(checkpoints, now),
      viewerName,
      records: checkpoints.map((cp) => {
        const record = recordsByCheckpoint.get(cp.id);
        const status: AttendanceStatus = record?.status ?? 'PENDING';
        return {
          checkpointId: cp.id,
          label: cp.title,
          status,
          checkedAt: record?.checkedAt?.toISOString() ?? null,
        };
      }),
    };

    return {
      seminarId: schedule.id,
      badge: { type: 'SEMINAR', label: 'Semina' },
      title: schedule.title,
      startsAt: schedule.startedAt?.toISOString() ?? null,
      endsAt: schedule.endedAt?.toISOString() ?? null,
      locationName: schedule.venueName,
      notice: schedule.notice,
      attendance,
    };
  }

  async getSchedules(viewerId: number): Promise<SchedulesResponseDto> {
    const generation =
      await this.seminarRepository.findActiveGeneration(viewerId);
    if (!generation) {
      throw new ActiveGenerationNotFoundException();
    }

    const schedules = await this.seminarRepository.findSchedulesByGeneration(
      generation.id,
    );
    const { start: weekStart, end: weekEnd } = getThisWeekRange();

    return {
      generation,
      months: this.groupByMonth(schedules).map((group) => ({
        year: group.year,
        month: group.month,
        items: group.items.map((item) =>
          this.toScheduleItem(item, weekStart, weekEnd),
        ),
      })),
    };
  }

  async getThisWeek(viewerId: number): Promise<ThisWeekResponseDto> {
    const [generation, viewerName] = await Promise.all([
      this.seminarRepository.findActiveGeneration(viewerId),
      this.seminarRepository.findMemberName(viewerId),
    ]);
    if (!generation) {
      throw new ActiveGenerationNotFoundException();
    }

    const now = new Date();
    const { start: weekStart, end: weekEnd } = getThisWeekRange(now);

    const [thisWeekSchedule, nextStartedAt] = await Promise.all([
      this.seminarRepository.findThisWeekSchedule(
        generation.id,
        weekStart,
        weekEnd,
      ),
      this.seminarRepository.findNextScheduleStartedAt(generation.id, now),
    ]);

    const [checkpoints, records] = thisWeekSchedule
      ? await Promise.all([
          this.seminarRepository.findCheckpointsBySchedule(thisWeekSchedule.id),
          this.seminarRepository.findRecordsByMemberAndSchedule(
            viewerId,
            thisWeekSchedule.id,
          ),
        ])
      : [[], []];
    const recordsByCheckpoint = new Map(
      records.map((r) => [r.attendanceCheckpointId, r]),
    );

    return {
      serverTime: now.toISOString(),
      generation,
      daysUntilNextSeminar: nextStartedAt
        ? differenceInCalendarDays(
            toZonedTime(nextStartedAt, DEFAULT_TIMEZONE),
            toZonedTime(now, DEFAULT_TIMEZONE),
          )
        : null,
      thisWeekSeminar: thisWeekSchedule
        ? this.toThisWeekSeminar(
            thisWeekSchedule,
            checkpoints,
            recordsByCheckpoint,
            viewerName ?? '',
            now,
          )
        : null,
    };
  }

  /**
   * 운영진 출석 현황 화면(4단계)용 phase 계산.
   * - BEFORE: 첫 openedAt 전
   * - IN_PROGRESS: 어떤 checkpoint의 openedAt~lateAt 사이 (정시 출석 가능)
   * - AGGREGATING: 모든 IN_PROGRESS 끝났고 어떤 checkpoint의 lateAt~closedAt 사이 (지각만 가능)
   * - COMPLETED: 마지막 closedAt 이후
   *
   * weekly 화면(3단계)과는 별도로 운영진 화면이 더 세밀해야 해서 분리.
   * checkpoints가 비어있으면 BEFORE.
   */
  private calculateAttendancePhase4(
    checkpoints: AttendanceCheckpoint[],
    now: Date,
  ): AttendancePhase4 {
    if (checkpoints.length === 0) return 'BEFORE';

    const nowMs = now.getTime();
    const firstOpenedAt = Math.min(
      ...checkpoints.map((c) => c.openedAt.getTime()),
    );
    const lastClosedAt = Math.max(
      ...checkpoints.map((c) => c.closedAt.getTime()),
    );

    if (nowMs < firstOpenedAt) return 'BEFORE';
    if (nowMs > lastClosedAt) return 'COMPLETED';

    const isInProgress = checkpoints.some(
      (c) => c.openedAt.getTime() <= nowMs && nowMs <= c.lateAt.getTime(),
    );
    if (isInProgress) return 'IN_PROGRESS';

    return 'AGGREGATING';
  }

  /**
   * 한 멤버의 records와 전체 checkpoints를 받아 멤버 단위 최종 판정.
   * - 모든 checkpoint에 ATTENDED records → attended
   * - LATE 있고 ABSENT/미체크 없음 → late
   * - 그 외 (ABSENT 있거나 미체크 있음) → absent
   */
  private judgeMemberAttendance(
    memberRecords: SeminarAttendanceRecord[],
    checkpoints: AttendanceCheckpoint[],
  ): MemberAttendanceVerdict {
    if (checkpoints.length === 0) return 'absent';

    const recordByCheckpoint = new Map(
      memberRecords.map((r) => [r.attendanceCheckpointId, r]),
    );

    let hasLate = false;
    for (const cp of checkpoints) {
      const rec = recordByCheckpoint.get(cp.id);
      if (!rec || rec.status === 'ABSENT') return 'absent';
      if (rec.status === 'LATE') hasLate = true;
    }
    return hasLate ? 'late' : 'attended';
  }

  async getAttendancePlatforms(
    seminarId: number,
  ): Promise<AttendancePlatformsResponseDto> {
    const schedule = await this.seminarRepository.findScheduleById(seminarId);
    if (!schedule) {
      throw new SeminarNotFoundException(seminarId);
    }

    const [checkpoints, activities, records] = await Promise.all([
      this.seminarRepository.findCheckpointsBySchedule(seminarId),
      this.seminarRepository.findActiveActivitiesByGeneration(
        schedule.generationId,
      ),
      this.seminarRepository.findRecordsBySchedule(seminarId),
    ]);

    // records를 멤버별로 그룹핑
    const recordsByMember = new Map<number, SeminarAttendanceRecord[]>();
    for (const rec of records) {
      const list = recordsByMember.get(rec.memberId) ?? [];
      list.push(rec);
      recordsByMember.set(rec.memberId, list);
    }

    // activities를 platform별로 그룹핑
    const activitiesByPlatform = new Map<Platform, ActiveActivity[]>();
    for (const act of activities) {
      const list = activitiesByPlatform.get(act.platform) ?? [];
      list.push(act);
      activitiesByPlatform.set(act.platform, list);
    }

    // 응답 platforms 배열은 PLATFORM_SLUG의 키 순서대로 (멤버 0명인 플랫폼도 포함)
    const platforms = (Object.keys(PLATFORM_SLUG) as Platform[]).map(
      (platform) => {
        const members = activitiesByPlatform.get(platform) ?? [];
        const summary = {
          total: members.length,
          attended: 0,
          late: 0,
          absent: 0,
        };
        for (const m of members) {
          const verdict = this.judgeMemberAttendance(
            recordsByMember.get(m.memberId) ?? [],
            checkpoints,
          );
          summary[verdict]++;
        }
        return {
          platformId: PLATFORM_SLUG[platform],
          platform,
          label: PLATFORM_LABEL[platform],
          memberCount: members.length,
          summary,
        };
      },
    );

    const phase = this.calculateAttendancePhase4(checkpoints, new Date());

    return {
      seminarId: schedule.id,
      title: schedule.title,
      attendancePhase: phase,
      banner: BANNER_BY_PHASE[phase],
      checkpoints: checkpoints.map((cp) => ({
        checkpointId: cp.id,
        label: cp.title,
        order: cp.roundNo,
      })),
      platforms,
    };
  }

  async getDetail(seminarId: number): Promise<SeminarDetailResponseDto> {
    const [schedule, sections, items, checkpoints] = await Promise.all([
      this.seminarRepository.findScheduleById(seminarId),
      this.seminarRepository.findSectionsBySchedule(seminarId),
      this.seminarRepository.findItemsBySchedule(seminarId),
      this.seminarRepository.findCheckpointsBySchedule(seminarId),
    ]);

    // 운영 정책상 detail 응답은 startedAt 있는 schedule만 노출
    if (!schedule || schedule.startedAt === null) {
      throw new SeminarNotFoundException(seminarId);
    }

    const itemsBySection = new Map<number, SeminarItem[]>();
    for (const item of items) {
      const list = itemsBySection.get(item.seminarSectionId) ?? [];
      list.push(item);
      itemsBySection.set(item.seminarSectionId, list);
    }

    const programSections = sections.map((section) => ({
      sectionNo: section.sortOrder,
      title: section.title,
      startsAt: section.startedAt?.toISOString() ?? null,
      endsAt: section.endedAt?.toISOString() ?? null,
      items: (itemsBySection.get(section.id) ?? []).map((item) => ({
        order: item.sortOrder,
        title: item.title,
        description: item.description,
        startsAt: item.startedAt?.toISOString() ?? null,
      })),
    }));

    const now = new Date();
    const attendanceAvailable = checkpoints.some(
      (cp) => cp.openedAt <= now && now <= cp.closedAt,
    );

    return {
      seminarId: schedule.id,
      title: schedule.title,
      date: format(
        toZonedTime(schedule.startedAt, DEFAULT_TIMEZONE),
        'yyyy-MM-dd',
      ),
      startsAt: schedule.startedAt.toISOString(),
      endsAt: schedule.endedAt?.toISOString() ?? null,
      location: {
        name: schedule.venueName,
        address: schedule.venueAddress,
        latitude: schedule.venueLat ? parseFloat(schedule.venueLat) : null,
        longitude: schedule.venueLng ? parseFloat(schedule.venueLng) : null,
        mapImageUrl: null,
      },
      notice: schedule.notice,
      programSections,
      attendanceAvailable,
    };
  }
}
