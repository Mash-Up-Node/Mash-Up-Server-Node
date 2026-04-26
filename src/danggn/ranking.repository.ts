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

  zAdd(key: string, score: number, member: string): Promise<number> {
    return this.redisClient.zadd(key, score, member);
  }

  zIncrBy(key: string, increment: number, member: string): Promise<string> {
    return this.redisClient.zincrby(key, increment, member);
  }

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
