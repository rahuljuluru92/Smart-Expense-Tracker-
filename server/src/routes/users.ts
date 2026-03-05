import express, { Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth'
import { invalidateUserCache } from '../middleware/cache'
import prisma from '../config/database'
import { logger } from '../utils/logger'

const router = express.Router()

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        preferences: true,
        level: true,
        experience: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      data: user
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Get user categories
// @route   GET /api/users/categories
// @access  Private
router.get('/categories', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' }
    })

    res.json({
      success: true,
      data: categories
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Get user budgets
// @route   GET /api/users/budgets
// @access  Private
router.get('/budgets', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: budgets
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Create budget
// @route   POST /api/users/budgets
// @access  Private
router.post('/budgets', protect, [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Period must be daily, weekly, monthly, or yearly'),
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const { amount, period = 'monthly' } = req.body

    const budget = await prisma.budget.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amount),
        period,
      }
    })

    logger.info(`Budget created: ${budget.id} by user ${req.user.id}`)
    await invalidateUserCache(req.user.id)

    res.status(201).json({ success: true, data: budget })
  } catch (error) {
    next(error)
  }
})

// @desc    Update budget
// @route   PUT /api/users/budgets/:id
// @access  Private
router.put('/budgets/:id', protect, [
  body('amount').optional().isFloat({ min: 1 }).withMessage('Amount must be a positive number'),
  body('period').optional().isIn(['daily', 'weekly', 'monthly', 'yearly']).withMessage('Invalid period'),
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const budget = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' })
    }

    const { amount, period } = req.body
    const updated = await prisma.budget.update({
      where: { id: req.params.id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(period && { period }),
      }
    })

    await invalidateUserCache(req.user.id)
    res.json({ success: true, data: updated })
  } catch (error) {
    next(error)
  }
})

// @desc    Delete budget
// @route   DELETE /api/users/budgets/:id
// @access  Private
router.delete('/budgets/:id', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const budget = await prisma.budget.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    })

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' })
    }

    await prisma.budget.delete({ where: { id: req.params.id } })

    logger.info(`Budget deleted: ${req.params.id} by user ${req.user.id}`)
    await invalidateUserCache(req.user.id)

    res.json({ success: true, message: 'Budget deleted' })
  } catch (error) {
    next(error)
  }
})

// @desc    Get user achievements
// @route   GET /api/users/achievements
// @access  Private
router.get('/achievements', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const achievements: unknown[] = []

    res.json({
      success: true,
      data: achievements
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Get user notifications
// @route   GET /api/users/notifications
// @access  Private
router.get('/notifications', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    res.json({
      success: true,
      data: notifications
    })
  } catch (error) {
    next(error)
  }
})

export default router
