import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

export type RedisSortedSetEntry = {
  member: string;
  score: number;
};

@Injectable()
export class RankingRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  zScore(key: string, member: string): Promise<string | null> {
    return this.redisClient.zscore(key, member);
  }

  zRevRank(key: string, member: string): Promise<number | null> {
    return this.redisClient.zrevrank(key, member);
  }

  zRevRangeWithScores(
    key: string,
    start: number,
    stop: number,
  ): Promise<RedisSortedSetEntry[]> {
    return this.redisClient
      .zrevrange(key, start, stop, 'WITHSCORES')
      .then((result) => this.toSortedSetEntries(result));
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redisClient.exists(key)) === 1;
  }

  async zAddBulk(
    key: string,
    entries: { score: number; member: string }[],
  ): Promise<void> {
    if (entries.length === 0) return;
    const pipeline = this.redisClient.pipeline();
    for (const { score, member } of entries) {
      pipeline.zadd(key, score, member);
    }
    await pipeline.exec();
  }

  private toSortedSetEntries(flattened: string[]): RedisSortedSetEntry[] {
    const entries: RedisSortedSetEntry[] = [];

    for (let index = 0; index < flattened.length; index += 2) {
      const member = flattened[index];
      const rawScore = flattened[index + 1];

      if (member === undefined || rawScore === undefined) {
        continue;
      }

      entries.push({
        member,
        score: Number(rawScore),
      });
    }

    return entries;
  }
}
