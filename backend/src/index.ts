import { buildApp } from './app.js'
import { createClients } from './clients/index.js'
import { loadConfig } from './config.js'
import { createHealthProbes } from './services/health.js'
import { ensureStorageBucket } from './services/storage.js'

const config = loadConfig()
const clients = createClients(config)
const app = buildApp({
  healthProbes: createHealthProbes(clients, config.storage.bucket),
})

try {
  await ensureStorageBucket(clients.storage, config.storage.bucket)
  await app.listen(config.api)
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
