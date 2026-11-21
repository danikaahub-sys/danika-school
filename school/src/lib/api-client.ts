import { useAuthStore } from '@/stores/auth-store'
import { useSessionStore } from '@/stores/session-store'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/v1'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type Envelope<T> = {
  statusCode: number
  message: string
  data: T
}

let refreshing: Promise<boolean> | null = null

export async function api<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean; skipRefresh?: boolean } = {}
): Promise<T> {
  const { skipAuth, skipRefresh, ...rest } = init
  const headers = new Headers(rest.headers)
  if (!headers.has('Content-Type') && rest.body) {
    headers.set('Content-Type', 'application/json')
  }
  const auth = useAuthStore.getState().auth
  if (!skipAuth && auth.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`)
  }
  const yearId = useSessionStore.getState().yearId
  if (yearId) headers.set('X-Year-Id', yearId)

  const response = await fetch(`${API_URL}${path}`, { ...rest, headers })
  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const ok = await refreshSession()
    if (ok) return api<T>(path, { ...init, skipRefresh: true })
  }
  const payload = (await response.json().catch(() => ({}))) as Envelope<T> & {
    message?: string
  }
  if (!response.ok) {
    throw new ApiError(response.status, payload.message ?? 'request failed')
  }
  return payload.data
}

async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const { auth } = useAuthStore.getState()
      if (!auth.refreshToken) return false
      try {
        const tokens = await api<{ accessToken: string; refreshToken: string }>(
          '/auth/refresh',
          {
            method: 'POST',
            skipAuth: true,
            skipRefresh: true,
            headers: { Authorization: `Bearer ${auth.refreshToken}` },
          }
        )
        auth.setAccessToken(tokens.accessToken)
        auth.setRefreshToken(tokens.refreshToken)
        if (auth.schoolId) {
          const session = await api<{ accessToken: string }>(
            '/school/session',
            {
              method: 'POST',
              body: JSON.stringify({ schoolId: auth.schoolId }),
              skipRefresh: true,
            }
          )
          auth.setAccessToken(session.accessToken)
        }
        return true
      } catch {
        auth.reset()
        return false
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}
