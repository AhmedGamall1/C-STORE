import type { Request, Response } from 'express'
import * as productService from '../services/product.service.js'
import type {
  ListProductsPublicQuery,
  ListProductsAdminQuery,
  ShopFacetsQuery,
} from '../schemas/product.schema.js'

// req.query is already parsed/coerced by the validate() middleware.

// GET /api/products
export const getAllProducts = async (req: Request, res: Response) => {
  const result = await productService.getAllProducts(
    req.query as unknown as ListProductsPublicQuery
  )
  res.json({ status: 'success', ...result })
}

// GET /api/products/facets — shop sidebar: category counts + size/color options
export const getShopFacets = async (req: Request, res: Response) => {
  const data = await productService.getShopFacets(
    req.query as unknown as ShopFacetsQuery
  )
  res.json({ status: 'success', data })
}

// GET /api/products/admin
export const getAllProductsAdmin = async (req: Request, res: Response) => {
  const result = await productService.getAllProductsAdmin(
    req.query as unknown as ListProductsAdminQuery
  )
  res.json({ status: 'success', ...result })
}

// GET /api/products/admin/:id
export const getProductByIdAdmin = async (req: Request, res: Response) => {
  const product = await productService.getProductByIdAdmin(req.params.id as string)
  res.json({ status: 'success', data: { product } })
}

// GET /api/products/:slug
export const getProductBySlug = async (req: Request, res: Response) => {
  const product = await productService.getProductBySlug(req.params.slug as string)
  res.json({ status: 'success', data: { product } })
}

// POST /api/products
export const createProduct = async (req: Request, res: Response) => {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>
  const product = await productService.createProduct(req.body, {
    imageBuffer: files.image?.[0]?.buffer,
  })
  res.status(201).json({ status: 'success', data: { product } })
}

// PATCH /api/products/:id
export const updateProduct = async (req: Request, res: Response) => {
  const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>
  const product = await productService.updateProduct(req.params.id as string, req.body, {
    imageBuffer: files.image?.[0]?.buffer,
  })
  res.json({ status: 'success', data: { product } })
}

// DELETE /api/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
  await productService.deleteProduct(req.params.id as string)
  res.status(204).send()
}

// DELETE /api/products/:id/force
export const forceDeleteProduct = async (req: Request, res: Response) => {
  await productService.forceDeleteProduct(req.params.id as string)
  res.status(204).send()
}
