import { Prisma } from '@prisma/client'
import AppError from '../utils/AppError.js'
import { deleteImage, uploadImage } from '../utils/cloudinary.util.js'
import slugify from '../utils/slugify.js'
import * as productRepo from '../repositories/product.repository.js'
import * as categoryRepo from '../repositories/category.repository.js'
import { withTransaction } from '../repositories/transaction.js'
import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsPublicQuery,
  ListProductsAdminQuery,
  ShopFacetsQuery,
} from '../schemas/product.schema.js'

const PRODUCTS_FOLDER = 'c-store/products'

interface ImageFiles {
  imageBuffer?: Buffer
}

// ---------- public reads ----------

// Size / color / stock all describe ONE variant: "a Black M in stock" must be
// a single size row, not a Black color plus an M of some other color.
const buildColorWhere = ({
  sizes,
  colors,
  inStock,
}: ShopFacetsQuery): Prisma.ProductColorWhereInput | null => {
  if (!sizes && !colors && !inStock) return null
  return {
    isActive: true,
    ...(colors && { name: { in: colors } }),
    sizes: {
      some: {
        isActive: true,
        ...(sizes && { size: { in: sizes } }),
        ...(inStock && { stock: { gt: 0 } }),
      },
    },
  }
}

// Every shop filter except category, shared by the product list and the
// sidebar facets so both always agree on what "matches" means.
const buildShopWhere = (query: ShopFacetsQuery): Prisma.ProductWhereInput => {
  const { minPrice, maxPrice, search } = query
  const where: Prisma.ProductWhereInput = {}
  const colorWhere = buildColorWhere(query)
  if (colorWhere) where.colors = { some: colorWhere }
  if (minPrice != null || maxPrice != null) {
    where.price = {
      ...(minPrice != null ? { gte: minPrice } : {}),
      ...(maxPrice != null ? { lte: maxPrice } : {}),
    }
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }
  return where
}

export const getAllProducts = async (query: ListProductsPublicQuery) => {
  const { page, limit, category, sortBy, order } = query

  const skip = (page - 1) * limit
  const where = buildShopWhere(query)
  if (category) where.category = { slug: category }

  const orderBy: Prisma.ProductOrderByWithRelationInput = { [sortBy]: order }
  const [products, total] = await productRepo.findManyPublic({
    where,
    skip,
    take: limit,
    orderBy,
    // Shop All shows a card per color, so only return the matching colors.
    colorWhere: buildColorWhere(query) ?? undefined,
  })

  return {
    products,
    pagination: paginationOf(total, page, limit, skip),
  }
}

// Clothing sizes in shop order; anything else (32, 38…) sorts after, numerically.
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const sizeRank = (size: string) => {
  const i = SIZE_ORDER.indexOf(size.toUpperCase())
  return i === -1 ? SIZE_ORDER.length : i
}
const compareSizes = (a: string, b: string) =>
  sizeRank(a) - sizeRank(b) ||
  a.localeCompare(b, undefined, { numeric: true })

// Shop sidebar: per-category counts under the current filters (total = "All
// products"), plus every size and color a shopper can pick from.
export const getShopFacets = async (query: ShopFacetsQuery) => {
  const [rows, sizes, colors] = await Promise.all([
    productRepo.countPublicByCategory(buildShopWhere(query)),
    productRepo.findPublicSizes(),
    productRepo.findPublicColors(),
  ])

  const counts = Object.fromEntries(
    rows.map((c) => [c.slug, c._count.products] as const)
  )
  const total = rows.reduce((sum, c) => sum + c._count.products, 0)

  return {
    counts,
    total,
    sizes: sizes.map((s) => s.size).sort(compareSizes),
    colors,
  }
}

export const getProductBySlug = async (slug: string) => {
  const product = await productRepo.findPublicBySlug(slug)
  if (!product) throw new AppError('Product not found', 404)
  return product
}

// ---------- admin reads ----------
export const getAllProductsAdmin = async (query: ListProductsAdminQuery) => {
  const { page, limit, category, search, sortBy, order } = query
  const skip = (page - 1) * limit

  const where: Prisma.ProductWhereInput = {}
  if (category) where.category = { slug: category }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput = { [sortBy]: order }
  const [products, total] = await productRepo.findManyAdmin({
    where,
    skip,
    take: limit,
    orderBy,
  })

  return {
    products,
    pagination: paginationOf(total, page, limit, skip),
  }
}

