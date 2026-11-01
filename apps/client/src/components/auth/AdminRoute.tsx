import { Outlet } from 'react-router'
import { useAuth } from '@/providers/AuthProvider'

// Anyone can open the admin panel as a read-only demo; only admins can change
// things (the server enforces it, the api layer blocks the requests early).
export function AdminRoute() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="h-4 w-32 animate-pulse rounded bg-secondary" />
      </div>
    )
  }

  return <Outlet />
}
