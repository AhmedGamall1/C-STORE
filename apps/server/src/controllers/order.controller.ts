import type { Request, Response } from 'express'
import * as orderService from '../services/order.service.js'
import { initiatePaymobPayment } from '../services/paymob.service.js'
import type { ListOrdersAdminQuery } from '../schemas/order.schema.js'

// POST /api/orders
export const createOrder = async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.user ?? null, req.body)

  if (order.paymentMethod !== 'PAYMOB') {
    res.status(201).json({ status: 'success', data: { order } })
    return
  }

  let payment: Awaited<ReturnType<typeof initiatePaymobPayment>>
  try {
    payment = await initiatePaymobPayment(order, req.user ?? null)
  } catch (err) {
    // Compensating action: Paymob couldn't start, so undo the order now instead
    // of holding its stock for 30 minutes. The customer still gets the error.
    await orderService.releaseUnpaidOrder(order.id)
    throw err
  }

  const { iframeUrl, paymobOrderId } = payment
  await orderService.savePaymobOrderId(order.id, paymobOrderId)

  res.status(201).json({
    status: 'success',
    data: { order: { ...order, paymobOrderId }, iframeUrl },
  })
}

// GET /api/orders
export const getMyOrders = async (req: Request, res: Response) => {
  const orders = await orderService.getMyOrders(req.user!.id)
  res.json({ status: 'success', results: orders.length, data: { orders } })
}

// GET /api/orders/:id
export const getOrderById = async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(
    req.user!.id,
    req.params.id as string
  )
  res.json({ status: 'success', data: { order } })
}

// GET /api/orders/:id/payment-status — public (guests too), status fields only
export const getPaymentStatus = async (req: Request, res: Response) => {
  const order = await orderService.getPaymentStatus(req.params.id as string)
  res.json({ status: 'success', data: { order } })
}

// PATCH /api/orders/:id/cancel
export const cancelOrder = async (req: Request, res: Response) => {
  const order = await orderService.cancelOrder(
    req.user!.id,
    req.params.id as string
  )
  res.json({ status: 'success', data: { order } })
}

// GET /api/orders/admin
export const getAllOrders = async (req: Request, res: Response) => {
  const result = await orderService.getAllOrders(
    req.query as unknown as ListOrdersAdminQuery
  )
  res.json({
    status: 'success',
    results: result.orders.length,
    data: { orders: result.orders, pagination: result.pagination },
  })
}

// GET /api/orders/admin/:id
export const getOrderByIdAdmin = async (req: Request, res: Response) => {
  const order = await orderService.getOrderByIdAdmin(req.params.id as string)
  res.json({ status: 'success', data: { order } })
}

// PATCH /api/orders/:id/status
export const updateOrderStatus = async (req: Request, res: Response) => {
  const order = await orderService.updateOrderStatus(
    req.params.id as string,
    req.body.status
  )
  res.json({ status: 'success', data: { order } })
}
