import type { Request, Response } from 'express'
import {
  verifyPaymobHmac,
  verifyPaymobRedirectHmac,
  handleWebhookTransaction,
} from '../services/paymob.service.js'
import AppError from '../utils/AppError.js'
import { env } from '../config/env.js'

export const paymobWebhook = async (req: Request, res: Response) => {
  if (!verifyPaymobHmac(req.body, req.query.hmac as string)) {
    throw new AppError('Invalid HMAC signature', 401)
  }

  await handleWebhookTransaction(req.body)
  res.status(200).json({ status: 'success' })
}

// GET /api/paymob/return — Paymob sends the customer's BROWSER here after paying.
// It only routes the browser; the webhook is what marks the order paid.
export const paymobReturn = (req: Request, res: Response) => {
  const query = req.query as Record<string, string | undefined>
  const orderId = query.merchant_order_id

  if (!orderId || !verifyPaymobRedirectHmac(query)) {
    res.redirect(env.CLIENT_URL) // forged or broken link → home page
    return
  }

  res.redirect(
    `${env.CLIENT_URL}/payment/result/${encodeURIComponent(orderId)}`
  )
}
