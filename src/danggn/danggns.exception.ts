import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../common/exception/base.exception';

export class DanggnsException extends BaseException {
  private constructor(status: number, errorCode: string, message: string) {
    super(status, errorCode, message);
  }

  static roundNotFound() {
    return new DanggnsException(
      HttpStatus.NOT_FOUND,
      'ROUND_NOT_FOUND',
      '해당 회차 정보를 찾을 수 없습니다.',
    );
  }
}
