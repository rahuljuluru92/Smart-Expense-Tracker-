import { createClient } from 'redis'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

redisClient.on('error', (err) => logger.error(`Redis error: ${err}`))
redisClient.on('connect', () => logger.info('Redis connected'))

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect()
  }
}

export { redisClient }

// Increment a counter metric in Redis (used by admin metrics endpoint)
export async function incrMetric(key: string) {
  try {
    await redisClient.incr(key)
  } catch {
    // non-fatal
  }
}

// Cache middleware factory
export function cacheMiddleware(ttlSeconds: number) {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!redisClient.isOpen) return next()

    const cacheKey = `cache:${req.user?.id}:${req.originalUrl}`

    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        await incrMetric('metrics:cache_hits')
        logger.debug(`CACHE HIT: ${cacheKey}`)
        return res.json(JSON.parse(cached))
      }

      await incrMetric('metrics:cache_misses')

      // Intercept res.json to capture and cache the response
      const originalJson = res.json.bind(res)
      res.json = (body: any) => {
        if (res.statusCode === 200) {
          // Cache and track the key in the user's key set
          redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(body)).catch(() => {})
          const trackingSetKey = `user:${req.user?.id}:cache_keys`
          redisClient.sAdd(trackingSetKey, cacheKey).catch(() => {})
          // TTL on tracking set = longest cache TTL (avoids stale keys leaking)
          redisClient.expire(trackingSetKey, 300).catch(() => {})
        }
        return originalJson(body)
      }

      next()
    } catch (err) {
      logger.warn(`Cache middleware error: ${err}`)
      next()
    }
  }
}

// Invalidate all cached responses for a user using their tracking Set
export async function invalidateUserCache(userId: string) {
  if (!redisClient.isOpen) return

  try {
    const trackingSetKey = `user:${userId}:cache_keys`
    const keys = await redisClient.sMembers(trackingSetKey)

    if (keys.length > 0) {
      await redisClient.del(keys)
      logger.debug(`Cache invalidated ${keys.length} keys for user ${userId}`)
    }
    await redisClient.del(trackingSetKey)
  } catch (err) {
    logger.warn(`Cache invalidation error for user ${userId}: ${err}`)
  }
}
