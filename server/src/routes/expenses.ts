import express, { Response, NextFunction } from 'express'
import { body, query, validationResult } from 'express-validator'
import { protect } from '../middleware/auth'
import { createError } from '../middleware/error'
import { cacheMiddleware, invalidateUserCache } from '../middleware/cache'
import prisma from '../config/database'
import { logger } from '../utils/logger'

const router = express.Router()

// @desc    Get all expenses for user
// @route   GET /api/expenses
// @access  Private
router.get('/', protect, cacheMiddleware(60), [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().isString().withMessage('Category must be a string'),
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('minAmount').optional().isFloat({ min: 0 }).withMessage('Min amount must be a positive number'),
  query('maxAmount').optional().isFloat({ min: 0 }).withMessage('Max amount must be a positive number')
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const {
      page = 1,
      limit = 20,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount
    } = req.query

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)

    // Build where clause
    const where: any = {
      userId: req.user.id
    }

    if (category) {
      where.categoryId = category
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }

    if (minAmount || maxAmount) {
      where.amount = {}
      if (minAmount) where.amount.gte = parseFloat(minAmount as string)
      if (maxAmount) where.amount.lte = parseFloat(maxAmount as string)
    }

    // Get expenses with pagination
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.expense.count({ where })
    ])

    const totalPages = Math.ceil(total / parseInt(limit as string))

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages
      }
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
router.get('/:id', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      include: {
        category: true
      }
    })

    if (!expense) {
      return next(createError('Expense not found', 404))
    }

    res.json({
      success: true,
      data: expense
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
router.post('/', protect, [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('categoryName').optional().isString().withMessage('Category name must be a string'),
  body('categoryId').optional().isString().withMessage('Category ID must be a string'),
  body('date').isISO8601().withMessage('Date must be a valid date'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean'),
  body('recurringPattern').optional().isObject().withMessage('Recurring pattern must be an object')
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const {
      amount,
      currency = 'USD',
      description,
      categoryName,
      date,
      location,
      tags = [],
      isRecurring = false,
      recurringPattern
    } = req.body

    let { categoryId } = req.body

    // Resolve categoryId from categoryName (findOrCreate)
    if (!categoryId && categoryName) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName, userId: req.user.id }
      })
      if (!category) {
        category = await prisma.category.create({
          data: { name: categoryName, userId: req.user.id }
        })
      }
      categoryId = category.id
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId or categoryName is required'
      })
    }

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.user.id }
    })

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      })
    }

    const parsedAmount = parseFloat(amount)

    // Create the expense and update the category total atomically
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
      data: {
        amount: parsedAmount,
        currency,
        description,
        categoryId,
        date: new Date(date),
        location,
        tags,
        isRecurring,
        recurringPattern,
        userId: req.user.id
      },
      include: {
        category: true
      }
      })

      await tx.category.update({
        where: { id: categoryId },
        data: { spent: { increment: parsedAmount } }
      })

      return created
    })

    logger.info(`New expense created: ${expense.id} by user ${req.user.id}`)
    await invalidateUserCache(req.user.id)

    res.status(201).json({
      success: true,
      data: expense
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
router.put('/:id', protect, [
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isString().withMessage('Currency must be a string'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Description cannot be empty'),
  body('categoryId').optional().isString().withMessage('Category ID must be a string'),
  body('categoryName').optional().isString().withMessage('Category name must be a string'),
  body('date').optional().isISO8601().withMessage('Date must be a valid date'),
  body('location').optional().isObject().withMessage('Location must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isRecurring').optional().isBoolean().withMessage('isRecurring must be a boolean'),
  body('recurringPattern').optional().isObject().withMessage('Recurring pattern must be an object')
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    // Get existing expense
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!existingExpense) {
      return next(createError('Expense not found', 404))
    }

    const {
      amount,
      currency,
      description,
      categoryName,
      date,
      location,
      tags,
      isRecurring,
      recurringPattern
    } = req.body

    let { categoryId } = req.body

    // Resolve categoryId from categoryName if provided
    if (!categoryId && categoryName) {
      let cat = await prisma.category.findFirst({
        where: { name: categoryName, userId: req.user.id }
      })
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: categoryName, userId: req.user.id }
        })
      }
      categoryId = cat.id
    }

    // Explicit undefined checks so legitimate falsy values (amount 0, isRecurring false) are applied
    const newAmount = amount !== undefined ? parseFloat(amount) : existingExpense.amount
    const categoryChanged = categoryId !== undefined && categoryId !== existingExpense.categoryId

    if (categoryChanged) {
      const newCategory = await prisma.category.findFirst({
        where: { id: categoryId, userId: req.user.id }
      })
      if (!newCategory) {
        return res.status(400).json({ success: false, message: 'Category not found' })
      }
    }

    // Keep category totals and the expense row consistent: all writes succeed or none do
    const updatedExpense = await prisma.$transaction(async (tx) => {
      if (categoryChanged) {
        await tx.category.update({
          where: { id: existingExpense.categoryId },
          data: { spent: { decrement: existingExpense.amount } }
        })
        await tx.category.update({
          where: { id: categoryId },
          data: { spent: { increment: newAmount } }
        })
      } else if (newAmount !== existingExpense.amount) {
        await tx.category.update({
          where: { id: existingExpense.categoryId },
          data: { spent: { increment: newAmount - existingExpense.amount } }
        })
      }

      return tx.expense.update({
        where: { id: existingExpense.id },
        data: {
          ...(amount !== undefined && { amount: newAmount }),
          ...(currency !== undefined && { currency }),
          ...(description !== undefined && { description }),
          ...(categoryChanged && { categoryId }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(location !== undefined && { location }),
          ...(tags !== undefined && { tags }),
          ...(isRecurring !== undefined && { isRecurring }),
          ...(recurringPattern !== undefined && { recurringPattern })
        },
        include: { category: true }
      })
    })

    logger.info(`Expense updated: ${updatedExpense.id} by user ${req.user.id}`)
    await invalidateUserCache(req.user.id)

    res.json({
      success: true,
      data: updatedExpense
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
router.delete('/:id', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!expense) {
      return next(createError('Expense not found', 404))
    }

    await prisma.$transaction([
      prisma.category.update({
        where: { id: expense.categoryId },
        data: { spent: { decrement: expense.amount } }
      }),
      prisma.expense.delete({ where: { id: expense.id } })
    ])

    logger.info(`Expense deleted: ${req.params.id} by user ${req.user.id}`)
    await invalidateUserCache(req.user.id)

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    })
  } catch (error) {
    next(error)
  }
})

export default router
