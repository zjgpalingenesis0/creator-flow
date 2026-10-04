import { Redis } from 'ioredis'

export function createRedisClient(redisUrl: string) {
  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
  })
}

export type RedisClient = ReturnType<typeof createRedisClient>
