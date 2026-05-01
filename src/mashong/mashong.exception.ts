import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../common/exception/base.exception';

export class MashongException extends BaseException {
  private constructor(
    statusCode: HttpStatus,
    errorCode: string,
    message: string,
  ) {
    super(statusCode, errorCode, message);
  }

  static mashongNotFound() {
    return new MashongException(
      HttpStatus.NOT_FOUND,
      'MASHONG_NOT_FOUND',
      '매숑이 정보를 불러올 수 없습니다.',
    );
  }
}
