import { z } from 'zod'

const USERNAME_PATTERN = /^[\p{L}\p{N}_]+$/u

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(USERNAME_PATTERN, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6).max(64),
})

// 对外响应只保留公开字段，避免密码哈希等数据库字段泄漏。
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
})

export type Credentials = z.infer<typeof credentialsSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
