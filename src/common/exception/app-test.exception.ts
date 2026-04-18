import { BaseException } from './base.exception';
import { HttpStatus } from '@nestjs/common';
import { AppTestMessage } from './error-message.enum';
import { AppTestErrorCode } from './error-code.enum';

export class TestException extends BaseException {
  constructor() {
    super(
      HttpStatus.I_AM_A_TEAPOT,
      AppTestErrorCode.TEST_ERROR,
      AppTestMessage.TEST_EXCEPTION,
    );
  }
}
