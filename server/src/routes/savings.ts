import express, { Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth'
import prisma from '../config/database'
import { logger } from '../utils/logger'

const router = express.Router()

router.get('/', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ success: true, data: goals })
  } catch (error) { next(error) }
})

router.post('/', protect, [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('type').isIn(['fd', 'stocks', 'real_estate', 'emergency_fund', 'crypto', 'travel', 'other']).withMessage('Invalid type'),
  body('targetAmount').isFloat({ min: 1 }).withMessage('Target must be a positive number'),
  body('savedAmount').optional().isFloat({ min: 0 }),
  body('deadline').optional().isISO8601(),
  body('notes').optional().isString(),
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })
    const { name, type, targetAmount, savedAmount = 0, deadline, notes } = req.body
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: req.user.id, name, type,
        targetAmount: parseFloat(targetAmount),
        savedAmount: parseFloat(savedAmount),
        deadline: deadline ? new Date(deadline) : null,
        notes,
      }
    })
    logger.info(`Savings goal created: ${goal.id} by user ${req.user.id}`)
    res.status(201).json({ success: true, data: goal })
  } catch (error) { next(error) }
})

router.put('/:id', protect, [
  body('savedAmount').optional().isFloat({ min: 0 }),
  body('targetAmount').optional().isFloat({ min: 1 }),
  body('name').optional().trim().isLength({ min: 1 }),
  body('notes').optional().isString(),
  body('deadline').optional().isISO8601(),
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() })
    const existing = await prisma.savingsGoal.findFirst({ where: { id: req.params.id, userId: req.user.id } })
    if (!existing) return res.status(404).json({ success: false, message: 'Goal not found' })
    const { savedAmount, targetAmount, name, notes, deadline } = req.body
    const goal = await prisma.savingsGoal.update({
      where: { id: req.params.id },
      data: {
        ...(savedAmount !== undefined && { savedAmount: parseFloat(savedAmount) }),
        ...(targetAmount !== undefined && { targetAmount: parseFloat(targetAmount) }),
        ...(name !== undefined && { name }),
        ...(notes !== undefined && { notes }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
      }
    })
    res.json({ success: true, data: goal })
  } catch (error) { next(error) }
})

router.delete('/:id', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.savingsGoal.findFirst({ where: { id: req.params.id, userId: req.user.id } })
    if (!existing) return res.status(404).json({ success: false, message: 'Goal not found' })
    await prisma.savingsGoal.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true, message: 'Goal removed' })
  } catch (error) { next(error) }
})

export default router
