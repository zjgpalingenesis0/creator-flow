import type { User, UserRepository } from '../repositories/users.js'
import { hashPassword, verifyPassword } from '../security/password.js'

export interface PasswordSecurity {
  hash(plain: string): Promise<string>
  verify(plain: string, hashed: string): Promise<boolean>
}

export interface AuthService {
  register(username: string, password: string): Promise<User>
  authenticate(username: string, password: string): Promise<User>
  getById(id: string): Promise<User | null>
}

export class UsernameTakenError extends Error {
  override name = 'UsernameTakenError'

  constructor() {
    super('Username is already taken')
  }
}

export class InvalidCredentialsError extends Error {
  override name = 'InvalidCredentialsError'

  constructor() {
    super('Invalid username or password')
  }
}

const defaultPasswordSecurity: PasswordSecurity = {
  hash: hashPassword,
  verify: verifyPassword,
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}

export function createAuthService(
  repository: UserRepository,
  passwordSecurity: PasswordSecurity = defaultPasswordSecurity,
): AuthService {
  return {
    async register(username, password) {
      const passwordHash = await passwordSecurity.hash(password)

      try {
        return await repository.create({ username, passwordHash })
      } catch (error) {
        // PostgreSQL 23505 表示唯一约束冲突，此处将数据库错误转换为业务错误。
        if (isUniqueViolation(error)) {
          throw new UsernameTakenError()
        }
        throw error
      }
    },

    async authenticate(username, password) {
      const user = await repository.findByUsername(username)

      // 用户不存在与密码错误使用同一错误，避免泄露用户名是否已注册。
      if (user === null || !(await passwordSecurity.verify(password, user.passwordHash))) {
        throw new InvalidCredentialsError()
      }
      return user
    },

    getById(id) {
      return repository.findById(id)
    },
  }
}
