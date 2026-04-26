import { createHash, randomBytes } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

type StoredRefreshToken = {
  memberId: number;
  tokenHash: string;
};

@Injectable()
export class RefreshTokenService {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async issue(memberId: number): Promise<string> {
    const tokenId = randomBytes(16).toString('base64url');
    const tokenSecret = randomBytes(32).toString('base64url');
    const refreshToken = `${tokenId}.${tokenSecret}`;
    const ttlSeconds = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 1209600);
    const value: StoredRefreshToken = {
      memberId,
      tokenHash: this.hash(refreshToken),
    };

    await this.redisClient.set(
      this.getKey(tokenId),
      JSON.stringify(value),
      'EX',
      ttlSeconds,
    );

    return refreshToken;
  }

  // 다음 작업의 refresh API에서 tokenId 추출 후 저장된 hash와 비교한다.
  async findByTokenId(tokenId: string): Promise<StoredRefreshToken | null> {
    const value = await this.redisClient.get(this.getKey(tokenId));

    if (!value) {
      return null;
    }

    return JSON.parse(value) as StoredRefreshToken;
  }

  // 다음 작업의 logout API에서 사용한다.
  async revoke(tokenId: string): Promise<void> {
    await this.redisClient.del(this.getKey(tokenId));
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getKey(tokenId: string): string {
    return `auth:refresh:${tokenId}`;
  }
}
