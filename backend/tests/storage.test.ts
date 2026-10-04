import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3'

import { ensureStorageBucket, type StorageCommandClient } from '../src/services/storage.js'

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
