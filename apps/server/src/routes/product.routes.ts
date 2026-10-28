import { Router } from 'express'
import {
  getAllProducts,
  getAllProductsAdmin,
  getCategoryCounts,
  getProductByIdAdmin,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  forceDeleteProduct,
} from '../controllers/product.controller.js'
import * as variantController from '../controllers/variant.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'
import upload, { handleMulterError } from '../middlewares/upload.middlware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { requireFile } from '../middlewares/requireFile.middleware.js'
import {
  createProductBodySchema,
  updateProductBodySchema,
  listProductsPublicQuerySchema,
  listProductsAdminQuerySchema,
  categoryCountsQuerySchema,
  idParamSchema,
  slugParamSchema,
} from '../schemas/product.schema.js'
import {
  addColorBodySchema,
  updateColorBodySchema,
  addSizeBodySchema,
  updateSizeBodySchema,
  colorParamsSchema,
  sizeParamsSchema,
} from '../schemas/variant.schema.js'

const router = Router()

const productUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 },
])

// ----- public -----
router.get(
  '/',
  validate({ query: listProductsPublicQuerySchema }),
  getAllProducts
)

// Must sit above '/:slug', or "category-counts" would be read as a slug.
router.get(
  '/category-counts',
  validate({ query: categoryCountsQuerySchema }),
  getCategoryCounts
)

router.get(
  '/admin',
  protect,
  restrictTo('ADMIN'),
  validate({ query: listProductsAdminQuerySchema }),
  getAllProductsAdmin
)
router.get(
  '/admin/:id',
  protect,
  restrictTo('ADMIN'),
  validate({ params: idParamSchema }),
  getProductByIdAdmin
)

router.get('/:slug', validate({ params: slugParamSchema }), getProductBySlug)

// ----- admin product CRUD -----
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  productUpload,
  handleMulterError,
  requireFile('image'),
  validate({ body: createProductBodySchema }),
  createProduct
)
router.patch(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  productUpload,
  handleMulterError,
  validate({ params: idParamSchema, body: updateProductBodySchema }),
  updateProduct
)
router.delete(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  validate({ params: idParamSchema }),
  deleteProduct
)
router.delete(
  '/:id/force',
  protect,
  restrictTo('ADMIN'),
  validate({ params: idParamSchema }),
  forceDeleteProduct
)

// ----- colors -----
router.post(
  '/:id/colors',
  protect,
  restrictTo('ADMIN'),
  productUpload,
  handleMulterError,
  requireFile('image'),
  validate({ params: idParamSchema, body: addColorBodySchema }),
  variantController.addColor
)
router.patch(
  '/:id/colors/:colorId',
  protect,
  restrictTo('ADMIN'),
  productUpload,
  handleMulterError,
  validate({ params: colorParamsSchema, body: updateColorBodySchema }),
  variantController.updateColor
)
router.delete(
  '/:id/colors/:colorId',
  protect,
  restrictTo('ADMIN'),
  validate({ params: colorParamsSchema }),
  variantController.deleteColor
)

// ----- sizes -----
router.post(
  '/:id/colors/:colorId/sizes',
  protect,
  restrictTo('ADMIN'),
  validate({ params: colorParamsSchema, body: addSizeBodySchema }),
  variantController.addSize
)
router.patch(
  '/:id/colors/:colorId/sizes/:sizeId',
  protect,
  restrictTo('ADMIN'),
  validate({ params: sizeParamsSchema, body: updateSizeBodySchema }),
  variantController.updateSize
)
router.delete(
  '/:id/colors/:colorId/sizes/:sizeId',
  protect,
  restrictTo('ADMIN'),
  validate({ params: sizeParamsSchema }),
  variantController.deleteSize
)

export default router
