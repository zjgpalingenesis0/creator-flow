import type { preHandlerHookHandler } from 'fastify'

import type { User } from '../repositories/users.js'
import { readToken, SESSION_COOKIE } from '../security/token.js'
import type { AuthService } from '../services/auth.js'

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: User
  }

  interface FastifyInstance {
    requireCurrentUser: preHandlerHookHandler
  }
}

/** 验证 Session Token，并加载它对应的当前用户。 */
export async function resolveCurrentUser(
  token: string | undefined,
  jwtSecret: string,
  service: AuthService,
): Promise<User | null> {
  if (token === undefined) {
    return null
  }

  const userId = await readToken(token, jwtSecret)
  if (userId === null) {
    return null
  }

  return service.getById(userId)
}

/** 创建可复用的 Fastify 登录守卫，认证成功后写入 request.currentUser。 */
export function createRequireCurrentUser(
  service: AuthService,
  jwtSecret: string,
): preHandlerHookHandler {
  return async (request, reply) => {
    const user = await resolveCurrentUser(
      request.cookies[SESSION_COOKIE],
      jwtSecret,
      service,
    )
    if (user === null) {
      return reply.code(401).send({ message: '未登录或会话已过期' })
    }

    request.currentUser = user
  }
}
