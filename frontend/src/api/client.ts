export class ApiError extends Error {
  override name = 'ApiError'
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function createApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || `请求失败（${response.status}）`

  try {
    const body: unknown = await response.json()
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      message = body.message
    }
  } catch {
    // 错误响应不一定是 JSON，此时保留 HTTP 状态文本。
  }

  return new ApiError(message, response.status)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    // Session 使用同源 HttpOnly Cookie，不在前端读取或保存 JWT。
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw await createApiError(response)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

function jsonRequest<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) {
  return request<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => jsonRequest<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => jsonRequest<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => jsonRequest<T>('DELETE', path, body),
}
