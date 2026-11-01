import { Outlet, ScrollRestoration } from 'react-router'
import { Eye } from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { AdminSidebar } from './AdminSidebar'
import { AdminTopbar } from './AdminTopbar'

export function AdminLayout() {
  const { isAdmin } = useAuth()

  return (
    <div className="grid min-h-dvh lg:grid-cols-[240px_1fr]">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <div className="flex min-h-dvh flex-col">
        <AdminTopbar />
        {!isAdmin ? (
          <div className="flex items-center gap-2 border-b bg-accent px-4 py-2 text-sm font-medium text-accent-foreground sm:px-6 lg:px-8">
            <Eye className="h-4 w-4 shrink-0" />
            Demo mode — look around freely. Changes are disabled.
          </div>
        ) : null}
        <main className="flex-1 bg-secondary/20 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </div>
  )
}
