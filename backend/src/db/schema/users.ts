import { pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    username: varchar('username', { length: 32 }).notNull(),
    passwordHash: varchar('password_hash', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('ix_users_username').on(table.username)],
)
