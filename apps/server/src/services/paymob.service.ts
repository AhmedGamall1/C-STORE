import crypto from 'crypto'
import type { User } from '@prisma/client'
import AppError from '../utils/AppError.js'
import { env } from '../config/env.js'
import * as orderRepo from '../repositories/order.repository.js'
import { releaseUnpaidOrder } from './order.service.js'

const PAYMOB_API_URL = 'https://accept.paymob.com/api'

// The payment link must die BEFORE the stock reservation does, or a customer
// could pay for an order the expiry job has already cancelled.
const PAYMENT_LINK_BUFFER_SECONDS = 120

// The 20 fields Paymob signs, in Paymob's order, as the browser redirect sends
// them: flat query keys ("order", "source_data.pan").
const REDIRECT_HMAC_KEYS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
]

type OrderForPayment = NonNullable<
  Awaited<ReturnType<typeof orderRepo.findByIdWithOrderInclude>>
>

interface BillingData {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  street?: string | null
  city?: string | null
  governorate?: string | null
}

// Paymob sends a large flat payload; we only read a handful of fields by name.
interface PaymobWebhookBody {
  obj: {
    order?: { id?: number | string }
    source_data?: Record<string, unknown>
    pending?: boolean
    success?: boolean
    [key: string]: unknown
  }
}

const getAuthToken = async (): Promise<string> => {
  const res = await fetch(`${PAYMOB_API_URL}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: env.PAYMOB_API_KEY }),
  })

  const data = (await res.json()) as { token?: string }
  if (!res.ok || !data.token) {
    throw new AppError('Paymob authentication failed', 502)
  }
  return data.token
}

const registerOrder = async (
  authToken: string,
  amountCents: number,
  internalOrderId: string
): Promise<number> => {
  const res = await fetch(`${PAYMOB_API_URL}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: 'EGP',
      merchant_order_id: internalOrderId,
      items: [],
    }),
  })

  const data = (await res.json()) as { id?: number }
  if (!res.ok || !data.id) {
    throw new AppError('Failed to register order with Paymob', 502)
  }
  return data.id
}

const getPaymentKey = async (
  authToken: string,
  paymobOrderId: number,
  amountCents: number,
  billing: BillingData,
  expiresInSeconds: number
): Promise<string> => {
  const res = await fetch(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token: authToken,
      amount_cents: amountCents,
      expiration: expiresInSeconds,
      order_id: paymobOrderId,
      billing_data: {
        first_name: billing.firstName,
        last_name: billing.lastName,
        email: billing.email,
        phone_number: billing.phone || 'N/A',
        apartment: 'N/A',
        floor: 'N/A',
        street: billing.street || 'N/A',
        building: 'N/A',
        shipping_method: 'PKG',
        postal_code: 'N/A',
        city: billing.city || billing.governorate,
        country: 'EG',
        state: billing.governorate,
      },
      currency: 'EGP',
      integration_id: Number(env.PAYMOB_INTEGRATION_ID),
    }),
  })

  const data = (await res.json()) as { token?: string }
  if (!res.ok || !data.token) {
    throw new AppError('Failed to generate Paymob payment key', 502)
  }
  return data.token
}

const buildBillingData = (
  order: OrderForPayment,
  user: User | null | undefined
): BillingData => {
  if (user) {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      street: order.address?.street,
      city: order.address?.city,
      governorate: order.address?.governorate,
    }
  }

  const nameParts = (order.guestName ?? '').trim().split(/\s+/)
  return {
    firstName: nameParts[0] || 'Guest',
    lastName: nameParts.slice(1).join(' ') || 'Customer',
    email: order.guestEmail,
    phone: order.guestPhone,
    street: order.shippingStreet,
    city: order.shippingCity,
    governorate: order.shippingGovernorate,
  }
}

export const initiatePaymobPayment = async (
  order: OrderForPayment,
  user: User | null | undefined
) => {
  // Paymob works in cents (EGP × 100) and needs an integer.
  const amountCents = Math.round(Number(order.total) * 100)

  const secondsLeft = order.reservedUntil
    ? Math.floor((order.reservedUntil.getTime() - Date.now()) / 1000) -
      PAYMENT_LINK_BUFFER_SECONDS
    : 0
  if (secondsLeft <= 0) {
    throw new AppError('The payment window for this order has expired', 400)
  }

  const authToken = await getAuthToken()
  const paymobOrderId = await registerOrder(authToken, amountCents, order.id)
  const paymentKey = await getPaymentKey(
    authToken,
    paymobOrderId,
    amountCents,
    buildBillingData(order, user),
    secondsLeft
  )

  const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`

  return { iframeUrl, paymobOrderId: String(paymobOrderId) }
}

const signHmac = (data: string) =>
  crypto.createHmac('sha512', env.PAYMOB_HMAC_SECRET).update(data).digest('hex')

// Constant-time compare, so response timing can't leak how much of a forged
// HMAC was right.
const isSameHmac = (computed: string, received: string | undefined) => {
  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(received ?? '', 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export const verifyPaymobHmac = (
  body: PaymobWebhookBody,
  receivedHmac: string
): boolean => {
  const { obj } = body

  const concatenated = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success,
  ].join('')

  return isSameHmac(signHmac(concatenated), receivedHmac)
}

// Browser redirect after payment: same 20 fields, flat in the query string.
export const verifyPaymobRedirectHmac = (
  query: Record<string, string | undefined>
): boolean => {
  const concatenated = REDIRECT_HMAC_KEYS.map((key) => query[key] ?? '').join(
    ''
  )
  return isSameHmac(signHmac(concatenated), query.hmac)
}

export const handleWebhookTransaction = async (body: PaymobWebhookBody) => {
  const { obj } = body

  // 3DS still in progress — Paymob sends another event when it settles.
  if (obj.pending === true) return

  const paymobOrderId = String(obj.order?.id)
  const order = await orderRepo.findByPaymobOrderId(paymobOrderId)
  if (!order) return

  if (obj.success === true) {
    await orderRepo.markPaidIfUnpaid(order.id)
    return
  }

  // Declined: cancel + restock (a duplicate webhook is a no-op).
  await releaseUnpaidOrder(order.id)
}
