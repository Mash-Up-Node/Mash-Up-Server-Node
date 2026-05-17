import { JwtService } from '@nestjs/jwt';
import { AuthUnauthorizedException } from '../auth.errors';
import { AccessTokenService } from './access-token.service';

describe('AccessTokenService', () => {
  let service: AccessTokenService;

  beforeEach(() => {
    process.env.JWT_ACCESS_TOKEN_SECRET = 'test-access-secret';
    process.env.JWT_ACCESS_TOKEN_TTL_SECONDS = '3600';
    service = new AccessTokenService(new JwtService());
  });

  afterEach(() => {
    delete process.env.JWT_ACCESS_TOKEN_SECRET;
    delete process.env.JWT_ACCESS_TOKEN_TTL_SECONDS;
  });

  it('access token을 발급하고 payload를 검증한다', () => {
    const token = service.issue(1, true);

    expect(service.verify(token)).toMatchObject({
      memberId: 1,
      signupCompleted: true,
    });
  });

  it('유효하지 않은 access token이면 인증 예외를 던진다', () => {
    expect(() => service.verify('invalid-token')).toThrow(
      AuthUnauthorizedException,
    );
  });
});
