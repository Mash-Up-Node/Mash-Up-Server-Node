import 'dotenv/config';

import { sql } from 'drizzle-orm';

import { createDb, createPool } from './client';
import * as schema from '../schema';

// ── 조절 상수 ────────────────────────────────────────────────────
const SHAKE_LOG_COUNT = 500; // 생성할 당근 흔들기 로그 수
const MEMBER_COUNT = 20; // 생성할 멤버 수 (최대 80)
// ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  'NODE',
  'SPRING',
  'WEB',
  'iOS',
  'ANDROID',
  'DESIGN',
] as const;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required.');

  const pool = createPool(databaseUrl);
  const db = createDb(pool);

  try {
    // 1. generation 번호 채번
    const [{ maxNumber }] = await db
      .select({
        maxNumber: sql<number>`coalesce(max(${schema.generations.number}), 0)`,
      })
      .from(schema.generations);

    const [generation] = await db
      .insert(schema.generations)
      .values({
        number: maxNumber + 1,
        startedAt: new Date('2025-01-01'),
        endedAt: new Date('2025-12-31'),
        status: 'ACTIVE',
      })
      .returning();

    // 2. members 생성
    const tag = Date.now();
    const memberRows = Array.from({ length: MEMBER_COUNT }, (_, i) => ({
      oauthProvider: 'NAVER' as const,
      oauthProviderUserId: `seed_${tag}_${i}`,
      name: `시드멤버${i + 1}`,
      signupCompleted: true,
    }));

    const members = await db
      .insert(schema.members)
      .values(memberRows)
      .returning({ id: schema.members.id });

    // 3. 플랫폼별로 멤버를 순환 배분 (NODE→SPRING→WEB→iOS→ANDROID→DESIGN→...)
    const activityRows = members.map((m, i) => ({
      memberId: m.id,
      generationId: generation.id,
      platform: PLATFORMS[i % PLATFORMS.length],
      role: 'MEMBER' as const,
      status: 'ACTIVE' as const,
      joinedAt: new Date('2025-01-01'),
    }));

    await db.insert(schema.memberGenerationActivities).values(activityRows);

    // 4. 현재 시각 기준 활성 라운드 생성 (1시간 전 ~ 1시간 후)
    const now = new Date();
    const [round] = await db
      .insert(schema.carrotRounds)
      .values({
        generationId: generation.id,
        roundNo: 1,
        startedAt: new Date(now.getTime() - 60 * 60 * 1000),
        endedAt: new Date(now.getTime() + 60 * 60 * 1000),
      })
      .returning();

    // 5. shake 이벤트 생성 — 멤버에게 랜덤 분배
    //    10% 확률로 피버 적용 점수(1000~10000), 나머지는 일반 점수(1~300)
    //    members[0]은 MOCK_USER_ID 테스트용이므로 별도로 10건 보장
    const memberIds = members.map((m) => m.id);
    const mockMemberId = members[0].id;

    function randomScoreDelta() {
      return Math.random() < 0.1 ? randomInt(1000, 10000) : randomInt(1, 300);
    }

    const shakeRows = [
      ...Array.from({ length: 10 }, () => ({
        roundId: round.id,
        memberId: mockMemberId,
        scoreDelta: randomScoreDelta(),
      })),
      ...Array.from({ length: SHAKE_LOG_COUNT - 10 }, () => ({
        roundId: round.id,
        memberId: memberIds[randomInt(0, memberIds.length - 1)],
        scoreDelta: randomScoreDelta(),
      })),
    ];

    await db.insert(schema.carrotShakeEvents).values(shakeRows);

    // 6. 종료된 라운드 생성 (2시간 전 ~ 1시간 전)
    const [endedRound] = await db
      .insert(schema.carrotRounds)
      .values({
        generationId: generation.id,
        roundNo: 2,
        startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endedAt: new Date(now.getTime() - 60 * 60 * 1000),
      })
      .returning();

    const endedShakeRows = [
      ...Array.from({ length: 10 }, () => ({
        roundId: endedRound.id,
        memberId: mockMemberId,
        scoreDelta: randomScoreDelta(),
      })),
      ...Array.from({ length: SHAKE_LOG_COUNT - 10 }, () => ({
        roundId: endedRound.id,
        memberId: memberIds[randomInt(0, memberIds.length - 1)],
        scoreDelta: randomScoreDelta(),
      })),
    ];

    await db.insert(schema.carrotShakeEvents).values(endedShakeRows);

    // 7. 종료 라운드 랭킹 스냅샷 — 셰이크 이벤트에서 인메모리 집계 후 삽입
    const memberScoreMap = new Map<number, number>();
    for (const row of endedShakeRows) {
      memberScoreMap.set(
        row.memberId,
        (memberScoreMap.get(row.memberId) ?? 0) + row.scoreDelta,
      );
    }

    const rankingRows = [...memberScoreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([memberId, totalScore], idx) => ({
        roundId: endedRound.id,
        memberId,
        finalRank: idx + 1,
        finalScore: totalScore,
      }));

    await db.insert(schema.carrotRoundRankings).values(rankingRows);

    console.log('시딩 완료');
    console.log(
      `  generation id : ${generation.id} (번호: ${generation.number})`,
    );
    console.log(
      `  members       : ${MEMBER_COUNT}명 (플랫폼당 ${Math.ceil(MEMBER_COUNT / PLATFORMS.length)}명 내외)`,
    );
    console.log('');
    console.log(
      `  [활성 라운드]  round id: ${round.id}  → GET /danggns/rounds/${round.id}`,
    );
    console.log(
      `  [종료 라운드]  round id: ${endedRound.id}  → GET /danggns/rounds/${endedRound.id}`,
    );
    console.log('');
    console.log(
      `  myRank 확인용 MOCK_USER_ID → ${mockMemberId} (danggns.service.ts)`,
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
