import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createOrder,
  getAdminOrders,
  getAdminOrder,
  updateOrderStatus,
  getMyOrders,
  getMyOrder,
  cancelMyOrder,
  getPaymentStatus,
  type CreateOrderPayload,
  type PaymentStatusResult,
} from '@/api/orders'
import { clearGuestCart } from '@/lib/guestCart'
import type { ListParams, OrderStatus } from '@/types/api'

export interface CreateOrderVars {
  payload: CreateOrderPayload
  idempotencyKey: string
}

// Admin: paginated list of all orders
// (page, limit, status, paymentStatus, paymentMethod, q).
export function useAdminOrders(filters: ListParams = {}) {
  return useQuery({
    queryKey: ['orders', 'admin', filters],
    queryFn: () => getAdminOrders(filters),
    placeholderData: (prev) => prev,
  })
}

// Admin: single order detail.
export function useAdminOrder(id?: string) {
  return useQuery({
    queryKey: ['order', 'admin', id],
    queryFn: () => getAdminOrder(id!),
    enabled: Boolean(id),
  })
}

// Admin: update order status. Server validates the transition.
export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: (order) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order', 'admin', order.id] })
      toast.success(`Order moved to ${order.status.toLowerCase()}`)
    },
  })
}

// Customer / guest: place an order. The server clears the authenticated user's
// cart when `clearCart: true` is sent; for guests we drop the localStorage cart
// on success here.
export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    // The key lives in the variables, so any retry of THIS mutation replays the
    // exact same Idempotency-Key (idempotent retry).
    mutationFn: ({ payload, idempotencyKey }: CreateOrderVars) =>
      createOrder(payload, idempotencyKey),
    // CheckoutPage owns error UX here — it keeps the duplicate-in-flight 409
    // quiet — so don't let the global handler toast it.
    meta: { silentError: true },
    onSuccess: (_data, { payload }) => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      if (payload.clearCart) {
        qc.invalidateQueries({ queryKey: ['cart'] })
        clearGuestCart()
      }
    },
  })
}

// Customer: my orders list.
export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: getMyOrders,
  })
}

// Customer: my order detail (server checks ownership).
export function useMyOrder(id?: string) {
  return useQuery({
    queryKey: ['order', 'mine', id],
    queryFn: () => getMyOrder(id!),
    enabled: Boolean(id),
  })
}

const PAYMENT_POLL_MS = 2_000

// Settled = the webhook already decided: paid, or cancelled (declined/expired).
export const isPaymentSettled = (order?: PaymentStatusResult) =>
  order?.paymentStatus === 'PAID' || order?.status === 'CANCELLED'

// Payment result page: ask every 2s until the webhook settles the order.
// `poll` lets the page stop asking after a timeout.
export function usePaymentStatus(id?: string, poll = true) {
  return useQuery({
    queryKey: ['order', 'payment-status', id],
    queryFn: () => getPaymentStatus(id!),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      poll && !isPaymentSettled(query.state.data) ? PAYMENT_POLL_MS : false,
  })
}

// Customer: cancel a PENDING order.
export function useCancelMyOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelMyOrder,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['order'] })
      toast.success('Order cancelled')
    },
  })
}
