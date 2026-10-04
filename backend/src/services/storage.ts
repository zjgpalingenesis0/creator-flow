import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

export interface StorageCommandClient {
  send(command: HeadBucketCommand | CreateBucketCommand): Promise<unknown>
}

export async function ensureStorageBucket(
  client: StorageCommandClient,
  bucket: string,
): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch (error) {
    if (!isMissingBucket(error)) {
      throw error
    }

    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}

function isMissingBucket(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
    return true
  }

  const metadata = (error as Error & { $metadata?: { httpStatusCode?: number } }).$metadata
  return metadata?.httpStatusCode === 404
}
