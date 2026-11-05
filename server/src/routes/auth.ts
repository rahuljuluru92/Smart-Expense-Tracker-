import express, { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { protect, publicUserSelect, AuthRequest } from '../middleware/auth'
import { signToken } from '../utils/jwt'
import { logger } from '../utils/logger'

const router = express.Router()

// Brute-force protection: failed and successful attempts both count.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again in 15 minutes.' },
})

const passwordRule = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8–128 characters')
  .matches(/[A-Za-z]/)
  .withMessage('Password must contain a letter')
  .matches(/\d/)
  .withMessage('Password must contain a number')

function sendValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req)
  if (errors.isEmpty()) return false
  res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() })
  return true
}

// A valid bcrypt hash used to keep login timing constant when the email is unknown,
// so response time doesn't reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-real-password', 12)

// Register user
router.post('/register', credentialLimiter, [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  passwordRule,
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (sendValidationErrors(req, res)) return

    const { name, email, password } = req.body

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        preferences: {
          currency: 'USD',
          timezone: 'UTC',
          theme: 'dark',
          language: 'en',
          notifications: { email: true, push: true, budgetAlerts: true },
        },
      },
      select: publicUserSelect,
    })

    logger.info(`User registered: ${user.id}`)
    return res.status(201).json({ success: true, user, token: signToken(user.id) })
  } catch (error) {
    next(error)
  }
})

// Login user
router.post('/login', credentialLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (sendValidationErrors(req, res)) return

    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, password: true },
    })

    const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH)
    if (!user || !isPasswordValid) {
      logger.warn(`Failed login attempt from ${req.ip}`)
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const { password: _password, ...userWithoutPassword } = user
    return res.json({ success: true, user: userWithoutPassword, token: signToken(user.id) })
  } catch (error) {
    next(error)
  }
})

// Get current user — requires valid JWT
router.get('/me', protect, (req: AuthRequest, res: Response) => {
  return res.json({ success: true, user: req.user })
})

// Update profile — requires valid JWT
router.put('/profile', protect, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('avatar').optional({ values: 'null' }).isURL({ protocols: ['https'] }).withMessage('Avatar must be an https URL'),
  body('preferences').optional().isObject(),
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (sendValidationErrors(req, res)) return

    const { name, avatar, preferences } = req.body

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(preferences !== undefined && { preferences }),
      },
      select: publicUserSelect,
    })

    return res.json({ success: true, user: updated })
  } catch (error) {
    next(error)
  }
})

// Logout — tokens are stateless; the client discards its token.
router.post('/logout', (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logout successful' })
})

export default router