export const getProductByIdAdmin = async (id: string) => {
  const product = await productRepo.findByIdAdminDetail(id)
  if (!product) throw new AppError('Product not found', 404)
  return product
}

// ---------- writes ----------
export const createProduct = async (
  data: CreateProductInput,
  files: ImageFiles = {}
) => {
  const { imageBuffer } = files
  if (!imageBuffer) throw new AppError('Product image is required', 400)

  const category = await categoryRepo.findById(data.categoryId)
  if (!category) throw new AppError('Category not found', 404)

  const slug = slugify(data.name)
  const existing = await productRepo.findBySlug(slug)
  if (existing) {
    throw new AppError('Product with this name already exists', 409)
  }

  const cover = await uploadImage(imageBuffer, PRODUCTS_FOLDER)

  return productRepo.create({
    name: data.name,
    slug,
    description: data.description ?? null,
    price: data.price,
    comparePrice: data.comparePrice ?? null,
    sku: data.sku ?? null,
    imageUrl: cover.secure_url,
    imagePublicId: cover.public_id,
    categoryId: data.categoryId,
  })
}

export const updateProduct = async (
  id: string,
  data: UpdateProductInput,
  files: ImageFiles = {}
) => {
  const { imageBuffer } = files
  const product = await productRepo.findById(id)
  if (!product) throw new AppError('Product not found', 404)

  // Cross-field rule against stored values: if only ONE of price/comparePrice
  // is being updated, validate against the existing value.
  const finalPrice = data.price ?? Number(product.price)
  const finalCompare =
    data.comparePrice !== undefined
      ? data.comparePrice
      : product.comparePrice != null
        ? Number(product.comparePrice)
        : null
  if (finalCompare != null && finalCompare <= finalPrice) {
    throw new AppError('Compare price must be greater than selling price', 400)
  }

  const updateData: Prisma.ProductUncheckedUpdateInput = {}
  if (data.name !== undefined) {
    updateData.name = data.name
    updateData.slug = slugify(data.name)
  }
  if (data.description !== undefined)
    updateData.description = data.description ?? null
  if (data.price !== undefined) updateData.price = data.price
  if (data.comparePrice !== undefined)
    updateData.comparePrice = data.comparePrice ?? null
  if (data.sku !== undefined) updateData.sku = data.sku ?? null
  if (data.isActive !== undefined) updateData.isActive = data.isActive

  if (data.categoryId && data.categoryId !== product.categoryId) {
    const category = await categoryRepo.findById(data.categoryId)
    if (!category) throw new AppError('Category not found', 404)
    updateData.categoryId = data.categoryId
  }

  if (imageBuffer) {
    await deleteImage(product.imagePublicId)
    const result = await uploadImage(imageBuffer, PRODUCTS_FOLDER)
    updateData.imageUrl = result.secure_url
    updateData.imagePublicId = result.public_id
  }

  return productRepo.updateById(id, updateData)
}

export const deleteProduct = async (id: string) => {
  const product = await productRepo.findById(id)
  if (!product) throw new AppError('Product not found', 404)
  return productRepo.softDeleteById(id)
}

export const forceDeleteProduct = async (id: string) => {
  const product = await productRepo.findByIdWithVariantsForDelete(id)
  if (!product) throw new AppError('Product not found', 404)

  const sizeIds = product.colors.flatMap((c) => c.sizes.map((s) => s.id))

  if (sizeIds.length > 0) {
    const orderItemCount = await productRepo.countOrderItemsBySizeIds(sizeIds)
    if (orderItemCount > 0) {
      throw new AppError(
        `Cannot hard-delete this product — it has ${orderItemCount} item(s) in existing orders. Use soft delete instead.`,
        409
      )
    }
  }

  await withTransaction(async (tx) => {
    await productRepo.cleanupCartItemsBySizeIds(sizeIds, tx)
    await productRepo.removeReviewsByProductId(id, tx)
    await productRepo.removeById(id, tx) // cascades to colors → sizes
  })

  // Cloudinary cleanup AFTER the DB commit — if the DB fails, images stay.
  await deleteImage(product.imagePublicId)
  for (const color of product.colors) {
    await deleteImage(color.imagePublicId)
    await Promise.all((color.imagePublicIds ?? []).map(deleteImage))
  }
}

// ---------- helpers ----------
const paginationOf = (
  total: number,
  page: number,
  limit: number,
  skip: number
) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: skip + limit < total,
  hasPrevPage: page > 1,
})
