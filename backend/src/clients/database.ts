import postgres from 'postgres'

export function createDatabaseClient(databaseUrl: string) {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  })
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>
