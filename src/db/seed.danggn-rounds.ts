import 'dotenv/config';

import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { createDb, createPool } from './client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to run seed.');

const pool = createPool(databaseUrl);
const db = createDb(pool);

const ROUND_COUNT = 20;
const ROUND_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

async function seed() {
  const now = new Date();

  // 마지막 회차(roundNo=20)가 실행 시점 기준 IN_PROGRESS가 되도록 역산
  const lastRoundEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastRoundStart = new Date(lastRoundEnd.getTime() - ROUND_DURATION_MS);
  const firstRoundStart = new Date(
    lastRoundStart.getTime() - (ROUND_COUNT - 1) * ROUND_DURATION_MS,
  );
  const genEnd = new Date(lastRoundEnd.getTime() + ROUND_DURATION_MS);

  // 시드 전용 기수 (number=999)
  const [inserted] = await db
    .insert(schema.generations)
    .values({
      number: 999,
      startedAt: firstRoundStart,
      endedAt: genEnd,
      status: 'ACTIVE',
    })
    .onConflictDoNothing()
    .returning();

  const generationId =
    inserted?.id ??
    (await db.query.generations.findFirst({
      where: eq(schema.generations.number, 999),
    }))!.id;

  const rounds = Array.from({ length: ROUND_COUNT }, (_, i) => {
    const startedAt = new Date(
      firstRoundStart.getTime() + i * ROUND_DURATION_MS,
    );
    const endedAt = new Date(startedAt.getTime() + ROUND_DURATION_MS);
    return { generationId, roundNo: i + 1, startedAt, endedAt };
  });

  const result = await db
    .insert(schema.carrotRounds)
    .values(rounds)
    .onConflictDoNothing()
    .returning();

  console.log(
    `Generation id=${generationId} (number=999) 에 ${result.length}개 회차 시드 완료`,
  );
  console.log(
    `현재 회차: roundNo=${ROUND_COUNT} | ${lastRoundStart.toISOString()} ~ ${lastRoundEnd.toISOString()}`,
  );
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
