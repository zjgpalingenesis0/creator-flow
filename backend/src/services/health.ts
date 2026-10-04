import { HeadBucketCommand } from '@aws-sdk/client-s3'

import type { ServiceClients } from '../clients/index.js'

export interface HealthProbes {
  database: () => Promise<unknown>
  redis: () => Promise<unknown>
  storage: () => Promise<unknown>
}

export interface HealthReport {
  api: 'ok'
  database: string
  redis: string
  storage: string
}

export function createHealthProbes(clients: ServiceClients, bucket: string): HealthProbes {
  return {
    database: async () => {
      await clients.database`select 1`
    },
    redis: async () => {
      if (clients.redis.status === 'wait') {
        await clients.redis.connect()
      }
      await clients.redis.ping()
    },
    storage: async () => {
      await clients.storage.send(new HeadBucketCommand({ Bucket: bucket }))
    },
  }
}

export async function checkHealth(probes: HealthProbes): Promise<HealthReport> {
  const [database, redis, storage] = await Promise.all([
    probe(probes.database),
    probe(probes.redis),
    probe(probes.storage),
  ])

  return {
    api: 'ok',
    database,
    redis,
    storage,
  }
}

export function isHealthy(report: HealthReport) {
  return report.database === 'ok' && report.redis === 'ok' && report.storage === 'ok'
}

async function probe(operation: () => Promise<unknown>) {
  try {
    await operation()
    return 'ok'
  } catch (error) {
    return `error: ${error instanceof Error ? error.name : 'UnknownError'}`
  }
}
