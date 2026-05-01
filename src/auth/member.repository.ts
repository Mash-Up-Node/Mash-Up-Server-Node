import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB } from '../db/db.constants';
import * as schema from '../schema';
import { members } from '../schema';
import { Member } from './auth.types';
import { OAuthProviderName } from './oauth/oauth-provider.interface';

@Injectable()
export class MemberRepository {
  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async createOAuthMember(
    providerName: OAuthProviderName,
    providerUserId: string,
    email?: string,
  ): Promise<Member | undefined> {
    const [createdMember] = await this.db
      .insert(members)
      .values({
        oauthProvider: providerName,
        oauthProviderUserId: providerUserId,
        email,
        signupCompleted: true,
      })
      .onConflictDoNothing()
      .returning();

    return createdMember;
  }

  async findActiveByOAuthIdentity(
    providerName: OAuthProviderName,
    providerUserId: string,
  ): Promise<Member | undefined> {
    const [member] = await this.db
      .select()
      .from(members)
      .where(
        and(
          eq(members.oauthProvider, providerName),
          eq(members.oauthProviderUserId, providerUserId),
          isNull(members.deletedAt),
        ),
      )
      .limit(1);

    return member;
  }

  async findActiveById(memberId: number): Promise<Member | undefined> {
    const [member] = await this.db
      .select()
      .from(members)
      .where(and(eq(members.id, memberId), isNull(members.deletedAt)))
      .limit(1);

    return member;
  }
}
