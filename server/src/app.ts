// Must be first: loads .env and validates configuration before anything reads it
import { env, isProduction } from './config/env'

import express from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import { createServer } from 'http'
import { Server } from 'socket.io'

// Import routes
import authRoutes from './routes/auth'
import expenseRoutes from './routes/expenses'
import userRoutes from './routes/users'
import analyticsRoutes from './routes/analytics'
import notificationRoutes from './routes/notifications'
import adminRoutes from './routes/admin'
import savingsRoutes from './routes/savings'

// Import middleware
import { errorHandler } from './middleware/error'
import { logger } from './utils/logger'
import { connectRedis, redisClient } from './middleware/cache'
import { verifyToken } from './utils/jwt'
import prisma from './config/database'

const app = express()
const server = createServer(app)

// Behind Vercel/Railway/nginx the client IP arrives in X-Forwarded-For.
// Without this, every request shares the proxy's IP and rate limiting breaks.
app.set('trust proxy', env.TRUST_PROXY)
app.disable('x-powered-by')

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = new Set<string>([
  ...(isProduction ? [] : ['http://localhost:3000', 'http://localhost:3001']),
  ...(env.CLIENT_URL ? [env.CLIENT_URL] : []),
  ...(env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean) : []),
])
const previewOriginRegex = env.CORS_PREVIEW_ORIGIN_REGEX ? new RegExp(env.CORS_PREVIEW_ORIGIN_REGEX) : null

function isOriginAllowed(origin: string | undefined): boolean {
  // Server-to-server, curl and native mobile clients send no Origin header
  if (!origin) return true
  return allowedOrigins.has(origin) || (previewOriginRegex?.test(origin) ?? false)
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  credentials: true,
}

// ── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 150,
  delayMs: (hits) => (hits - 150) * 100,
  maxDelayMs: 2000,
})

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors(corsOptions))
app.use(compression())
app.use(morgan(isProduction ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/health' || req.url === '/ready',
}))
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// ── Health checks (before rate limiting so orchestrators are never throttled) ─
// Liveness: the process is up
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() })
})

// Readiness: dependencies are reachable
app.get('/ready', async (_req, res) => {
  const checks: Record<string, 'up' | 'down'> = { database: 'down', redis: 'down' }
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'up'
  } catch (err) {
    logger.error(`Readiness: database check failed: ${err}`)
  }
  try {
    if (redisClient.isReady) {
      await redisClient.ping()
      checks.redis = 'up'
    }
  } catch (err) {
    logger.error(`Readiness: redis check failed: ${err}`)
  }
  // Redis is a cache — degrade gracefully; only the database is required
  const ready = checks.database === 'up'
  res.status(ready ? 200 : 503).json({ status: ready ? 'READY' : 'NOT_READY', checks })
})

app.use('/api', limiter, speedLimiter)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/users', userRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/savings', savingsRoutes)

// 404 handler (after all routes, before the error handler)
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
  },
})

// Authenticate every socket with the same JWT the REST API uses.
// Clients connect with: io(url, { auth: { token } })
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
  if (typeof token !== 'string') return next(new Error('Unauthorized'))
  try {
    socket.data.userId = verifyToken(token).userId
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', (socket) => {
  const userId: string = socket.data.userId
  // Users are joined to their own room server-side; they cannot pick a room.
  socket.join(`user-${userId}`)
  logger.debug(`Socket connected: ${socket.id} (user ${userId})`)

  // Backwards compatible no-op: the room is already joined from the verified token
  socket.on('join-user-room', () => undefined)

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`)
  })
})

// Make io available to routes
app.set('io', io)

// ── Startup ──────────────────────────────────────────────────────────────────
connectRedis().catch((err) => logger.error(`Redis connection failed: ${err}`))

server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`)
})

// ── Graceful shutdown ────────────────────────────────────────────────────────
let shuttingDown = false

async function shutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`${signal} received, shutting down gracefully`)

  // Force exit if connections refuse to drain
  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, 10_000)
  forceExit.unref()

  try {
    io.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await prisma.$disconnect()
    if (redisClient.isOpen) await redisClient.quit()
    logger.info('Shutdown complete')
  } catch (err) {
    logger.error(`Error during shutdown: ${err}`)
    exitCode = 1
  }
  process.exit(exitCode)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  logger.error({ message: 'Unhandled promise rejection', reason: String(reason) })
})

process.on('uncaughtException', (err) => {
  logger.error({ message: 'Uncaught exception', error: err.message, stack: err.stack })
  void shutdown('uncaughtException', 1)
})

export default app
