import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE_DB } from '../db/db.constants';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { and, desc, eq } from 'drizzle-orm';
import { mashongAttendance } from '../schema';
import { CheckAttendanceResponseDto } from './dto/check-attendance.response';

const ATTENDANCE_INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class MashongService {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * 출석체크를 진행하는 함수
   * @param memberId
   */
  async checkAttendance(memberId: number): Promise<CheckAttendanceResponseDto> {
    // TODO: 4회 출석 완료 시 redis로 DB 조회 없이 스킵하도록 변경
    const latestAttendance = await this.getLatestAttendance(memberId);
    const latestSeq = latestAttendance?.seq ?? 0;

    if (latestSeq >= 4) {
      return {
        memberId,
        isChecked: false,
        attendanceSeq: latestSeq,
      };
    }

    if (latestAttendance) {
      const afterLatestAttendanceTime =
        Date.now() - latestAttendance.createdAt.getTime();
      if (afterLatestAttendanceTime < ATTENDANCE_INTERVAL_MS) {
        return {
          memberId,
          isChecked: false,
          attendanceSeq: latestSeq,
        };
      }
    }

    const nextSeq = latestSeq + 1;

    await this.db.insert(mashongAttendance).values({
      memberId,
      seq: nextSeq,
    });

    // TODO: 미션 기록 반영 추가, insert와 트랜잭션 처리하도록 구현

    return {
      memberId,
      isChecked: true,
      attendanceSeq: nextSeq,
    };
  }

  /**
   * 오늘의 최신 출석 기록을 조회하는 함수
   * @param memberId
   * @private
   */
  private async getLatestAttendance(memberId: number) {
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
}
