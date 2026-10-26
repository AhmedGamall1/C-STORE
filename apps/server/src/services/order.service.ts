import { Prisma, type User, type OrderStatus } from '@prisma/client'
import AppError from '../utils/AppError.js'
import { getShippingCost } from '../config/shipping.js'
import { withTransaction } from '../repositories/transaction.js'
import * as orderRepo from '../repositories/order.repository.js'
import * as variantRepo from '../repositories/variant.repository.js'
import * as addressRepo from '../repositories/address.repository.js'
import * as cartRepo from '../repositories/cart.repository.js'
import type {
  CreateOrderUserInput,
  CreateOrderGuestInput,
  ListOrdersAdminQuery,
} from '../schemas/order.schema.js'

const PAYMOB_RESERVATION_MINUTES = 30

type OrderSize = Awaited<
  ReturnType<typeof variantRepo.findProductSizesForOrder>
>[number]

type CreateOrderBody = CreateOrderUserInput | CreateOrderGuestInput

// Size price overrides the product price when set.
const unitPriceOf = (size: OrderSize) => size.price ?? size.color.product.price

// Ensure the size + its color + its product are all active and in stock for `qty`.
const assertSizeAvailable = (size: OrderSize | undefined, qty: number) => {
  if (
    !size ||
    !size.isActive ||
    !size.color?.isActive ||
    !size.color?.product?.isActive
  ) {
    throw new AppError(
      'One or more selected variants are no longer available',
      400
    )
  }

  if (qty > size.stock) {
    throw new AppError(
      `Insufficient stock for "${size.color.product.name}" — ${size.color.name} / ${size.size}. Available: ${size.stock}`,
      400
    )
  }
}

// Create an order — supports both logged-in users and guests.
export const createOrder = async (
  user: User | null | undefined,
  body: CreateOrderBody
) => {
  // Guests may order; logged-in users must have a verified email.
  if (user && !user.emailVerified) {
    throw new AppError('Please verify your email to place an order', 403)
  }

  const { paymentMethod, items, notes, clearCart } = body

  // --- address / governorate resolution ---
  let shippingGovernorate: string
  let addressId: string | undefined

  if (user) {
    const { addressId: bodyAddressId } = body as CreateOrderUserInput
    const savedAddress = await addressRepo.findByIdForUser(
      bodyAddressId,
      user.id
    )

    if (!savedAddress || savedAddress.userId !== user.id) {
      throw new AppError('Address not found', 404)
    }

    addressId = savedAddress.id
    shippingGovernorate = savedAddress.governorate
  } else {
    shippingGovernorate = (body as CreateOrderGuestInput).shippingAddress
      .governorate
  }

  const shippingCost = getShippingCost(shippingGovernorate)
  if (shippingCost === null) {
    throw new AppError(
      `Shipping is not available for governorate: ${shippingGovernorate}`,
      400
    )
  }

  // --- variant lookup + validation ---
  const sizeIds = items.map((i) => i.productSizeId)
  const sizes = await variantRepo.findProductSizesForOrder(sizeIds)

  if (sizes.length !== sizeIds.length) {
    throw new AppError('One or more selected variants were not found', 400)
  }

  const sizeMap = Object.fromEntries(sizes.map((s) => [s.id, s] as const))

  for (const item of items) {
    assertSizeAvailable(sizeMap[item.productSizeId], item.quantity)
  }

  // --- totals ---
  const subtotal = items.reduce((sum, item) => {
    const size = sizeMap[item.productSizeId]
    return sum + Number(unitPriceOf(size)) * item.quantity
  }, 0)
  const total = subtotal + shippingCost

  const reservedUntil =
    paymentMethod === 'PAYMOB'
      ? new Date(Date.now() + PAYMOB_RESERVATION_MINUTES * 60 * 1000)
      : null

  const orderData: Prisma.OrderUncheckedCreateInput = {
    paymentMethod,
    subtotal,
    shippingCost,
    total,
    reservedUntil,
    notes: notes ?? null,
  }

  if (user) {
    orderData.userId = user.id
    orderData.addressId = addressId
  } else {
    const guestBody = body as CreateOrderGuestInput
    orderData.guestEmail = guestBody.guest.email
    orderData.guestName = guestBody.guest.name
    orderData.guestPhone = guestBody.guest.phone
    orderData.shippingStreet = guestBody.shippingAddress.street
    orderData.shippingCity = guestBody.shippingAddress.city
    orderData.shippingGovernorate = guestBody.shippingAddress.governorate
  }

  // One transaction so order + items + stock decrement + cart clearing are all-or-nothing.
  return withTransaction(async (tx) => {
    const newOrder = await orderRepo.createOrder(orderData, tx)

    // Snapshot price/name onto each order item so it survives later product edits.
    await orderRepo.createOrderItems(
      items.map((item) => {
        const size = sizeMap[item.productSizeId]
        return {
          orderId: newOrder.id,
          productSizeId: size.id,
          quantity: item.quantity,
          price: unitPriceOf(size),
          size: size.size,
          colorName: size.color.name,
          colorHex: size.color.hex,
        }
      }),
      tx
    )

    // Race-safe stock decrement: count === 0 means someone else took the last units.
    for (const item of items) {
      const size = sizeMap[item.productSizeId]
      const result = await orderRepo.decrementSizeStock(
        size.id,
        item.quantity,
        tx
      )
      if (result.count === 0) {
        throw new AppError(
          `"${size.color.product.name}" (${size.color.name} / ${size.size}) just went out of stock`,
          409
        )
      }
    }

    if (user && clearCart) {
      const cart = await cartRepo.findCartByUserId(user.id)
      if (cart) {
        await cartRepo.deleteCartItemsBySizeIds(cart.id, sizeIds, tx)
      }
    }

    // Non-null: we created this order moments ago in the same transaction.
    return (await orderRepo.findByIdWithOrderInclude(newOrder.id, tx))!
  })
}

