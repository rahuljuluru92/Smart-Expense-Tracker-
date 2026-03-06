import express, { Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'
import { protect } from '../middleware/auth'
import prisma from '../config/database'
import { logger } from '../utils/logger'

const router = express.Router()

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req: any, res: Response, next: NextFunction) => {
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

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread
// @access  Private
router.get('/unread', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    })

    res.json({
      success: true,
      data: { count }
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    const updatedNotification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    })

    return res.json({
      success: true,
      data: updatedNotification
    })
  } catch (error) {
    return next(error)
  }
})

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    })

    res.json({
      success: true,
      message: 'All notifications marked as read'
    })
  } catch (error) {
    next(error)
  }
})

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req: any, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    })

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    await prisma.notification.delete({
      where: { id: req.params.id }
    })

    return res.json({
      success: true,
      message: 'Notification deleted successfully'
    })
  } catch (error) {
    return next(error)
  }
})

// @desc    Create notification (internal use)
// @route   POST /api/notifications
// @access  Private
router.post('/', protect, [
  body('type').isString().withMessage('Type is required'),
  body('title').isString().withMessage('Title is required'),
  body('message').isString().withMessage('Message is required'),
  body('data').optional().isObject().withMessage('Data must be an object')
], async (req: any, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      })
    }

    const { type, title, message, data } = req.body

    const notification = await prisma.notification.create({
      data: {
        type,
        title,
        message,
        data,
        userId: req.user.id
      }
    })

    // Emit real-time notification if Socket.IO is available
    const io = req.app.get('io')
    if (io) {
      io.to(`user-${req.user.id}`).emit('notification', notification)
    }

    res.status(201).json({
      success: true,
      data: notification
    })
  } catch (error) {
    next(error)
  }
})

export default router
