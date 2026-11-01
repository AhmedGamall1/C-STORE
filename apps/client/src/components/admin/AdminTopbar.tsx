import { Bell, Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AdminSidebar } from './AdminSidebar'
import { useAuth } from '@/providers/AuthProvider'

export function AdminTopbar() {
  const { user } = useAuth()
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ')
  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/90 px-4 backdrop-blur lg:px-8">
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <AdminSidebar />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search orders, products…" className="pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3 border-l pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">
            {initials}
          </span>
        </div>
      </div>
    </header>
  )
}
