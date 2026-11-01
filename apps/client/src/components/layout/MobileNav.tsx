import { Link } from 'react-router'
import { LayoutDashboard } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Separator } from '@/components/ui/separator'
import { useCategories } from '@/hooks/useCategories'

export function MobileNav() {
  const { data: categories = [] } = useCategories()
  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-4">
        <Logo />
      </div>
      <Separator />
      <nav className="flex-1 overflow-y-auto p-6">
        <Link
          to="/admin"
          className="mb-4 flex items-center gap-2 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          <LayoutDashboard className="h-4 w-4" />
          Admin dashboard (demo)
        </Link>
        <div className="space-y-1">
          <Link
            to="/shop"
            className="block rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider hover:bg-secondary"
          >
            Shop All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop?category=${c.slug}`}
              className="block rounded-md px-3 py-2 text-sm font-medium uppercase tracking-wider hover:bg-secondary"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1 text-sm">
          <Link
            to="/account"
            className="block px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            My Account
          </Link>
          <Link
            to="/account/orders"
            className="block px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            My Orders
          </Link>
          <Link
            to="/account/addresses"
            className="block px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            Addresses
          </Link>
        </div>

        <Separator className="my-4" />

        <div className="space-y-1 text-sm">
          <Link
            to="/login"
            className="block px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="block px-3 py-2 text-muted-foreground hover:text-foreground"
          >
            Create Account
          </Link>
        </div>
      </nav>
    </div>
  )
}
