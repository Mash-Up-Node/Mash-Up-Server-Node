import { BaseException } from './base.exception';
import { HttpStatus } from '@nestjs/common';

export class TestException extends BaseException {
  private constructor(errorCode: string, message: string) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, errorCode, message);
  }

  static testError() {
    return new TestException('TEST_ERROR', '테스트용 에러입니다.');
  }
}
