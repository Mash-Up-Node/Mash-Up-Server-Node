import type { RedisOptions } from 'ioredis';

type RedisConfig = {
  url?: string;
  options?: RedisOptions;
};

const DEFAULT_REDIS_PORT = 6379;

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getRedisConfig = (): RedisConfig => {
  const url = process.env.REDIS_URL;

  if (url) {
    return { url };
  }

  return {
    options: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: toNumber(process.env.REDIS_PORT, DEFAULT_REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      db: toNumber(process.env.REDIS_DB, 0),
    },
  };
};
