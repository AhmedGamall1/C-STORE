import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { CartDrawer } from './CartDrawer'
import { MobileNav } from './MobileNav'
import { cn } from '@/lib/utils'
import { useCategories } from '@/hooks/useCategories'
import { useAuth } from '@/providers/AuthProvider'
import { useCart } from '@/hooks/useCart'

export function Navbar() {
  const { data: categories = [] } = useCategories()

  const { isAuthenticated, isAdmin } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const { cart } = useCart()
  const count = cart.totalItems

  const navLinks = [
    { to: '/shop', label: 'Shop All' },
    ...categories.map((c) => ({
      to: `/shop?category=${c.slug}`,
      label: c.name,
    })),
  ]

  const accountHref = isAdmin
    ? '/admin'
    : isAuthenticated
      ? '/account'
      : '/login'
  const AccountIcon = isAdmin ? ShieldCheck : isAuthenticated ? UserCheck : User

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="container-page flex h-16 items-center gap-4">
        {/* Mobile menu */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <MobileNav />
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <Logo />

        {/* Desktop nav */}
        <nav className="ml-6 hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium uppercase tracking-wider transition-colors hover:text-foreground',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Link to={accountHref} aria-label="Account">
            <Button variant="ghost" size="icon">
              <AccountIcon className="h-5 w-5" />
            </Button>
          </Link>
          <CartDrawer>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Open cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                  {count}
                </span>
              ) : null}
            </Button>
          </CartDrawer>
        </div>
      </div>

      {/* Search expand */}
      {searchOpen ? (
        <div className="border-t bg-background">
          <div className="container-page py-3">
            <div className="relative max-w-2xl mx-auto">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search products..."
                className="pl-10"
              />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
