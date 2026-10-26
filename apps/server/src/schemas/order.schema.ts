import { z } from 'zod'

const orderItem = z.object({
  productSizeId: z.string().uuid('Invalid productSizeId'),
  quantity: z.number().int().positive('Quantity must be positive'),
})

const baseFields = {
  items: z.array(orderItem).min(1, 'Order must contain at least one item'),
  paymentMethod: z.enum(['COD', 'PAYMOB']).default('COD'),
  notes: z.string().trim().max(500).optional(),
  clearCart: z.boolean().optional(),
}

// Logged-in users send addressId pointing at one of their saved addresses.
export const createOrderUserBodySchema = z.object({
  ...baseFields,
  addressId: z
    .string({ message: 'addressId is required' })
    .uuid('addressId must be a valid id'),
})

// Guests send inline contact + address. email is optional (some prefer phone-only),
// except for card payments: Paymob refuses a payment without one.
export const createOrderGuestBodySchema = z
  .object({
    ...baseFields,
    guest: z.object({
      name: z
        .string({ message: 'Guest contact info (name, phone) is required' })
        .trim()
        .min(1, 'Guest contact info (name, phone) is required'),
      phone: z
        .string({ message: 'Guest contact info (name, phone) is required' })
        .trim()
        .min(1, 'Guest contact info (name, phone) is required'),
      email: z.string().email().optional(),
    }),
    shippingAddress: z.object({
      street: z
        .string({
          message: 'Shipping address (street, city, governorate) is required',
        })
        .trim()
        .min(1, 'Shipping address (street, city, governorate) is required'),
      city: z
        .string()
        .trim()
        .min(1, 'Shipping address (street, city, governorate) is required'),
      governorate: z
        .string()
        .trim()
        .min(1, 'Shipping address (street, city, governorate) is required'),
    }),
  })
  .refine(
    (body) => body.paymentMethod !== 'PAYMOB' || Boolean(body.guest.email),
    { message: 'Email is required to pay by card', path: ['guest', 'email'] }
  )

const orderStatusValues = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const

export const updateOrderStatusBodySchema = z.object({
  status: z.enum(orderStatusValues),
})

export const listOrdersAdminQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(orderStatusValues).optional(),
  paymentStatus: z.enum(['UNPAID', 'PAID', 'REFUNDED']).optional(),
  paymentMethod: z.enum(['COD', 'PAYMOB']).optional(),
  q: z.string().trim().optional(),
})

export type CreateOrderUserInput = z.infer<typeof createOrderUserBodySchema>
export type CreateOrderGuestInput = z.infer<typeof createOrderGuestBodySchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusBodySchema>
export type ListOrdersAdminQuery = z.infer<typeof listOrdersAdminQuerySchema>

export { idParamSchema } from './common.schema.js'
