import { Router } from 'express'
import {
  register,
  login,
  getMe,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refresh,
} from '../controllers/auth.controller.js'
import { protect } from '../middlewares/auth.middleware.js'
import { authLimiter } from '../middlewares/rateLimit.middleware.js'
import { validate } from '../middlewares/validate.middleware.js'
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema.js'

const router = Router()

router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  register
)
router.post(
  '/verify-email',
  authLimiter,
  validate({ body: verifyEmailSchema }),
  verifyEmail
)
router.post('/resend-verification', authLimiter, protect, resendVerification)
router.post('/login', authLimiter, validate({ body: loginSchema }), login)
router.post('/logout', logout)
router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: forgotPasswordSchema }),
  forgotPassword
)
router.post(
  '/reset-password',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  resetPassword
)
router.post('/refresh', refresh)
router.get('/me', protect, getMe)

export default router
