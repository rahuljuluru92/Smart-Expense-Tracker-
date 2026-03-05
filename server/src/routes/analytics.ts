import express, { Response, NextFunction } from 'express'
import { query, validationResult } from 'express-validator'
import { protect } from '../middleware/auth'
import { cacheMiddleware } from '../middleware/cache'
import prisma from '../config/database'
import { logger } from '../utils/logger'

const router = express.Router()

// @desc    Get spending analytics
// @route   GET /api/analytics/spending
// @access  Private
router.get('/spending', protect, cacheMiddleware(300), [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
  query('groupBy').optional().isIn(['day', 'week', 'month', 'category']).withMessage('Group by must be day, week, month, or category')
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { startDate, endDate, groupBy = 'month' } = req.query

    // Build date filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate as string)
    if (endDate) dateFilter.lte = new Date(endDate as string)

    // Get total spending
    const totalSpent = await prisma.expense.aggregate({
      where: {
        userId: req.user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      _sum: {
        amount: true
      }
    })

    // Get spending by category
    const spendingByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        userId: req.user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    })

    // Get category details
    const categoryIds = spendingByCategory.map(item => item.categoryId)
    const categories = await prisma.category.findMany({
      where: {
        id: { in: categoryIds }
      }
    })

    const categorySpending = spendingByCategory.map(item => {
      const category = categories.find(cat => cat.id === item.categoryId)
      return {
        category,
        amount: item._sum.amount || 0,
        count: item._count.id
      }
    })

    // Get spending trend — fetch raw rows and aggregate in JS to avoid raw SQL
    const trendExpenses = await prisma.expense.findMany({
      where: {
        userId: req.user.id,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter })
      },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' }
    })

    const bucketKey = (d: Date): string => {
      if (groupBy === 'day') return d.toISOString().slice(0, 10)
      if (groupBy === 'week') {
        // ISO week start (Monday)
        const day = new Date(d)
        const diff = (day.getDay() + 6) % 7
        day.setDate(day.getDate() - diff)
        return day.toISOString().slice(0, 10)
      }
      // month (default)
      return d.toISOString().slice(0, 7)
    }

    const buckets = new Map<string, number>()
    for (const e of trendExpenses) {
      const key = bucketKey(new Date(e.date))
      buckets.set(key, (buckets.get(key) ?? 0) + Number(e.amount))
    }

    const spendingTrend = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, total]) => ({ period, total_amount: parseFloat(total.toFixed(2)) }))

    // Calculate average daily spending over the actual period length
    const totalSpentNum = totalSpent._sum.amount ? Number(totalSpent._sum.amount) : 0
    let periodDays = 30
    if (startDate && endDate) {
      const ms = new Date(endDate as string).getTime() - new Date(startDate as string).getTime()
      periodDays = Math.max(1, Math.round(ms / 86_400_000) + 1)
    }
    const averageDaily = periodDays > 0 ? totalSpentNum / periodDays : 0
    const transactionCount = spendingByCategory.reduce((sum, item) => sum + item._count.id, 0)

    // Get monthly comparison
    const currentMonth = new Date()
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)

    const [currentMonthSpending, previousMonthSpending] = await Promise.all([
      prisma.expense.aggregate({
        where: {
          userId: req.user.id,
          date: {
            gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
            lte: currentMonth
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.expense.aggregate({
        where: {
          userId: req.user.id,
          date: {
            gte: previousMonth,
            lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          }
        },
        _sum: {
          amount: true
        }
      })
    ])

    const currentMonthTotal = Number(currentMonthSpending._sum.amount ?? 0)
    const previousMonthTotal = Number(previousMonthSpending._sum.amount ?? 0)
    const change = currentMonthTotal - previousMonthTotal
    const changePercentage = previousMonthTotal > 0 ? (change / previousMonthTotal) * 100 : 0

    res.json({
      success: true,
      data: {
        totalSpent: totalSpentNum,
        transactionCount,
        averageDaily,
        categorySpending,
        spendingTrend,
        monthlyComparison: {
          currentMonth: currentMonthTotal,
          previousMonth: previousMonthTotal,
          change,
          changePercentage
        }
      }
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Get budget analytics
// @route   GET /api/analytics/budgets
// @access  Private
// Optional query params: startDate, endDate (ISO8601) to filter spending to a specific period.
// When provided, budget spending is calculated over that exact range instead of the
// budget's natural period (daily/weekly/monthly/yearly).
router.get('/budgets', protect, cacheMiddleware(60), [
  query('startDate').optional().isISO8601().withMessage('Start date must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('End date must be a valid date'),
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() })
    }

    const budgets = await prisma.budget.findMany({
      where: { userId: req.user.id, isActive: true },
    })

    const now = new Date()
    const { startDate, endDate } = req.query

    // If explicit date range is given, use it for all budgets (month navigation)
    const rangeOverride = startDate && endDate
      ? { gte: new Date(startDate as string), lte: new Date((endDate as string) + 'T23:59:59.999Z') }
      : null

    const budgetAnalytics = await Promise.all(budgets.map(async (budget) => {
      let periodStart: Date
      let periodEnd: Date = now

      if (rangeOverride) {
        // Use the user-selected date range
        periodStart = rangeOverride.gte
        periodEnd = rangeOverride.lte
      } else {
        // Fall back to the budget's natural period relative to today
        const period = budget.period
        if (period === 'daily') {
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (period === 'weekly') {
          const diff = (now.getDay() + 6) % 7
          periodStart = new Date(now)
          periodStart.setDate(now.getDate() - diff)
          periodStart.setHours(0, 0, 0, 0)
        } else if (period === 'yearly') {
          periodStart = new Date(now.getFullYear(), 0, 1)
        } else {
          // monthly (default)
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        }
      }

      const agg = await prisma.expense.aggregate({
        where: { userId: req.user.id, date: { gte: periodStart, lte: periodEnd } },
        _sum: { amount: true }
      })

      const spent = Number(agg._sum.amount ?? 0)
      const spentPercentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
      const remaining = budget.amount - spent

      return {
        ...budget,
        spent,
        spentPercentage,
        remaining,
        periodStart: periodStart.toISOString(),
        status: spentPercentage >= 100 ? 'exceeded' :
                spentPercentage >= 90 ? 'critical' :
                spentPercentage >= 75 ? 'warning' : 'good'
      }
    }))

    res.json({ success: true, data: budgetAnalytics })
  } catch (error) { next(error) }
})

// @desc    Get location insights
// @route   GET /api/analytics/locations
// @access  Private
router.get('/locations', protect, cacheMiddleware(300), async (req: any, res, next) => {
  try {
    const locationInsights = await prisma.locationInsight.findMany({
      where: {
        userId: req.user.id
      },
      orderBy: {
        totalSpent: 'desc'
      },
      take: 10
    })

    res.json({
      success: true,
      data: locationInsights
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Get spending predictions
// @route   GET /api/analytics/predictions
// @access  Private
router.get('/predictions', protect, cacheMiddleware(300), async (req: any, res, next) => {
  try {
    const predictions = await prisma.spendingPrediction.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: new Date()
        }
      },
      orderBy: {
        date: 'asc'
      },
      take: 30
    })

    res.json({
      success: true,
      data: predictions
    })
  } catch (error) {
    next(error)
  }
})

export default router
