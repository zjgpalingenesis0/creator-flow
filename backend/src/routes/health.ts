import type { FastifyPluginAsync } from 'fastify'

import { checkHealth, isHealthy, type HealthProbes } from '../services/health.js'

interface HealthRoutesOptions {
  probes: HealthProbes
}

export const healthRoutes: FastifyPluginAsync<HealthRoutesOptions> = async (app, options) => {
  app.get('/', async (_request, reply) => {
    const report = await checkHealth(options.probes)
    if (!isHealthy(report)) {
      reply.code(503)
    }
    return report
  })
}
