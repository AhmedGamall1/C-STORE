import { Router } from 'express'
import {
  getAllCategories,
  getAllCategoriesAdmin,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js'
import { protect, restrictTo } from '../middlewares/auth.middleware.js'
import upload, { handleMulterError } from '../middlewares/upload.middlware.js'
import { validate } from '../middlewares/validate.middleware.js'
import { idParamSchema, slugParamSchema } from '../schemas/common.schema.js'
import { requireFile } from '../middlewares/requireFile.middleware.js'
import {
  createCategoryBodySchema,
  updateCategoryBodySchema,
} from '../schemas/category.schema.js'

const router = Router()

// public routes
router.get('/', getAllCategories)

// Admin reads are public on purpose: read-only admin demo, all data is fake.
// (before /:slug so "admin" isn't treated as a slug)
router.get('/admin', getAllCategoriesAdmin)

router.get('/:slug', validate({ params: slugParamSchema }), getCategoryBySlug)

// admin only routes
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  upload.single('image'),
  handleMulterError,
  requireFile('image'),
  validate({ body: createCategoryBodySchema }),
  createCategory
)

router.patch(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  upload.single('image'),
  handleMulterError,
  validate({ params: idParamSchema, body: updateCategoryBodySchema }),
  updateCategory
)

router.delete(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  validate({ params: idParamSchema }),
  deleteCategory
)

export default router
