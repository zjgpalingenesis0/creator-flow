import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import Fastify, { type FastifyServerOptions } from 'fastify'

import { createRequireCurrentUser } from './auth/current-user.js'
import type { AuthRouteConfig } from './routes/auth.js'
import { apiRoutes } from './routes/index.js'
import type { AssetService } from './services/assets.js'
import type { AuthService } from './services/auth.js'
import type { HealthProbes } from './services/health.js'
import { MAX_IMAGE_BYTES } from './services/images.js'

export interface BuildAppOptions {
  healthProbes: HealthProbes
  authService: AuthService
  assetService: AssetService
  createAssetUrl(storageKey: string): Promise<string>
  auth: AuthRouteConfig
  logger?: FastifyServerOptions['logger']
}

export function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? true })

  // 认证路由依赖 request.cookies、reply.setCookie() 和 reply.clearCookie()。
  app.register(cookie)
  app.register(multipart, {
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  })
  app.decorateRequest('currentUser')
  app.decorate(
    'requireCurrentUser',
    createRequireCurrentUser(options.authService, options.auth.jwtSecret),
  )

  app.register(apiRoutes, {
    prefix: '/api',
    healthProbes: options.healthProbes,
    authService: options.authService,
    assetService: options.assetService,
    createAssetUrl: options.createAssetUrl,
    auth: options.auth,
  })

  return app
}
