import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { createDb, createPool } from '../client';
import { seedAttendance } from './seed.attendance';
import { seedGenerations } from './seed.generations';
import { seedMashong } from './seed.mashong';
import { seedMembers } from './seed.members';
import { seedSeminars } from './seed.seminars';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seeding is not allowed in production.');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run seed.');
}

const pool = createPool(databaseUrl);
const db = createDb(pool);

async function run(): Promise<void> {
  await db.transaction(async (tx) => {
    // 매 실행마다 깨끗한 상태로 시작 (RESTART IDENTITY로 ID 1부터 다시 부여)
    await tx.execute(sql`
      TRUNCATE TABLE
        seminar_attendance_records,
        attendance_checkpoints,
        seminar_items,
        seminar_sections,
        seminar_schedules,
        mashong_attendance,
        mashong,
        mashong_level,
        member_generation_activities,
        member_profiles,
        members,
        generations
      RESTART IDENTITY CASCADE
    `);

    const { generationId } = await seedGenerations(tx);
    const { viewerId, memberIds } = await seedMembers(tx, { generationId });
    const { pastCheckpointIds } = await seedSeminars(tx, { generationId });
    await seedAttendance(tx, { viewerId, memberIds, pastCheckpointIds });
    await seedMashong(tx, { generationId, viewerId });
  });

  // eslint-disable-next-line no-console
  console.log('✓ Seed completed');
}

run()
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
