/**
 * 시드 데이터 생성용 시간 헬퍼.
 * 본격 비즈니스 로직 util은 src/seminar/util/ 으로 별도 작성됨.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 이번 주(월~일) 토요일 06:00을 UTC Date로 반환 */
export function thisSaturdayKst(now: Date = new Date()): Date {
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const kstDay = kstNow.getUTCDay(); // 0=Sun..6=Sat
  const daysFromMonday = (kstDay + 6) % 7;

  const kstSat = new Date(kstNow);
  kstSat.setUTCDate(kstSat.getUTCDate() - daysFromMonday + 5);
  kstSat.setUTCHours(6, 0, 0, 0);

  return new Date(kstSat.getTime() - KST_OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setUTCHours(result.getUTCHours() + hours);
  return result;
}
