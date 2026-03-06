import express from 'express'
import { redisClient } from '../middleware/cache'
import { logger } from '../utils/logger'

const router = express.Router()

// @desc    System health metrics for the System Health dashboard widget
// @route   GET /api/admin/metrics
// @access  Public (no auth — metrics are non-sensitive aggregate counts)
router.get('/metrics', async (req, res) => {
  try {
    const [hits, misses, queueLen] = await Promise.all([
      redisClient.get('metrics:cache_hits').catch(() => '0'),
      redisClient.get('metrics:cache_misses').catch(() => '0'),
      // ai-service enqueues receipt jobs to the 'celery' list by default
      redisClient.lLen('celery').catch(() => 0),
    ])

    const hitsNum = parseInt(hits || '0', 10)
    const missesNum = parseInt(misses || '0', 10)
    const total = hitsNum + missesNum
    const hitRate = total > 0 ? Math.round((hitsNum / total) * 100) : 0

    res.json({
      success: true,
      data: {
        cache: {
          hits: hitsNum,
          misses: missesNum,
          hitRate,
          total,
        },
        queue: {
          depth: typeof queueLen === 'number' ? queueLen : parseInt(queueLen as any || '0', 10),
        },
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error(`Admin metrics error: ${err}`)
    res.status(500).json({ success: false, message: 'Metrics unavailable' })
  }
})

export default router
