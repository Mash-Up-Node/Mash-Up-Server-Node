import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { getRedisConfig } from './redis.config';
import { REDIS_CLIENT } from './redis.constants';
import { RedisService } from './redis.service';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const config = getRedisConfig();

        if (config.url) {
          return new Redis(config.url);
        }

        return new Redis(config.options);
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
