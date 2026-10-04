import type { FastifyPluginAsync } from 'fastify'

import type { HealthProbes } from '../services/health.js'
import { healthRoutes } from './health.js'

interface ApiRoutesOptions {
  healthProbes: HealthProbes
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
}
