import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthUnauthorizedException } from '../auth.errors';
import { AuthenticatedRequest } from '../auth.types';
import { MemberRepository } from '../member.repository';
import { AccessTokenService } from '../services/access-token.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    private readonly memberRepository: MemberRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    const payload = this.accessTokenService.verify(token);
    // JWT payload만으로도 인증은 가능하지만, 탈퇴/삭제된 회원의 토큰을 즉시 차단하기 위해
    // 매 요청마다 DB에서 회원 존재 여부를 확인한다.
    const member = await this.memberRepository.findActiveById(payload.memberId);

    if (!member) {
      throw new AuthUnauthorizedException();
    }

    (request as AuthenticatedRequest).member = member;

    return true;
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new AuthUnauthorizedException();
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new AuthUnauthorizedException();
    }

    return token;
  }
}
