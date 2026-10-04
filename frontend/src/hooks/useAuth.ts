import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { authApi, type Credentials, type User } from '@/api/auth'

export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const

export function useCurrentUser() {
  const { data, isPending } = useQuery<User | null>({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: Infinity,
    throwOnError: false,
  })

  return {
    user: data ?? null,
    isLoading: isPending,
  }
}

export function useAuthActions() {
  const queryClient = useQueryClient()
  const cacheUser = (user: User) => {
    queryClient.setQueryData<User | null>(CURRENT_USER_QUERY_KEY, user)
  }

  const login = useMutation({
    mutationFn: (body: Credentials) => authApi.login(body),
    onSuccess: cacheUser,
  })
  const register = useMutation({
    mutationFn: (body: Credentials) => authApi.register(body),
    onSuccess: cacheUser,
  })
  const logout = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // 清除上一位用户相关的所有请求数据，再明确记录当前为未登录状态。
      queryClient.removeQueries()
      queryClient.setQueryData<User | null>(CURRENT_USER_QUERY_KEY, null)
    },
  })

  return { login, register, logout }
}
