import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowLeft,
  Check,
  Loader2,
  Package,
  Truck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '@/components/common/OrderStatusBadge'
import { ErrorView } from '@/components/common/ErrorView'
import { useCancelMyOrder, useMyOrder } from '@/hooks/useOrders'
import { formatDate, formatEGP, cn } from '@/lib/utils'

const STAGES = [
  { key: 'CONFIRMED', label: 'Confirmed', icon: Check },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'SHIPPED', label: 'Shipped', icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', icon: Check },
]

const STAGE_INDEX = {
  PENDING: -1,
  CONFIRMED: 0,
  PROCESSING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
}

export default function OrderDetailPage() {
  const { id } = useParams()
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyOrder(id)
  const cancelOrder = useCancelMyOrder()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !order) {
    return (
      <ErrorView
        error={error}
        onRetry={() => refetch()}
        homeHref="/account/orders"
        homeLabel="Back to orders"
        fallback={{
          title: 'Order not found',
          body: "We couldn't locate an order with that ID.",
          cta: 'home',
        }}
      />
    )
  }

  const cancelled = order.status === 'CANCELLED'
  const current = STAGE_INDEX[order.status] ?? -1
  const ref = order.orderNumber ? `#${order.orderNumber}` : order.id.slice(0, 8)
  const canCancel = order.status === 'PENDING'

  const handleCancel = async () => {
    try {
      await cancelOrder.mutateAsync(order.id)
      setConfirmOpen(false)
    } catch {
      // toast handled by hook
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All orders
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-bold tabular">{ref}</h2>
              <OrderStatusBadge status={order.status} />
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed {formatDate(order.createdAt)}
            </p>
          </div>
          {canCancel ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <XCircle className="h-4 w-4" />
              Cancel order
            </Button>
          ) : null}
        </div>
      </div>

      {/* Timeline */}
      {cancelled ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">
            This order was cancelled.
          </p>
          <p className="mt-1 text-destructive/80">
            No further action needed. Any authorized payment has been released.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border p-6">
          <div className="grid grid-cols-4 gap-3">
            {STAGES.map((s, i) => {
              const done = i < current
              const active = i === current
              const Icon = s.icon
              return (
                <div
                  key={s.key}
                  className="flex flex-col items-center text-center"
                >
                  <span
                    className={cn(
                      'grid h-10 w-10 place-items-center rounded-full border',
                      done || active
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={cn(
                      'mt-2 text-[10px] font-semibold uppercase tracking-[0.15em]',
                      done || active
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
          {order.status === 'PENDING' && order.reservedUntil ? (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Payment reserved until{' '}
              {new Date(order.reservedUntil).toLocaleString('en-GB')}.
            </p>
          ) : null}
        </div>
      )}

      {/* Items */}
      <section>
        <h3 className="font-display text-lg font-semibold uppercase tracking-wide">
          Items
        </h3>
        <ul className="mt-4 divide-y">
          {order.items.map((item) => {
            const product = item.productSize?.color?.product
            const imageUrl = item.productSize?.color?.imageUrl
            return (
              <li key={item.id} className="flex gap-4 py-4 first:pt-0">
                <div
                  className="h-20 w-16 shrink-0 overflow-hidden rounded-md border"
                  style={{ backgroundColor: item.colorHex || '#f4f4f4' }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product?.name ?? item.colorName}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {product?.name ?? item.colorName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.colorName} · Size {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular">
                  {formatEGP(Number(item.price) * item.quantity)}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Totals + Address */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Summary
          </h3>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={formatEGP(order.subtotal)} />
            <Row label="Shipping" value={formatEGP(order.shippingCost)} />
            <Separator className="my-2" />
            <Row
              label="Total"
              value={formatEGP(order.total)}
              className="text-base font-semibold"
            />
          </dl>
        </section>
        <section className="rounded-lg border p-6">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Shipping & payment
          </h3>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-medium">
                {(order.address?.city ?? order.shippingCity) || '—'}
                {(order.address?.governorate ?? order.shippingGovernorate)
                  ? `, ${order.address?.governorate ?? order.shippingGovernorate}`
                  : ''}
              </p>
              <p className="text-muted-foreground">
                {order.address?.street ?? order.shippingStreet}
              </p>
            </div>
            <Separator />
            <div>
              <p className="font-medium">
                {order.paymentMethod === 'PAYMOB'
                  ? 'Paymob (online card)'
                  : 'Cash on Delivery'}
              </p>
              {order.paymobOrderId ? (
                <p className="text-xs text-muted-foreground">
                  Paymob ref: {order.paymobOrderId}
                </p>
              ) : null}
            </div>
            {order.notes ? (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 text-sm">{order.notes}</p>
                </div>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={(v) => !cancelOrder.isPending && setConfirmOpen(v)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              We'll release the held stock immediately. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={cancelOrder.isPending}
            >
              Keep order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Cancel order'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value, className }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  )
}
