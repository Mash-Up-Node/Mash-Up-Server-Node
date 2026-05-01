import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../db/db.constants';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { and, desc, eq } from 'drizzle-orm';
import { mashong, mashongAttendance } from '../schema';
import { Platform } from '../common/type/user';

@Injectable()
export class MashongRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async insertAttendance(memberId: number, seq: number) {
    await this.db.insert(mashongAttendance).values({
      memberId,
      seq,
    });
  }

  async getLatestAttendance(memberId: number) {
    const today = new Date().toISOString().split('T')[0];

    return this.db
      .select()
      .from(mashongAttendance)
      .where(
        and(
          eq(mashongAttendance.memberId, memberId),
          eq(mashongAttendance.attendanceDate, today),
        ),
      )
      .orderBy(desc(mashongAttendance.seq))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  async getMashongInfo(platform: string, generationId: number) {
    const result = await this.db
      .select()
      .from(mashong)
      .where(
        and(
          eq(mashong.platform, Platform[platform]),
          eq(mashong.generationId, generationId),
        ),
      )
      .limit(1);

    return result?.[0];
  }
}
