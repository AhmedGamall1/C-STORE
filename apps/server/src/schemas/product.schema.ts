import { z } from 'zod'
import { booleanString, numericString } from './common.schema.js'

const name = z
  .string({ message: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name is too long')

const description = z.string().trim().max(2000).optional()

const price = numericString
  .refine(Number.isFinite, { message: 'Price must be a valid number' })
  .refine((n) => n > 0, { message: 'Price must be greater than zero' })

const comparePrice = numericString
  .refine(Number.isFinite, { message: 'Compare price must be a valid number' })
  .refine((n) => n > 0, { message: 'Compare price must be greater than zero' })
  .optional()

const sku = z.string().trim().max(60).optional()

const categoryId = z
  .string({ message: 'Category is required' })
  .uuid('Invalid categoryId')

// ---------- bodies ----------
export const createProductBodySchema = z
  .object({
    name,
    description,
    price,
    comparePrice,
    sku,
    categoryId,
  })
  .refine((d) => !d.comparePrice || d.comparePrice > d.price, {
    message: 'Compare price must be greater than selling price',
    path: ['comparePrice'],
  })

export const updateProductBodySchema = z
  .object({
    name: name.optional(),
    description,
    price: price.optional(),
    comparePrice,
    sku,
    categoryId: categoryId.optional(),
    isActive: booleanString.optional(),
  })
  .refine(
    (d) => d.comparePrice == null || d.price == null || d.comparePrice > d.price,
    {
      message: 'Compare price must be greater than selling price',
      path: ['comparePrice'],
    }
  )
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  })

// ---------- queries ----------
const sortBy = z.enum(['createdAt', 'price', 'name']).catch('createdAt')
const order = z.enum(['asc', 'desc']).catch('desc')

export const listProductsPublicQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(12),
  category: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  search: z.string().trim().optional(),
  sortBy,
  order,
})

// Category counts follow every shop filter except the category itself.
export const categoryCountsQuerySchema = listProductsPublicQuerySchema.pick({
  minPrice: true,
  maxPrice: true,
  search: true,
})

export const listProductsAdminQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  sortBy,
  order,
})

export type CreateProductInput = z.infer<typeof createProductBodySchema>
export type UpdateProductInput = z.infer<typeof updateProductBodySchema>
export type ListProductsPublicQuery = z.infer<
  typeof listProductsPublicQuerySchema
>
export type ListProductsAdminQuery = z.infer<typeof listProductsAdminQuerySchema>
export type CategoryCountsQuery = z.infer<typeof categoryCountsQuerySchema>

export { idParamSchema, slugParamSchema } from './common.schema.js'
