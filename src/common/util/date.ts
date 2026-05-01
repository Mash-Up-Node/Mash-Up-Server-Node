import { addDays, startOfWeek } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const DEFAULT_TIMEZONE = 'Asia/Seoul';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

export type Weekday = (typeof WEEKDAYS)[number];

/**
 * 주어진 timezone 기준 "이번 주" 범위를 UTC Date로 반환.
 * 한 주는 월요일 00:00:00 (포함) ~ 다음 월요일 00:00:00 (제외).
 */
export function getThisWeekRange(
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE,
): { start: Date; end: Date } {
  const zonedNow = toZonedTime(now, timeZone);
  const zonedMonday = startOfWeek(zonedNow, { weekStartsOn: 1 });
  return {
    start: fromZonedTime(zonedMonday, timeZone),
    end: fromZonedTime(addDays(zonedMonday, 7), timeZone),
  };
}

/** 주어진 timezone 기준 요일 (SUN..SAT) */
export function getWeekday(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): Weekday {
  return WEEKDAYS[toZonedTime(date, timeZone).getDay()];
}
