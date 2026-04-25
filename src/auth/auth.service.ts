import { Inject, Injectable, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';
import { members } from '../schema';
import { AuthConflictException } from './auth.errors';
import { AuthClient, Member } from './auth.types';
import { NaverOAuthService } from './oauth/naver-oauth.service';
import {
  OAuthProvider,
  OAuthUserProfile,
} from './oauth/oauth-provider.interface';
import { AccessTokenService } from './services/access-token.service';
import { RefreshTokenService } from './services/refresh-token.service';

const REQUIRED_SIGNUP_FIELDS = ['name', 'platform', 'inviteCode'] as const;

type RequiredSignupField = (typeof REQUIRED_SIGNUP_FIELDS)[number];

export type NaverLoginResult =
  | {
      memberId: number;
      signupCompleted: false;
      accessToken: string;
      requiredFields: RequiredSignupField[];
    }
  | {
      memberId: number;
      signupCompleted: true;
      accessToken: string;
      refreshToken: string;
      authClient: AuthClient;
    };

export type MeResult = {
  memberId: number;
  authenticated: true;
  signupCompleted: boolean;
  name: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly naverOAuthService: NaverOAuthService,
    private readonly accessTokenService: AccessTokenService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async loginWithNaver(
    authorizationCode: string,
    authClient: AuthClient,
  ): Promise<NaverLoginResult> {
    const profile = await this.naverOAuthService.getProfile(authorizationCode);
    const member = await this.findOrCreateOAuthMember(
      this.naverOAuthService,
      profile,
    );

    const accessToken = this.accessTokenService.issue(
      member.id,
      member.signupCompleted,
    );

    if (!member.signupCompleted) {
      return {
        memberId: member.id,
        signupCompleted: false,
        accessToken,
        requiredFields: [...REQUIRED_SIGNUP_FIELDS],
      };
    }

    const refreshToken = await this.refreshTokenService.issue(member.id);

    return {
      memberId: member.id,
      signupCompleted: true,
      accessToken,
      refreshToken,
      authClient,
    };
  }

  getMe(member: Member): MeResult {
    return {
      memberId: member.id,
      authenticated: true,
      signupCompleted: member.signupCompleted,
      name: member.name,
    };
  }

  private async findOrCreateOAuthMember(
    oauthProvider: OAuthProvider,
    profile: OAuthUserProfile,
  ): Promise<Member> {
    const providerName = oauthProvider.providerName;

    const [createdMember] = await this.db
      .insert(members)
      .values({
        oauthProvider: providerName,
        oauthProviderUserId: profile.providerUserId,
        email: profile.email,
        signupCompleted: false,
      })
      .onConflictDoNothing()
      .returning();

    if (createdMember) {
      return createdMember;
    }

    const [existingMember] = await this.db
      .select()
      .from(members)
      .where(
        and(
          eq(members.oauthProvider, providerName),
          eq(members.oauthProviderUserId, profile.providerUserId),
          isNull(members.deletedAt),
        ),
      )
      .limit(1);

    if (!existingMember) {
      // insert 충돌 후 활성 회원을 찾지 못한 경우 — soft-delete된 계정과 OAuth ID가 충돌했을 가능성
      this.logger.warn(
        `OAuth 충돌 후 활성 회원 조회 실패: provider=${providerName}, providerUserId=${profile.providerUserId}`,
      );
      throw new AuthConflictException();
    }

    return existingMember;
  }
}
