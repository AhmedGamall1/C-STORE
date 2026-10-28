import { Prisma } from '@prisma/client'
import prisma from '../config/database.js'
import type { DbClient } from './transaction.js'

const productCardInclude = {
  category: { select: { id: true, name: true, slug: true } },
  colors: {
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, hex: true, imageUrl: true },
  },
} satisfies Prisma.ProductInclude

const productDetailInclude = {
  category: { select: { id: true, name: true, slug: true } },
  colors: {
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    include: {
      sizes: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
    },
  },
  reviews: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  },
  _count: { select: { reviews: true } },
} satisfies Prisma.ProductInclude

const productAdminInclude = {
  category: { select: { id: true, name: true, slug: true } },
  colors: {
    orderBy: { createdAt: 'asc' },
    include: { sizes: { orderBy: { createdAt: 'asc' } } },
  },
} satisfies Prisma.ProductInclude

const buyableWhere = {
  colors: {
    some: {
      isActive: true,
      sizes: { some: { isActive: true } },
    },
  },
} satisfies Prisma.ProductWhereInput

type ProductListArgs = Pick<
  Prisma.ProductFindManyArgs,
  'where' | 'skip' | 'take' | 'orderBy'
>

// ---------- reads ----------
export const findById = (id: string) =>
  prisma.product.findUnique({ where: { id } })

export const findByIdAdminDetail = (id: string) =>
  prisma.product.findUnique({ where: { id }, include: productAdminInclude })

export const findByIdWithVariantsForDelete = (id: string) =>
  prisma.product.findUnique({
    where: { id },
    include: { colors: { include: { sizes: { select: { id: true } } } } },
  })

export const findBySlug = (slug: string) =>
  prisma.product.findUnique({ where: { slug } })

export const findPublicBySlug = (slug: string) =>
  prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
      category: { isActive: true },
      ...buyableWhere,
    },
    include: productDetailInclude,
  })

// Per-category count of shop-visible products matching `where` (one query).
export const countPublicByCategory = (where: Prisma.ProductWhereInput) =>
  prisma.category.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      _count: {
        select: {
          products: { where: { isActive: true, ...buyableWhere, ...where } },
        },
      },
    },
  })

const publicVariantWhere = {
  isActive: true,
  color: {
    isActive: true,
    product: { isActive: true, category: { isActive: true } },
  },
} satisfies Prisma.ProductSizeWhereInput

// Every size a shopper can filter by (distinct).
export const findPublicSizes = () =>
  prisma.productSize.findMany({
    where: publicVariantWhere,
    distinct: ['size'],
    select: { size: true },
  })

// Every color a shopper can filter by (distinct by name).
export const findPublicColors = () =>
  prisma.productColor.findMany({
    where: {
      isActive: true,
      sizes: { some: { isActive: true } },
      product: { isActive: true, category: { isActive: true } },
    },
    distinct: ['name'],
    orderBy: { name: 'asc' },
    select: { name: true, hex: true },
  })

// Atomic list + count for public pagination. `colorWhere` narrows each card's
// colors to the ones matching the size/color/stock filters.
export const findManyPublic = ({
  where,
  skip,
  take,
  orderBy,
  colorWhere,
}: ProductListArgs & { colorWhere?: Prisma.ProductColorWhereInput }) =>
  prisma.$transaction([
    prisma.product.findMany({
      where: {
        isActive: true,
        category: { isActive: true },
        ...buyableWhere,
        ...where,
      },
      skip,
      take,
      orderBy,
      include: colorWhere
        ? {
            ...productCardInclude,
            colors: { ...productCardInclude.colors, where: colorWhere },
          }
        : productCardInclude,
    }),
    prisma.product.count({
      where: {
        isActive: true,
        category: { isActive: true },
        ...buyableWhere,
        ...where,
      },
    }),
  ])

export const findManyAdmin = ({ where, skip, take, orderBy }: ProductListArgs) =>
  prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: productCardInclude,
    }),
    prisma.product.count({ where }),
  ])

// ---------- writes ----------
export const create = (data: Prisma.ProductCreateArgs['data'], tx: DbClient = prisma) =>
  tx.product.create({
    data,
    include: { category: { select: { id: true, name: true, slug: true } } },
  })

export const updateById = (
  id: string,
  data: Prisma.ProductUpdateArgs['data'],
  tx: DbClient = prisma
) =>
  tx.product.update({
    where: { id },
    data,
    include: { category: { select: { id: true, name: true, slug: true } } },
  })

// Soft delete — keeps historical orders intact.
export const softDeleteById = (id: string, tx: DbClient = prisma) =>
  tx.product.update({ where: { id }, data: { isActive: false } })

export const removeById = (id: string, tx: DbClient = prisma) =>
  tx.product.delete({ where: { id } })

// Used by force-delete to clean up cart items + reviews atomically.
export const cleanupCartItemsBySizeIds = (
  sizeIds: string[],
  tx: DbClient = prisma
) => tx.cartItem.deleteMany({ where: { productSizeId: { in: sizeIds } } })

export const removeReviewsByProductId = (
  productId: string,
  tx: DbClient = prisma
) => tx.review.deleteMany({ where: { productId } })

export const countOrderItemsBySizeIds = (sizeIds: string[]) =>
  prisma.orderItem.count({ where: { productSizeId: { in: sizeIds } } })
