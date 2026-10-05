import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

import {
  createStorageSignedUrl,
  deleteStorageObject,
  ensureStorageBucket,
  getStorageObject,
  putStorageObject,
  type StorageCommandClient,
} from '../src/services/storage.js'

describe('ensureStorageBucket', () => {
  it('does not create a bucket that already exists', async () => {
    const commands: unknown[] = []
    const client: StorageCommandClient = {
      send: async (command) => {
        commands.push(command)
        return {}
      },
    }

    await ensureStorageBucket(client, 'creator-flow')

    assert.equal(commands.length, 1)
    assert.ok(commands[0] instanceof HeadBucketCommand)
  })

  it('creates a missing bucket', async () => {
    const commands: unknown[] = []
    const client: StorageCommandClient = {
      send: async (command) => {
        commands.push(command)
        if (command instanceof HeadBucketCommand) {
          const error = new Error('missing')
          error.name = 'NotFound'
          throw error
        }
        return {}
      },
    }

    await ensureStorageBucket(client, 'creator-flow')

    assert.equal(commands.length, 2)
    assert.ok(commands[0] instanceof HeadBucketCommand)
    assert.ok(commands[1] instanceof CreateBucketCommand)
    assert.equal((commands[1] as CreateBucketCommand).input.Bucket, 'creator-flow')
  })

  it('rethrows errors that do not mean the bucket is missing', async () => {
    const client: StorageCommandClient = {
      send: async () => {
        const error = new Error('forbidden')
        error.name = 'AccessDenied'
        throw error
      },
    }

    await assert.rejects(
      ensureStorageBucket(client, 'creator-flow'),
      (error: Error) => error.name === 'AccessDenied',
    )
  })
})

describe('storage objects', () => {
  it('puts bytes with their content type', async () => {
    const commands: unknown[] = []
    const client: StorageCommandClient = {
      send: async (command) => {
        commands.push(command)
        return {}
      },
    }
    const data = new Uint8Array([1, 2, 3])

    await putStorageObject(client, 'creator-flow', 'users/user-1/image.png', data, 'image/png')

    assert.equal(commands.length, 1)
    assert.ok(commands[0] instanceof PutObjectCommand)
    assert.deepEqual(commands[0].input, {
      Bucket: 'creator-flow',
      Key: 'users/user-1/image.png',
      Body: data,
      ContentType: 'image/png',
    })
  })

  it('gets object bytes', async () => {
    const commands: unknown[] = []
    const data = new Uint8Array([4, 5, 6])
    const client: StorageCommandClient = {
      send: async (command) => {
        commands.push(command)
        return { Body: { transformToByteArray: async () => data } }
      },
    }

    const result = await getStorageObject(client, 'creator-flow', 'users/user-1/image.png')

    assert.deepEqual(result, data)
    assert.ok(commands[0] instanceof GetObjectCommand)
    assert.deepEqual((commands[0] as GetObjectCommand).input, {
      Bucket: 'creator-flow',
      Key: 'users/user-1/image.png',
    })
  })

  it('deletes an object', async () => {
    const commands: unknown[] = []
    const client: StorageCommandClient = {
      send: async (command) => {
        commands.push(command)
        return {}
      },
    }

    await deleteStorageObject(client, 'creator-flow', 'users/user-1/image.png')

    assert.ok(commands[0] instanceof DeleteObjectCommand)
    assert.deepEqual((commands[0] as DeleteObjectCommand).input, {
      Bucket: 'creator-flow',
      Key: 'users/user-1/image.png',
    })
  })

  it('creates a short-lived signed download URL without a network request', async () => {
    const client = new S3Client({
      endpoint: 'http://localhost:7313',
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId: 'creator_flow', secretAccessKey: 'creator_flow_dev' },
    })

    const url = await createStorageSignedUrl(
      client,
      'creator-flow',
      'users/user-1/image.png',
      120,
    )

    assert.match(url, /^http:\/\/localhost:7313\/creator-flow\/users\/user-1\/image\.png\?/)
    assert.match(url, /X-Amz-Signature=/)
    assert.match(url, /X-Amz-Expires=120/)
    client.destroy()
  })
})
