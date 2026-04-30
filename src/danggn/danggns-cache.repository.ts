import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

const RANKING_RESTORED_TTL_SECONDS = 30;

@Injectable()
export class DanggnsCacheRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  private getRankingRestoredKey(roundId: number) {
    return `danggns:round:${roundId}:ranking:restored`;
  }

  async isRankingRestored(roundId: number): Promise<boolean> {
    return (
      (await this.redisClient.exists(this.getRankingRestoredKey(roundId))) === 1
    );
  }

  async setRankingRestored(roundId: number): Promise<void> {
    await this.redisClient.set(
      this.getRankingRestoredKey(roundId),
      '1',
      'EX',
      RANKING_RESTORED_TTL_SECONDS,
    );
  }
}
