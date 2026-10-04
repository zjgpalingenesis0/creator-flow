import cookie from '@fastify/cookie'
import Fastify, { type FastifyServerOptions } from 'fastify'

import { createRequireCurrentUser } from './auth/current-user.js'
import type { AuthRouteConfig } from './routes/auth.js'
import { apiRoutes } from './routes/index.js'
import type { AuthService } from './services/auth.js'
import type { HealthProbes } from './services/health.js'

export interface BuildAppOptions {
  healthProbes: HealthProbes
  authService: AuthService
  auth: AuthRouteConfig
  logger?: FastifyServerOptions['logger']
}

export function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? true })

  // 认证路由依赖 request.cookies、reply.setCookie() 和 reply.clearCookie()。
  app.register(cookie)
  app.decorateRequest('currentUser')
  app.decorate(
    'requireCurrentUser',
    createRequireCurrentUser(options.authService, options.auth.jwtSecret),
  )

  app.register(apiRoutes, {
    prefix: '/api',
    healthProbes: options.healthProbes,
    authService: options.authService,
    auth: options.auth,
  })

  return app
}
