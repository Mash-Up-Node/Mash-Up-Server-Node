import { Injectable } from '@nestjs/common';
import { format } from 'date-fns';
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
import { ActiveGenerationNotFoundException } from './seminar.exception';
import { SeminarRepository, type SeminarSchedule } from './seminar.repository';

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

  // TODO(seminar): 후속 커밋에서 구현
  async getThisWeek() {
    return null;
  }

  // TODO(seminar): 후속 커밋에서 구현
  async getDetail(seminarId: number) {
    return { seminarId };
  }
}
