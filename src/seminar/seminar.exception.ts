import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../common/exception/base.exception';

export class ActiveGenerationNotFoundException extends BaseException {
  constructor() {
    super(
      HttpStatus.FORBIDDEN,
      'ACTIVE_GENERATION_NOT_FOUND',
      '활동 중인 기수를 찾을 수 없습니다.',
    );
  }
}
