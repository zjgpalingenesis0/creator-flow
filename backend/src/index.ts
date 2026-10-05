import { drizzle } from 'drizzle-orm/postgres-js'

import { buildApp } from './app.js'
import { createClients } from './clients/index.js'
import { loadConfig } from './config.js'
import { createAssetRepository } from './repositories/assets.js'
import { createUserRepository } from './repositories/users.js'
import { createAssetService } from './services/assets.js'
import { createAuthService } from './services/auth.js'
import { createHealthProbes } from './services/health.js'
import { createStorageSignedUrl, ensureStorageBucket } from './services/storage.js'

const config = loadConfig()
const clients = createClients(config)
const database = drizzle(clients.database)
const authService = createAuthService(createUserRepository(database))
const assetService = createAssetService(
  createAssetRepository(database),
  clients.storage,
  config.storage.bucket,
)
const app = buildApp({
  healthProbes: createHealthProbes(clients, config.storage.bucket),
  authService,
  assetService,
  createAssetUrl: (storageKey) =>
    createStorageSignedUrl(clients.storage, config.storage.bucket, storageKey),
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
