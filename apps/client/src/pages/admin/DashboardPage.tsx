import { Link } from 'react-router'
import {
  ArrowRight,
  Clock,
  DollarSign,
  Loader2,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/admin/StatCard'
import { ErrorView } from '@/components/common/ErrorView'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/common/OrderStatusBadge'
import { useDashboardStats } from '@/hooks/useDashboard'
import { formatDate, formatEGP } from '@/lib/utils'

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useDashboardStats()

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Overview
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/orders">
            View all orders
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <ErrorView
          error={error}
          onRetry={() => refetch()}
          fallback={{
            title: 'Could not load the dashboard',
            body: 'Please try again in a moment.',
            cta: 'retry',
          }}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Revenue (paid)"
              value={formatEGP(data.kpis.revenue)}
              icon={DollarSign}
            />
            <StatCard
              label="Orders"
              value={data.kpis.totalOrders}
              icon={ShoppingBag}
            />
            <StatCard
              label="Pending orders"
              value={data.kpis.pendingOrders}
              icon={Clock}
            />
            <StatCard
              label="Customers"
              value={data.kpis.customers}
              icon={Users}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-lg border bg-background xl:col-span-2">
              <header className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Recent orders
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Latest 5 across all statuses
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/orders">
                    All
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </header>
              <ul className="divide-y">
                {data.recentOrders.length === 0 ? (
                  <li className="p-5 text-sm text-muted-foreground">
                    No orders yet.
                  </li>
                ) : (
                  data.recentOrders.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-secondary/30"
                    >
                      <div>
                        <Link
                          to={`/admin/orders/${o.id}`}
                          className="font-semibold tabular hover:underline"
                        >
                          #{o.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {o.customerName ?? 'Guest'} ·{' '}
                          {formatDate(o.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={o.status} />
                        <PaymentStatusBadge status={o.paymentStatus} />
                      </div>
                      <p className="font-semibold tabular">
                        {formatEGP(o.total)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-lg border bg-background">
              <header className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Low stock
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    10 or fewer left · {data.kpis.activeProducts} active
                    products
                  </p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </header>
              <ul className="divide-y">
                {data.lowStock.length === 0 ? (
                  <li className="p-5 text-sm text-muted-foreground">
                    All sizes well stocked.
                  </li>
                ) : (
                  data.lowStock.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 p-4 hover:bg-secondary/30"
                    >
                      <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                        <img
                          src={s.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/products/${s.productId}`}
                          className="block truncate text-sm font-medium capitalize hover:underline"
                        >
                          {s.productName.toLowerCase()}
                        </Link>
                        <p className="text-xs capitalize text-muted-foreground">
                          {s.colorName.toLowerCase()} · {s.size}
                        </p>
                      </div>
                      <span
                        className={
                          s.stock === 0
                            ? 'text-xs font-semibold uppercase text-red-600'
                            : 'tabular text-sm font-semibold'
                        }
                      >
                        {s.stock === 0 ? 'Sold out' : s.stock}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
