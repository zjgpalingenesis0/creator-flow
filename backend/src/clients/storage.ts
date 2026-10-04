import { S3Client } from '@aws-sdk/client-s3'

import type { AppConfig } from '../config.js'

export function createStorageClient(config: AppConfig['storage']) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  })
}

export type StorageClient = ReturnType<typeof createStorageClient>
