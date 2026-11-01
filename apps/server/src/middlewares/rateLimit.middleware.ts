import rateLimit from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import redis from '../config/redis.js'

// Each limiter gets its own Redis-backed store + prefix so their counters
// stay separate. All server instances now share these counters.
const makeStore = (prefix: string) =>
  new RedisStore({
    sendCommand: (...args: string[]) =>
      redis.status === 'ready'
        ? (redis.call(
            ...(args as [string, ...string[]])
          ) as Promise<RedisReply>)
        : Promise.reject(new Error('Redis is not connected')),
    prefix,
  })

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: makeStore('rl:general:'),
  passOnStoreError: true,
  message: {
    status: 'error',
    message: 'Too many requests. Please try again in a few minutes.',
  },
  skip: (req) => req.originalUrl.startsWith('/api/paymob/webhook'),
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: makeStore('rl:auth:'),
  passOnStoreError: true,
  message: {
    status: 'error',
    message:
      'Too many authentication attempts. Please try again in 15 minutes.',
  },
  skipSuccessfulRequests: true,
})
