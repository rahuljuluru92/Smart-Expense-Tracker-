import express, { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { PrismaClient } from '@prisma/client'
import { protect } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Register user
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { name, email, password } = req.body

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        preferences: JSON.stringify({
          currency: 'USD',
          timezone: 'UTC',
          theme: 'dark',
          language: 'en',
          notifications: { email: true, push: true, budgetAlerts: true }
        })
      },
      select: {
        id: true, name: true, email: true, avatar: true,
        preferences: true, level: true, experience: true, createdAt: true
      }
    })

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    return res.status(201).json({ success: true, user, token })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true, password: true,
        avatar: true, preferences: true, level: true, experience: true, createdAt: true
      }
    })

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    const { password: _, ...userWithoutPassword } = user
    return res.json({ success: true, user: userWithoutPassword, token })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Get current user — requires valid JWT
router.get('/me', protect, async (req: any, res: Response) => {
  try {
    return res.json({ success: true, user: req.user })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Update profile — requires valid JWT
router.put('/profile', protect, async (req: any, res: Response) => {
  try {
    const { name, avatar, preferences } = req.body

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(avatar !== undefined && { avatar }),
        ...(preferences && { preferences: JSON.stringify(preferences) })
      },
      select: {
        id: true, name: true, email: true, avatar: true,
        preferences: true, level: true, experience: true, createdAt: true
      }
    })

    return res.json({ success: true, user: updated })
  } catch (error) {
    console.error('Update profile error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Logout
router.post('/logout', async (_req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logout successful' })
})

export default router
