import { fileURLToPath } from 'node:url'

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

import { createDatabaseClient } from '../clients/database.js'
import { loadConfig } from '../config.js'

const config = loadConfig()
const client = createDatabaseClient(config.databaseUrl)
const database = drizzle(client)
const migrationsFolder = fileURLToPath(new URL('../../migrations', import.meta.url))

try {
  await migrate(database, { migrationsFolder })
} finally {
  await client.end({ timeout: 5 })
}
