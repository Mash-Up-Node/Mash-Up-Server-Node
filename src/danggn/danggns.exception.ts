import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../common/exception/base.exception';

export class DanggnsException extends BaseException {
  private constructor(status: number, errorCode: string, message: string) {
    super(status, errorCode, message);
  }

  static roundClosed() {
    return new DanggnsException(
      HttpStatus.FORBIDDEN,
      'ROUND_CLOSED',
      '해당 회차는 이미 종료되었습니다.',
    );
  }

  static roundNotFound() {
    return new DanggnsException(
      HttpStatus.NOT_FOUND,
      'ROUND_NOT_FOUND',
      '해당 회차 정보를 찾을 수 없습니다.',
    );
  }

  static abnormalShakeCount() {
    return new DanggnsException(
      HttpStatus.BAD_REQUEST,
      'ABNORMAL_SHAKE_COUNT',
      '비정상적인 흔들기 횟수가 감지되었습니다.',
    );
  }

  static feverNotActive() {
    return new DanggnsException(
      HttpStatus.FORBIDDEN,
      'FEVER_NOT_ACTIVE',
      '현재 피버 상태가 아닙니다.',
    );
  }
}
