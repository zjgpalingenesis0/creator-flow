import type { FastifyPluginAsync } from 'fastify'

import type { HealthProbes } from '../services/health.js'
import type { AuthService } from '../services/auth.js'
import { authRoutes, type AuthRouteConfig } from './auth.js'
import { healthRoutes } from './health.js'

interface ApiRoutesOptions {
  healthProbes: HealthProbes
  authService: AuthService
  auth: AuthRouteConfig
}

export const apiRoutes: FastifyPluginAsync<ApiRoutesOptions> = async (app, options) => {
  app.get(
    '/',
    {
      prefixTrailingSlash: 'both',
    },
    async () => ({ name: 'CreatorFlow API' }),
  )

  await app.register(healthRoutes, {
    prefix: '/health',
    probes: options.healthProbes,
  })

  await app.register(authRoutes, {
    prefix: '/auth',
    service: options.authService,
    ...options.auth,
  })
}
