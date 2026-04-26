import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../common/exception/base.exception';

export class NaverAuthFailedException extends BaseException {
  constructor() {
    super(
      HttpStatus.BAD_GATEWAY,
      'NAVER_AUTH_FAILED',
      '네이버 인증에 실패했습니다.',
    );
  }
}

export class AuthUnauthorizedException extends BaseException {
  constructor() {
    super(
      HttpStatus.UNAUTHORIZED,
      'UNAUTHORIZED',
      '인증 정보가 유효하지 않습니다.',
    );
  }
}

export class AuthConflictException extends BaseException {
  constructor() {
    super(
      HttpStatus.CONFLICT,
      'AUTH_CONFLICT',
      'OAuth 회원 정보를 처리할 수 없습니다.',
    );
  }
}
