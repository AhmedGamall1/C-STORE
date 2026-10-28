import { api } from '@/lib/api'
import type { Product, Pagination, ListParams } from '@/types/api'

interface ProductListResult {
  products: Product[]
  pagination: Pagination
}

interface CreateProductInput {
  name: string
  description?: string
  price: string | number
  comparePrice?: string | number
  sku?: string
  categoryId: string
  imageFile?: File | null
}

interface UpdateProductInput {
  name?: string
  description?: string
  price?: string | number
  comparePrice?: string | number
  sku?: string
  categoryId?: string
  isActive?: boolean
  imageFile?: File | null
}

// GET /api/products — public, filtered + paginated
export async function getProducts(
  params: ListParams = {}
): Promise<ProductListResult> {
  const res = await api.get<{ products: Product[]; pagination: Pagination }>(
    '/products',
    { params }
  )
  return { products: res.products, pagination: res.pagination }
}

export interface ShopFacets {
  counts: Record<string, number> // category slug → matching products
  sizes: string[] // every size a shopper can pick
  colors: { name: string; hex: string | null }[]
  total: number
}

// GET /api/products/facets — shop sidebar: category counts for the current
// filters, plus the size and color options.
export async function getShopFacets(
  params: ListParams = {}
): Promise<ShopFacets> {
  const res = await api.get<{ data: ShopFacets }>(
    '/products/facets',
    { params }
  )
  return res.data
}

// GET /api/products/admin — includes inactive
export async function getAdminProducts(
  params: ListParams = {}
): Promise<ProductListResult> {
  const res = await api.get<{ products: Product[]; pagination: Pagination }>(
    '/products/admin',
    { params }
  )
  return { products: res.products, pagination: res.pagination }
}

// GET /api/products/admin/:id — admin detail (no active filter)
export async function getAdminProduct(id: string): Promise<Product> {
  const res = await api.get<{ data: { product: Product } }>(
    `/products/admin/${id}`
  )
  return res.data.product
}

// GET /api/products/:slug — full product (reviews, category, _count)
export async function getProduct(slug: string): Promise<Product> {
  const res = await api.get<{ data: { product: Product } }>(`/products/${slug}`)
  return res.data.product
}

// POST /api/products (admin)
export async function createProduct({
  name,
  description,
  price,
  comparePrice,
  sku,
  categoryId,
  imageFile,
}: CreateProductInput): Promise<Product> {
  const form = new FormData()
  form.append('name', name)
  if (description) form.append('description', description)
  form.append('price', String(price))
  if (comparePrice) form.append('comparePrice', String(comparePrice))
  if (sku) form.append('sku', sku)
  form.append('categoryId', categoryId)
  if (imageFile) form.append('image', imageFile)

  const res = await api.post<{ data: { product: Product } }>('/products', form)
  return res.data.product
}

// PATCH /api/products/:id (admin)
export async function updateProduct(
  id: string,
  {
    name,
    description,
    price,
    comparePrice,
    sku,
    categoryId,
    isActive,
    imageFile,
  }: UpdateProductInput
): Promise<Product> {
  const form = new FormData()
  if (name !== undefined) form.append('name', name)
  if (description !== undefined) form.append('description', description)
  if (price !== undefined) form.append('price', String(price))
  if (comparePrice !== undefined)
    form.append('comparePrice', String(comparePrice))
  if (sku !== undefined) form.append('sku', sku)
  if (categoryId !== undefined) form.append('categoryId', categoryId)
  if (isActive !== undefined) form.append('isActive', String(isActive))
  if (imageFile) form.append('image', imageFile)

  const res = await api.patch<{ data: { product: Product } }>(
    `/products/${id}`,
    form
  )
  return res.data.product
}

// DELETE /api/products/:id (admin) — soft delete, returns 204
export async function deleteProduct(id: string): Promise<string> {
  await api.delete(`/products/${id}`)
  return id
}

// DELETE /api/products/:id/force (admin) — hard delete
export async function forceDeleteProduct(id: string): Promise<string> {
  await api.delete(`/products/${id}/force`)
  return id
}

// PATCH /api/products/:id — toggle isActive
export async function toggleProductActive(
  id: string,
  isActive: boolean
): Promise<Product> {
  const res = await api.patch<{ data: { product: Product } }>(
    `/products/${id}`,
    { isActive }
  )
  return res.data.product
}
