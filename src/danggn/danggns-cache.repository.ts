import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

const LAST_SENT_AT_TTL_SECONDS = 60;

@Injectable()
export class DanggnsCacheRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  private getFeverKey(memberId: number) {
    return `danggns:member:${memberId}:fever`;
  }

  private getLastSentAtKey(memberId: number) {
    return `danggns:member:${memberId}:lastSentAt`;
  }

  async exists(memberId: number): Promise<boolean> {
    const key = this.getFeverKey(memberId);
    return (await this.redisClient.exists(key)) === 1;
  }

  async getLastSentAt(memberId: number): Promise<number | null> {
    const value = await this.redisClient.get(this.getLastSentAtKey(memberId));
    return value !== null ? Number(value) : null;
  }

  async setLastSentAt(memberId: number, timestamp: number): Promise<void> {
    await this.redisClient.set(
      this.getLastSentAtKey(memberId),
      timestamp,
      'EX',
      LAST_SENT_AT_TTL_SECONDS,
    );
  }
}
