import { getThisWeekRange, getWeekday } from './date';

describe('getThisWeekRange (Asia/Seoul 기본)', () => {
  it('월요일 00:00:00 KST 정각에는 그 월요일이 start, 다음 월요일이 end', () => {
    const now = new Date('2026-04-26T15:00:00.000Z');
    const { start, end } = getThisWeekRange(now);
    expect(start.toISOString()).toBe('2026-04-26T15:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-03T15:00:00.000Z');
  });

  it('수요일 정오 KST는 그 주에 포함', () => {
    const now = new Date('2026-04-29T03:00:00.000Z');
    const { start, end } = getThisWeekRange(now);
    expect(start.toISOString()).toBe('2026-04-26T15:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-03T15:00:00.000Z');
  });

  it('일요일 23:59:59.999 KST는 같은 주', () => {
    const now = new Date('2026-05-03T14:59:59.999Z');
    const { start, end } = getThisWeekRange(now);
    expect(start.toISOString()).toBe('2026-04-26T15:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-03T15:00:00.000Z');
  });

  it('다음 월요일 00:00:00.000 KST부터 새 주 시작', () => {
    const now = new Date('2026-05-03T15:00:00.000Z');
    const { start, end } = getThisWeekRange(now);
    expect(start.toISOString()).toBe('2026-05-03T15:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-10T15:00:00.000Z');
  });

  it('월/연 경계 — 2026-12-28(월)이 시작인 주', () => {
    const now = new Date('2026-12-30T00:00:00.000Z');
    const { start, end } = getThisWeekRange(now);
    expect(start.toISOString()).toBe('2026-12-27T15:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-03T15:00:00.000Z');
  });

  it('timezone 인자로 UTC를 명시하면 UTC 기준 월요일이 start', () => {
    // UTC 2026-04-29(수) → 그 주 월요일 = UTC 2026-04-27 00:00
    const now = new Date('2026-04-29T03:00:00.000Z');
    const { start, end } = getThisWeekRange(now, 'UTC');
    expect(start.toISOString()).toBe('2026-04-27T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-05-04T00:00:00.000Z');
  });
});

describe('getWeekday (Asia/Seoul 기본)', () => {
  it.each([
    ['2026-04-26T15:00:00.000Z', 'MON'],
    ['2026-04-29T03:00:00.000Z', 'WED'],
    ['2026-05-03T14:59:59.999Z', 'SUN'],
    ['2026-05-03T15:00:00.000Z', 'MON'],
    ['2026-05-02T00:00:00.000Z', 'SAT'],
  ])('%s → %s', (input, expected) => {
    expect(getWeekday(new Date(input))).toBe(expected);
  });
});
