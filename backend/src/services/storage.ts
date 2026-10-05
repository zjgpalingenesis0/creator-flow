import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type StorageCommand =
  | HeadBucketCommand
  | CreateBucketCommand
  | PutObjectCommand
  | GetObjectCommand
  | DeleteObjectCommand

export interface StorageCommandClient {
  send(command: StorageCommand): Promise<unknown>
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

export async function putStorageObject(
  client: StorageCommandClient,
  bucket: string,
  key: string,
  data: Uint8Array,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  )
}

export async function getStorageObject(
  client: StorageCommandClient,
  bucket: string,
  key: string,
): Promise<Uint8Array> {
  const response = (await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  )) as { Body?: { transformToByteArray(): Promise<Uint8Array> } }

  if (!response.Body) {
    throw new Error('Storage object response has no body')
  }

  return response.Body.transformToByteArray()
}

export async function deleteStorageObject(
  client: StorageCommandClient,
  bucket: string,
  key: string,
): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export function createStorageSignedUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresIn = 900,
): Promise<string> {
  // 签名在本地完成，不会读取对象或向存储服务发送请求。
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })
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
