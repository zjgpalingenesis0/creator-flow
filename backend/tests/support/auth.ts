import type { AuthService } from '../../src/services/auth.js'

const unusedAuthService: AuthService = {
  async register() {
    throw new Error('Auth service is not used in this test')
  },
  async authenticate() {
    throw new Error('Auth service is not used in this test')
  },
  async getById() {
    return null
  },
}

export const testAuthOptions = {
  authService: unusedAuthService,
  auth: {
    jwtSecret: 'test-secret-that-is-at-least-32-characters',
    jwtTtlHours: 24,
    isProduction: false,
  },
}
