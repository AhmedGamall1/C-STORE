import { Router } from 'express'
import { getDashboardStats } from '../controllers/dashboard.controller.js'
import { optionalAuth } from '../middlewares/auth.middleware.js'

const router = Router()

router.get('/', optionalAuth, getDashboardStats)

export default router
