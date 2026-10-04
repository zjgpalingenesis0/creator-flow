import { z } from 'zod'

const environmentSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1),
  API_PORT: z.coerce.number().int().min(1).max(65_535),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true'),
  JWT_SECRET: z.string().min(32),
  JWT_TTL_HOURS: z.coerce.number().int().positive(),
})

export class ConfigError extends Error {
  override name = 'ConfigError'
}

export function loadConfig(environment: Record<string, string | undefined> = process.env) {
  const result = environmentSchema.safeParse(environment)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new ConfigError(`Invalid environment configuration: ${details}`)
  }

  const values = result.data
  return {
    appEnv: values.APP_ENV,
    isProduction: values.APP_ENV === 'production',
    api: {
      host: values.API_HOST,
      port: values.API_PORT,
    },
    databaseUrl: values.DATABASE_URL,
    redisUrl: values.REDIS_URL,
    storage: {
      endpoint: values.S3_ENDPOINT,
      accessKey: values.S3_ACCESS_KEY,
      secretKey: values.S3_SECRET_KEY,
      bucket: values.S3_BUCKET,
      region: values.S3_REGION,
      forcePathStyle: values.S3_FORCE_PATH_STYLE,
    },
    auth: {
      jwtSecret: values.JWT_SECRET,
      jwtTtlHours: values.JWT_TTL_HOURS,
    },
  }
}

export type AppConfig = ReturnType<typeof loadConfig>
