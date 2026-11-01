import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { toApiError } from './errors/parse'
import { ApiError } from './errors/ApiError'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // send + receive the httpOnly access/refresh cookies
  timeout: 15000,
})

// ── Admin demo guard ───────────────────────────────────
// Non-admins can browse the admin panel. Their admin writes would only bounce
// off the server (401 → login redirect), so stop them here with a clear toast.
const ADMIN_WRITE = /^\/(products|categories)(\/|$)|^\/orders\/[^/]+\/status$/
let canEditCatalog = false
export function setCanEditCatalog(value: boolean): void {
  canEditCatalog = value
}

instance.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (
    method !== 'get' &&
    !canEditCatalog &&
    ADMIN_WRITE.test(config.url ?? '')
  ) {
    return Promise.reject(
      new ApiError({
        status: 403,
        code: 'DEMO_READ_ONLY',
        message: 'Demo mode: changes are disabled.',
      })
    )
  }
  return config
})

// A 401 from these endpoints is a genuine auth failure (bad credentials, or a
// missing/expired refresh cookie) — NOT an expired access token. Never try to
// refresh for them, or we'd loop.
const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
]
const isAuthEndpoint = (url: string): boolean =>
  AUTH_ENDPOINTS.some((path) => url.includes(path))

// `_retry` marks a request we've already replayed once, so a second 401 on the
// same request can't trigger an endless refresh→retry loop.
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

// ── Single-flight refresh ──────────────────────────────
// If several requests 401 at the same time, they all await the SAME refresh
// call instead of firing a stampede of POST /auth/refresh requests.
let refreshPromise: Promise<void> | null = null

function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = instance
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

// Lets the AuthProvider drop the cached user when the session is truly gone,
// without this module having to depend on React Query.
let onSessionExpired: (() => void) | null = null
export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn
}

instance.interceptors.response.use(
  // Unwrap the body so every call resolves to the API payload directly
  // (not an AxiosResponse).
  (response) => response.data,
  async (error: AxiosError) => {
    // Already an ApiError (the demo guard above): pass it through untouched.
    if (error instanceof ApiError) return Promise.reject(error)

    const original = error.config as RetryableConfig | undefined
    const status = error.response?.status

    // Only an expired/missing access token on a normal request is refreshable.
    if (
      status !== 401 ||
      !original ||
      original._retry ||
      isAuthEndpoint(original.url ?? '')
    ) {
      return Promise.reject(toApiError(error))
    }

    original._retry = true

    try {
      await refreshSession()
    } catch {
      // Refresh failed → the session is over. Drop the cached user now; the
      // global error handler (lib/errors/handler) turns this 401 into a toast +
      // a single redirect to /login, and stays silent for guest /me.
      onSessionExpired?.()
      return Promise.reject(toApiError(error))
    }

    // New cookies are set — replay the original request exactly once.
    return instance(original)
  }
)

// The response interceptor unwraps `response.data`, so every call resolves to
// the API body directly (not an AxiosResponse). This typed facade reflects that.
export interface ApiClient {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>
  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>
  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
}

export const api = instance as unknown as ApiClient
