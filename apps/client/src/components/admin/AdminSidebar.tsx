import { NavLink, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Tag,
  LogOut,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { Logo } from '@/components/common/Logo'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
]

export function AdminSidebar({ onNavigate }) {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAuth()

  const onSignOut = () =>
    logout()
      .then(() => {
        toast.success('Signed out')
        navigate('/', { replace: true })
      })
      .catch(() => undefined)

  return (
    <aside className="flex h-full flex-col gap-6 border-r bg-background p-6">
      <Logo />

      <nav>
        <ul className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-1 border-t pt-4">
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </NavLink>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        ) : null}
      </div>
    </aside>
  )
}
