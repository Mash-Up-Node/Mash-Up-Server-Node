import { Injectable } from '@nestjs/common';
import { differenceInCalendarDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  DEFAULT_TIMEZONE,
  getThisWeekRange,
  getWeekday,
} from '../common/util/date';
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
  type AttendanceCheckpoint,
  type SeminarAttendanceRecord,
  type SeminarItem,
  type SeminarSchedule,
} from './seminar.repository';

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
