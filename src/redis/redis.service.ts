import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async onModuleInit(): Promise<void> {
    this.redisClient.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });
    this.redisClient.on('reconnecting', (delay: number) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    this.redisClient.on('end', () => {
      this.logger.error('Redis connection ended (retries exhausted)');
    });

    const pong = await this.redisClient.ping();
    this.logger.log(`Redis connection check succeeded: ${pong}`);
  }

  onApplicationShutdown(): Promise<'OK'> {
    return this.redisClient.quit();
  }
}
