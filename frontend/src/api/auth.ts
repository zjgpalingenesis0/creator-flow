import { api } from './client'

export interface Credentials {
  username: string
  password: string
}

export interface User {
  id: string
  username: string
}

export const authApi = {
  register: (body: Credentials) => api.post<User>('/auth/register', body),
  login: (body: Credentials) => api.post<User>('/auth/login', body),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
}
