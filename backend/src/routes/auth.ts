import type { FastifyPluginAsync, FastifyReply } from 'fastify'

import type { User } from '../repositories/users.js'
import { credentialsSchema, userResponseSchema } from '../schemas/auth.js'
import { issueToken, SESSION_COOKIE } from '../security/token.js'
import {
  type AuthService,
  InvalidCredentialsError,
  UsernameTakenError,
} from '../services/auth.js'

export interface AuthRouteConfig {
  jwtSecret: string
  jwtTtlHours: number
  isProduction: boolean
}

interface AuthRoutesOptions extends AuthRouteConfig {
  service: AuthService
}

async function startSession(
  reply: FastifyReply,
  user: User,
  config: AuthRouteConfig,
) {
  const token = await issueToken(user.id, config.jwtSecret, config.jwtTtlHours)
  reply.setCookie(SESSION_COOKIE, token, {
    maxAge: config.jwtTtlHours * 60 * 60,
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
  })

  return userResponseSchema.parse(user)
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, options) => {
  app.post('/register', async (request, reply) => {
    const credentials = credentialsSchema.safeParse(request.body)
    if (!credentials.success) {
      return reply.code(422).send({ message: '用户名或密码格式不正确' })
    }

    let user
    try {
      user = await options.service.register(
        credentials.data.username,
        credentials.data.password,
      )
    } catch (error) {
      if (error instanceof UsernameTakenError) {
        return reply.code(409).send({ message: '该用户名已被占用' })
      }
      throw error
    }

    return reply.code(201).send(await startSession(reply, user, options))
  })

  app.post('/login', async (request, reply) => {
    const credentials = credentialsSchema.safeParse(request.body)
    if (!credentials.success) {
      return reply.code(422).send({ message: '用户名或密码格式不正确' })
    }

    try {
      const user = await options.service.authenticate(
        credentials.data.username,
        credentials.data.password,
      )
      return reply.send(await startSession(reply, user, options))
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.code(401).send({ message: '用户名或密码错误' })
      }
      throw error
    }
  })

  app.get(
    '/me',
    { preHandler: app.requireCurrentUser },
    async (request) => userResponseSchema.parse(request.currentUser),
  )

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return reply.code(204).send()
  })
}
