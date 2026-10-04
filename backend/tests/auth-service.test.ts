import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { User, UserRepository } from '../src/repositories/users.js'
import {
  createAuthService,
  InvalidCredentialsError,
  UsernameTakenError,
  type PasswordSecurity,
} from '../src/services/auth.js'

const USER_ID = '9cb48148-6219-4c15-bd7b-3f75ac82d7de'

const storedUser: User = {
  id: USER_ID,
  username: 'demo_user',
  passwordHash: 'hashed-password',
  createdAt: new Date('2026-10-04T00:00:00.000Z'),
}

function createRepositoryDouble(overrides: Partial<UserRepository> = {}) {
  const calls = {
    create: [] as Array<{ username: string; passwordHash: string }>,
    usernames: [] as string[],
    ids: [] as string[],
  }

  const repository: UserRepository = {
    async create(input) {
      calls.create.push(input)
      return storedUser
    },
    async findByUsername(username) {
      calls.usernames.push(username)
      return storedUser
    },
    async findById(id) {
      calls.ids.push(id)
      return storedUser
    },
    ...overrides,
  }

  return { repository, calls }
}

function createPasswordSecurityDouble(verifyResult = true) {
  const calls = {
    hashed: [] as string[],
    verified: [] as Array<{ plain: string; hashed: string }>,
  }

  const passwordSecurity: PasswordSecurity = {
    async hash(plain) {
      calls.hashed.push(plain)
      return 'hashed-password'
    },
    async verify(plain, hashed) {
      calls.verified.push({ plain, hashed })
      return verifyResult
    },
  }

  return { passwordSecurity, calls }
}

describe('createAuthService', () => {
  it('hashes the password and creates a user during registration', async () => {
    const { repository, calls: repositoryCalls } = createRepositoryDouble()
    const { passwordSecurity, calls: passwordCalls } = createPasswordSecurityDouble()
    const service = createAuthService(repository, passwordSecurity)

    const user = await service.register('demo_user', 'secret123')

    assert.deepEqual(passwordCalls.hashed, ['secret123'])
    assert.deepEqual(repositoryCalls.create, [
      { username: 'demo_user', passwordHash: 'hashed-password' },
    ])
    assert.deepEqual(user, storedUser)
  })

  it('converts PostgreSQL unique violations into UsernameTakenError', async () => {
    const { repository } = createRepositoryDouble({
      async create() {
        throw { code: '23505' }
      },
    })
    const { passwordSecurity } = createPasswordSecurityDouble()
    const service = createAuthService(repository, passwordSecurity)

    await assert.rejects(service.register('demo_user', 'secret123'), UsernameTakenError)
  })

  it('preserves database errors other than unique violations', async () => {
    const databaseError = Object.assign(new Error('database unavailable'), { code: '08006' })
    const { repository } = createRepositoryDouble({
      async create() {
        throw databaseError
      },
    })
    const { passwordSecurity } = createPasswordSecurityDouble()
    const service = createAuthService(repository, passwordSecurity)

    await assert.rejects(service.register('demo_user', 'secret123'), (error) => {
      assert.equal(error, databaseError)
      return true
    })
  })

  it('authenticates an existing user with the correct password', async () => {
    const { repository, calls: repositoryCalls } = createRepositoryDouble()
    const { passwordSecurity, calls: passwordCalls } = createPasswordSecurityDouble()
    const service = createAuthService(repository, passwordSecurity)

    const user = await service.authenticate('demo_user', 'secret123')

    assert.deepEqual(repositoryCalls.usernames, ['demo_user'])
    assert.deepEqual(passwordCalls.verified, [
      { plain: 'secret123', hashed: 'hashed-password' },
    ])
    assert.deepEqual(user, storedUser)
  })

  it('rejects authentication when the username does not exist', async () => {
    const { repository } = createRepositoryDouble({
      async findByUsername() {
        return null
      },
    })
    const { passwordSecurity, calls } = createPasswordSecurityDouble()
    const service = createAuthService(repository, passwordSecurity)

    await assert.rejects(
      service.authenticate('missing_user', 'secret123'),
      InvalidCredentialsError,
    )
    assert.deepEqual(calls.verified, [])
  })

  it('rejects authentication when the password is incorrect', async () => {
    const { repository } = createRepositoryDouble()
    const { passwordSecurity } = createPasswordSecurityDouble(false)
    const service = createAuthService(repository, passwordSecurity)

    await assert.rejects(
      service.authenticate('demo_user', 'wrong-password'),
      InvalidCredentialsError,
    )
  })

  it('loads the current user by ID', async () => {
    const { repository, calls } = createRepositoryDouble()
    const { passwordSecurity } = createPasswordSecurityDouble()
    const service = createAuthService(repository, passwordSecurity)

    assert.deepEqual(await service.getById(USER_ID), storedUser)
    assert.deepEqual(calls.ids, [USER_ID])
  })
})
