import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import { users } from '../db/schema/users.js'

export type User = typeof users.$inferSelect
export type UserDatabase = Pick<PostgresJsDatabase, 'insert' | 'select'>

export interface CreateUserInput {
  username: string
  passwordHash: string
}

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>
  findByUsername(username: string): Promise<User | null>
  findById(id: string): Promise<User | null>
}

export function createUserRepository(
  database: UserDatabase,
  generateId: () => string = randomUUID,
): UserRepository {
  return {
    async create(input) {
      const [user] = await database
        .insert(users)
        .values({ id: generateId(), ...input })
        .returning()

      if (!user) {
        throw new Error('Database did not return the created user')
      }
      return user
    },

    async findByUsername(username) {
      const [user] = await database
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1)

      return user ?? null
    },

    async findById(id) {
      const [user] = await database.select().from(users).where(eq(users.id, id)).limit(1)

      return user ?? null
    },
  }
}
