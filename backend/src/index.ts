import { drizzle } from 'drizzle-orm/postgres-js'

import { buildApp } from './app.js'
import { createClients } from './clients/index.js'
import { loadConfig } from './config.js'
import { createUserRepository } from './repositories/users.js'
import { createAuthService } from './services/auth.js'
import { createHealthProbes } from './services/health.js'
import { ensureStorageBucket } from './services/storage.js'

const config = loadConfig()
const clients = createClients(config)
const authService = createAuthService(createUserRepository(drizzle(clients.database)))
const app = buildApp({
  healthProbes: createHealthProbes(clients, config.storage.bucket),
  authService,
  auth: {
    jwtSecret: config.auth.jwtSecret,
    jwtTtlHours: config.auth.jwtTtlHours,
    isProduction: config.isProduction,
  },
})

try {
  await ensureStorageBucket(clients.storage, config.storage.bucket)
  await app.listen(config.api)
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
