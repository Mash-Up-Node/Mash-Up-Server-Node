import { Injectable } from '@nestjs/common';
import { CheckAttendanceResponseDto } from './dto/check-attendance.response';
import { MashongRepository } from './mashong.repository';

const ATTENDANCE_INTERVAL_MS = 30 * 60 * 1000;

@Injectable()
export class MashongService {
  constructor(private readonly mashongRepository: MashongRepository) {}

  /**
   * 출석체크를 진행하는 함수
   * @param memberId
   */
  async checkAttendance(memberId: number): Promise<CheckAttendanceResponseDto> {
    // TODO: 4회 출석 완료 시 redis로 DB 조회 없이 스킵하도록 변경
    const latestAttendance =
      await this.mashongRepository.getLatestAttendance(memberId);
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

    await this.mashongRepository.insertAttendance(memberId, nextSeq);

    // TODO: 미션 기록 반영 추가, insert와 트랜잭션 처리하도록 구현

    return {
      memberId,
      isChecked: true,
      attendanceSeq: nextSeq,
    };
  }
}
