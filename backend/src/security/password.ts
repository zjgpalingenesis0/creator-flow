import { compare, hash } from 'bcryptjs'

// cost 12 与当前安全强度要求匹配，同时避免本地登录等待时间过长。
const BCRYPT_COST = 12

/** 将明文密码转换为带随机盐的 bcrypt 哈希。 */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST)
}

/** 验证明文密码是否与已保存的 bcrypt 哈希匹配。 */
export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed)
}
