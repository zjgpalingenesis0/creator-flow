import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'session'

const JWT_ALGORITHM = 'HS256'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

export async function issueToken(
  userId: string,
  secret: string,
  ttlHours: number,
): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1_000) + ttlHours * 60 * 60

  return new SignJWT()
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setExpirationTime(expiresAt)
    .sign(encodeSecret(secret))
}

export async function readToken(token: string, secret: string): Promise<string | null> {
  try {
    // 限定签名算法，避免接受非预期算法生成的 Token。
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [JWT_ALGORITHM],
    })

    return typeof payload.sub === 'string' && UUID_PATTERN.test(payload.sub) ? payload.sub : null
  } catch {
    // 无效、过期或损坏的会话统一按未登录处理。
    return null
  }
}
