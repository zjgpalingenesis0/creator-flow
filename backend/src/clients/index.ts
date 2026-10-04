import type { AppConfig } from '../config.js'
import { createDatabaseClient } from './database.js'
import { createRedisClient } from './redis.js'
import { createStorageClient } from './storage.js'

export function createClients(config: AppConfig) {
  return {
    database: createDatabaseClient(config.databaseUrl),
    redis: createRedisClient(config.redisUrl),
    storage: createStorageClient(config.storage),
  }
}

export type ServiceClients = ReturnType<typeof createClients>

export async function closeClients(clients: ServiceClients) {
  clients.redis.disconnect()
  clients.storage.destroy()
  await clients.database.end({ timeout: 5 })
}

export { createDatabaseClient } from './database.js'
export { createRedisClient } from './redis.js'
export { createStorageClient } from './storage.js'
