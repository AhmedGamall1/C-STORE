import { Prisma } from '@prisma/client'
import prisma from '../config/database.js'
import type { DbClient } from './transaction.js'

const orderInclude = {
  items: true,
  address: true,
} satisfies Prisma.OrderInclude

const adminOrderInclude = {
  items: {
    include: {
      productSize: {
        select: {
          id: true,
          color: {
            select: {
              imageUrl: true,
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      },
    },
  },
  address: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
} satisfies Prisma.OrderInclude

type OrderListArgs = Pick<Prisma.OrderFindManyArgs, 'where' | 'skip' | 'take'>

// ---------- reads ----------
export const findManyForUser = (userId: string) =>
  prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  })

// userId narrows ownership at the query level.
export const findByIdForUser = (orderId: string, userId: string) =>
  prisma.order.findFirst({
    where: { id: orderId, userId },
    include: orderInclude,
  })

export const findByIdAdmin = (orderId: string) =>
  prisma.order.findUnique({
    where: { id: orderId },
    include: adminOrderInclude,
  })

// Public payment status: only what a result page needs, no personal data.
export const findPaymentStatus = (orderId: string) =>
  prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
    },
  })

// Cancel/status flows need items but not the heavy admin shape.
export const findByIdWithItems = (orderId: string, tx: DbClient = prisma) =>
  tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

// Atomic list + count for admin pagination.
export const findManyAdmin = ({ where, skip, take }: OrderListArgs) =>
  prisma.$transaction([
    prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: adminOrderInclude,
    }),
    prisma.order.count({ where }),
  ])

// ---------- writes ----------
export const createOrder = (
  data: Prisma.OrderCreateArgs['data'],
  tx: DbClient = prisma
) => tx.order.create({ data })

export const createOrderItems = (
  rows: Prisma.OrderItemCreateManyInput[],
  tx: DbClient = prisma
) => tx.orderItem.createMany({ data: rows })

// Race-safe: returns count=0 if not enough stock; the caller decides what to do.
export const decrementSizeStock = (
  sizeId: string,
  qty: number,
  tx: DbClient = prisma
) =>
  tx.productSize.updateMany({
    where: { id: sizeId, stock: { gte: qty } },
    data: { stock: { decrement: qty } },
  })

export const incrementSizeStock = (
  sizeId: string,
  qty: number,
  tx: DbClient = prisma
) =>
  tx.productSize.updateMany({
    where: { id: sizeId },
    data: { stock: { increment: qty } },
  })

export const updateOrder = (
  orderId: string,
  data: Prisma.OrderUpdateArgs['data'],
  tx: DbClient = prisma
) =>
  tx.order.update({
    where: { id: orderId },
    data,
    include: orderInclude,
  })

export const findByIdWithOrderInclude = (
  orderId: string,
  tx: DbClient = prisma
) => tx.order.findUnique({ where: { id: orderId }, include: orderInclude })

export const savePaymobOrderId = (orderId: string, paymobOrderId: string) =>
  prisma.order.update({
    where: { id: orderId },
    data: { paymobOrderId },
  })

export const findByPaymobOrderId = (paymobOrderId: string) =>
  prisma.order.findFirst({
    where: { paymobOrderId },
    include: { items: true },
  })

// Mark paid exactly once — only if still unpaid and not cancelled.
export const markPaidIfUnpaid = (orderId: string, tx: DbClient = prisma) =>
  tx.order.updateMany({
    where: {
      id: orderId,
      status: { not: 'CANCELLED' },
      paymentStatus: 'UNPAID',
    },
    data: { paymentStatus: 'PAID', status: 'CONFIRMED', reservedUntil: null },
  })

// Cancel exactly once — only if not already cancelled and not paid.
export const markCancelledIfActive = (orderId: string, tx: DbClient = prisma) =>
  tx.order.updateMany({
    where: {
      id: orderId,
      status: { not: 'CANCELLED' },
      paymentStatus: { not: 'PAID' },
    },
    data: { status: 'CANCELLED', reservedUntil: null },
  })
