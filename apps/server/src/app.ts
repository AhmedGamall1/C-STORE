import express, {
  type Request,
  type Response,
  type ErrorRequestHandler,
} from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import prisma from './config/database.js'
import authRoutes from './routes/auth.routes.js'
import categoryRoutes from './routes/category.routes.js'
import productRoutes from './routes/product.routes.js'
import variantRoutes from './routes/variant.routes.js'
import cartRoutes from './routes/cart.routes.js'
import shippingRoutes from './routes/shipping.routes.js'
import orderRoutes from './routes/order.routes.js'
import addressRoutes from './routes/address.routes.js'
import paymobRoutes from './routes/paymob.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import { generalLimiter } from './middlewares/rateLimit.middleware.js'

const app = express()

app.set('trust proxy', 1)

// Security headers
app.use(helmet())

// CORS
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
)

// Access logs
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))

app.use(cookieParser())
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// Rate limiting
app.use('/api', generalLimiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/variants', variantRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/paymob', paymobRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Health check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      message: 'C-Store API is running',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    })
  } catch {
    res.status(503).json({
      status: 'error',
      message: 'Database unreachable',
      timestamp: new Date().toISOString(),
    })
  }
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  })
})

// Global error handler
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    status: err.status || 'error',
    message: err.message || 'Internal server error',
    ...(err.errors && { errors: err.errors }),
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
app.use(errorHandler)

export default app
