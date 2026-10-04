import Fastify, { type FastifyServerOptions } from 'fastify'

import { apiRoutes } from './routes/index.js'
import type { HealthProbes } from './services/health.js'

export interface BuildAppOptions {
  healthProbes: HealthProbes
  logger?: FastifyServerOptions['logger']
}

export function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? true })

  app.register(apiRoutes, {
    prefix: '/api',
    healthProbes: options.healthProbes,
  })

  return app
}
