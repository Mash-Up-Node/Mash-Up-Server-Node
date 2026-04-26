import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { eq, isNull, and } from 'drizzle-orm';
import { Request } from 'express';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../../db/db.constants';
import * as schema from '../../schema';
import { members } from '../../schema';
import { AuthUnauthorizedException } from '../auth.errors';
import { AuthenticatedRequest } from '../auth.types';
import { AccessTokenService } from '../services/access-token.service';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly accessTokenService: AccessTokenService,
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    const payload = this.accessTokenService.verify(token);
    // JWT payload만으로도 인증은 가능하지만, 탈퇴/삭제된 회원의 토큰을 즉시 차단하기 위해
    // 매 요청마다 DB에서 회원 존재 여부를 확인한다.
    const [member] = await this.db
      .select()
      .from(members)
      .where(and(eq(members.id, payload.memberId), isNull(members.deletedAt)))
      .limit(1);

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
