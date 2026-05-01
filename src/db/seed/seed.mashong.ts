import { mashong, mashongAttendance, mashongLevel } from '../../schema';
import type { SeedTx } from './tx';

/**
 * 레벨별 목표 팝콘 양.
 * 프론트 fixture(NODE level 3 → goal 500)와 일치하도록 level 3을 500으로 맞춤.
 */
const LEVEL_GOALS: Array<{ level: number; goalPopcorn: number }> = [
  { level: 1, goalPopcorn: 100 },
  { level: 2, goalPopcorn: 250 },
  { level: 3, goalPopcorn: 500 },
  { level: 4, goalPopcorn: 1000 },
  { level: 5, goalPopcorn: 2000 },
  { level: 6, goalPopcorn: 4000 },
];

type MashongSeed = {
  platform: 'NODE' | 'SPRING' | 'WEB' | 'iOS' | 'ANDROID' | 'DESIGN';
  level: number;
  accumulatedPopcorn: number;
  lastPopcorn: number;
};

/** 플랫폼별 매숑이 진행 상황 (level과 goalPopcorn은 LEVEL_GOALS와 매칭). */
const MASHONG_SEEDS: MashongSeed[] = [
  // 프론트 fixture와 동일
  { platform: 'NODE', level: 3, accumulatedPopcorn: 142, lastPopcorn: 358 },
  { platform: 'SPRING', level: 4, accumulatedPopcorn: 320, lastPopcorn: 680 },
  { platform: 'WEB', level: 2, accumulatedPopcorn: 80, lastPopcorn: 170 },
  { platform: 'iOS', level: 1, accumulatedPopcorn: 30, lastPopcorn: 70 },
  { platform: 'ANDROID', level: 5, accumulatedPopcorn: 1200, lastPopcorn: 800 },
  { platform: 'DESIGN', level: 2, accumulatedPopcorn: 110, lastPopcorn: 140 },
];

const goalByLevel = new Map(LEVEL_GOALS.map((g) => [g.level, g.goalPopcorn]));

/**
 * 매숑이 데이터 시드.
 * - mashong_level: level → goalPopcorn 매핑 (시스템 데이터)
 * - mashong: 활동 기수 × 6개 플랫폼 매숑이
 * - mashong_attendance: viewer가 오늘 1회 출석한 상태 (남은 횟수 검증용)
 */
export async function seedMashong(
  tx: SeedTx,
  ctx: { generationId: number; viewerId: number },
): Promise<void> {
  await tx.insert(mashongLevel).values(LEVEL_GOALS);

  await tx.insert(mashong).values(
    MASHONG_SEEDS.map((m) => ({
      generationId: ctx.generationId,
      platform: m.platform,
      level: m.level,
      accumulatedPopcorn: m.accumulatedPopcorn,
      lastPopcorn: m.lastPopcorn,
      goalPopcorn: goalByLevel.get(m.level) ?? 0,
    })),
  );

  // viewer가 오늘 1회 출석한 상태 (4회 중 1회). 추가 출석 가능.
  await tx.insert(mashongAttendance).values({
    memberId: ctx.viewerId,
    seq: 1,
  });
}
