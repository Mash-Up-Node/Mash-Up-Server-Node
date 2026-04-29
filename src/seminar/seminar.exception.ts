import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../common/exception/base.exception';

export class SeminarNotFoundException extends BaseException {
  constructor(seminarId?: number) {
    super(
      HttpStatus.NOT_FOUND,
      'SEMINAR_NOT_FOUND',
      seminarId !== undefined
        ? `세미나(${seminarId})를 찾을 수 없습니다.`
        : '세미나 정보를 찾을 수 없습니다.',
    );
  }
}
