import { createContext, useContext, useEffect, type ReactNode } from 'react'
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query'
import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from '@/api/auth'
import { mergeCart } from '@/api/cart'
import { setCanEditCatalog, setSessionExpiredHandler } from '@/lib/api'
import { getGuestItems, clearGuestCart } from '@/lib/guestCart'
import type { User } from '@/types/api'

type LoginVars = { email: string; password: string }
type RegisterVars = {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  login: UseMutationResult<User, Error, LoginVars>['mutateAsync']
  register: UseMutationResult<User, Error, RegisterVars>['mutateAsync']
  logout: UseMutationResult<unknown, Error, void>['mutateAsync']
  loginState: UseMutationResult<User, Error, LoginVars>
  registerState: UseMutationResult<User, Error, RegisterVars>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Merge anything the user added as a guest into their server cart. Silent no-op
// when there's nothing to merge; on failure we keep the guest items in
// localStorage so the user can retry instead of losing their cart.
// The global error handler will toast the actual API error; we just don't
// rethrow so login itself succeeds either way.
async function mergeGuestIntoServer(queryClient: QueryClient): Promise<void> {
  const items = getGuestItems()
  if (items.length === 0) return
  try {
    const cart = await mergeCart(items)
    clearGuestCart()
    queryClient.setQueryData(['cart'], cart)
  } catch {
    /* handled globally */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // When BOTH cookies are invalid, the api layer's refresh attempt fails and
  // calls this to drop the cached identity, so the UI flips to "logged out"
  // immediately (the global handler also redirects to /login for that request).
  useEffect(() => {
    setSessionExpiredHandler(() => queryClient.setQueryData(['me'], null))
    return () => setSessionExpiredHandler(null)
  }, [queryClient])

  // The single source of truth for "who's logged in".
  // 401 is expected (guest); don't retry and don't surface it as an error.
  const {
    data: user,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    retry: false,
    staleTime: 5 * 60_000, // 5 min — user identity doesn't change often
    throwOnError: false,
    // 401 here is the normal guest path — don't toast or redirect.
    meta: { silent401: true, silentError: true },
  })

  const isAdmin = user?.role === 'ADMIN'
  useEffect(() => setCanEditCatalog(isAdmin), [isAdmin])

  const loginMutation = useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      queryClient.setQueryData(['me'], data)
      await mergeGuestIntoServer(queryClient)
    },
  })

  const registerMutation = useMutation({
    mutationFn: registerApi,
    onSuccess: async (data) => {
      queryClient.setQueryData(['me'], data)
      await mergeGuestIntoServer(queryClient)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(['me'], null)
      queryClient.clear()
    },
  })

  const value: AuthContextValue = {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isAdmin,
    isLoading: isLoading && !isFetched, // only true on the very first load
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    loginState: loginMutation,
    registerState: registerMutation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
