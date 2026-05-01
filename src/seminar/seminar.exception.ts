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

export class SeminarNotFoundException extends BaseException {
  constructor(seminarId: number) {
    super(
      HttpStatus.NOT_FOUND,
      'SEMINAR_NOT_FOUND',
      `세미나(id=${seminarId})를 찾을 수 없습니다.`,
    );
  }
}
