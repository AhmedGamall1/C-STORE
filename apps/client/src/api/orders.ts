import { api } from '@/lib/api'
import type {
  Order,
  Pagination,
  ListParams,
  OrderStatus,
  PaymentMethod,
} from '@/types/api'

export interface CreateOrderPayload {
  items: { productSizeId: string; quantity: number }[]
  paymentMethod?: PaymentMethod
  notes?: string
  clearCart?: boolean
  addressId?: string
  guest?: { name: string; phone: string; email?: string }
  shippingAddress?: { street: string; city: string; governorate: string }
}

interface CreateOrderResult {
  order: Order
  iframeUrl?: string
}

export type PaymentStatusResult = Pick<
  Order,
  'id' | 'orderNumber' | 'status' | 'paymentStatus' | 'paymentMethod'
>

// GET /api/orders/:id/payment-status — public (guests too); status fields only.
export async function getPaymentStatus(
  id: string
): Promise<PaymentStatusResult> {
  const res = await api.get<{ data: { order: PaymentStatusResult } }>(
    `/orders/${id}/payment-status`
  )
  return res.data.order
}

// POST /api/orders — works for both authenticated users (addressId) and
// guests (guest + shippingAddress). Returns the created order, plus an
// iframeUrl when paymentMethod=PAYMOB.
//
// `idempotencyKey` (a UUID, same value across retries of one submit) goes in the
// Idempotency-Key header so a double-click / network retry replays the FIRST
// response instead of creating a second order.
export async function createOrder(
  payload: CreateOrderPayload,
  idempotencyKey: string
): Promise<CreateOrderResult> {
  const res = await api.post<{ data: CreateOrderResult }>('/orders', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return res.data
}

// GET /api/orders/admin — admin-only, paginated
export async function getAdminOrders(
  params: ListParams = {}
): Promise<{ orders: Order[]; pagination: Pagination }> {
  const res = await api.get<{
    data: { orders: Order[]; pagination: Pagination }
  }>('/orders/admin', { params })
  return { orders: res.data.orders, pagination: res.data.pagination }
}

// GET /api/orders/admin/:id — admin-only single order
export async function getAdminOrder(id: string): Promise<Order> {
  const res = await api.get<{ data: { order: Order } }>(`/orders/admin/${id}`)
  return res.data.order
}

// PATCH /api/orders/:id/status — admin-only (server enforces transitions)
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order> {
  const res = await api.patch<{ data: { order: Order } }>(
    `/orders/${id}/status`,
    { status }
  )
  return res.data.order
}

// GET /api/orders — current user's orders
export async function getMyOrders(): Promise<Order[]> {
  const res = await api.get<{ data: { orders: Order[] } }>('/orders')
  return res.data.orders
}

// GET /api/orders/:id — current user's order (server checks ownership)
export async function getMyOrder(id: string): Promise<Order> {
  const res = await api.get<{ data: { order: Order } }>(`/orders/${id}`)
  return res.data.order
}

// PATCH /api/orders/:id/cancel — cancel a PENDING order owned by the user
export async function cancelMyOrder(id: string): Promise<Order> {
  const res = await api.patch<{ data: { order: Order } }>(
    `/orders/${id}/cancel`
  )
  return res.data.order
}