export const getMyOrders = (userId: string) => orderRepo.findManyForUser(userId)

export const getOrderById = async (userId: string, orderId: string) => {
  const order = await orderRepo.findByIdForUser(orderId, userId)
  if (!order) throw new AppError('Order not found', 404)
  return order
}

// No auth: the order id is an unguessable UUID and only the status is returned.
export const getPaymentStatus = async (orderId: string) => {
  const order = await orderRepo.findPaymentStatus(orderId)
  if (!order) throw new AppError('Order not found', 404)
  return order
}

// Cancel a pending order and restore stock on the size rows.
export const cancelOrder = async (userId: string, orderId: string) => {
  const order = await orderRepo.findByIdForUser(orderId, userId)

  if (!order || order.userId !== userId) {
    throw new AppError('Order not found', 404)
  }
  if (order.status !== 'PENDING') {
    throw new AppError(
      `Cannot cancel an order with status: ${order.status}`,
      400
    )
  }

  return withTransaction(async (tx) => {
    for (const item of order.items) {
      if (item.productSizeId) {
        await orderRepo.incrementSizeStock(
          item.productSizeId,
          item.quantity,
          tx
        )
      }
    }

    return orderRepo.updateOrder(
      orderId,
      { status: 'CANCELLED', reservedUntil: null },
      tx
    )
  })
}

export const savePaymobOrderId = (orderId: string, paymobOrderId: string) =>
  orderRepo.savePaymobOrderId(orderId, paymobOrderId)

// Cancel an unpaid order and put its stock back. Safe to call twice: the
// cancel is conditional, so only the first call restores stock.
export const releaseUnpaidOrder = (orderId: string) =>
  withTransaction(async (tx) => {
    const order = await orderRepo.findByIdWithItems(orderId, tx)
    if (!order) return

    const { count } = await orderRepo.markCancelledIfActive(orderId, tx)
    if (count === 0) return // already cancelled, or paid

    for (const item of order.items) {
      if (item.productSizeId) {
        await orderRepo.incrementSizeStock(
          item.productSizeId,
          item.quantity,
          tx
        )
      }
    }
  })

///////////// Admin /////////////////

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

const buildAdminWhere = (query: ListOrdersAdminQuery) => {
  const { status, paymentStatus, paymentMethod, q } = query
  const where: Prisma.OrderWhereInput = {}
  if (status) where.status = status
  if (paymentStatus) where.paymentStatus = paymentStatus
  if (paymentMethod) where.paymentMethod = paymentMethod

  if (q) {
    const term = q
    const asNumber = Number(term)
    where.OR = [
      { guestName: { contains: term, mode: 'insensitive' } },
      { guestEmail: { contains: term, mode: 'insensitive' } },
      { guestPhone: { contains: term, mode: 'insensitive' } },
      { user: { firstName: { contains: term, mode: 'insensitive' } } },
      { user: { lastName: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      ...(Number.isFinite(asNumber) ? [{ orderNumber: asNumber }] : []),
    ]
  }
  return where
}

export const getAllOrders = async (query: ListOrdersAdminQuery) => {
  const { page, limit } = query
  const skip = (page - 1) * limit
  const where = buildAdminWhere(query)

  const [orders, total] = await orderRepo.findManyAdmin({
    where,
    skip,
    take: limit,
  })

  return {
    orders,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    },
  }
}

export const getOrderByIdAdmin = async (orderId: string) => {
  const order = await orderRepo.findByIdAdmin(orderId)
  if (!order) throw new AppError('Order not found', 404)
  return order
}

export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
) => {
  const order = await orderRepo.findByIdWithItems(orderId)
  if (!order) throw new AppError('Order not found', 404)

  const allowed = VALID_TRANSITIONS[order.status]
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot transition from ${order.status} to ${newStatus}`,
      400
    )
  }

  if (newStatus === 'CANCELLED') {
    return withTransaction(async (tx) => {
      for (const item of order.items) {
        if (item.productSizeId) {
          await orderRepo.incrementSizeStock(
            item.productSizeId,
            item.quantity,
            tx
          )
        }
      }
      return orderRepo.updateOrder(
        orderId,
        { status: 'CANCELLED', reservedUntil: null },
        tx
      )
    })
  }

  const updateData: Prisma.OrderUncheckedUpdateInput = { status: newStatus }
  if (newStatus === 'DELIVERED' && order.paymentMethod === 'COD') {
    updateData.paymentStatus = 'PAID'
  }
  if (newStatus === 'CONFIRMED') {
    updateData.reservedUntil = null
  }

  return orderRepo.updateOrder(orderId, updateData)
}
