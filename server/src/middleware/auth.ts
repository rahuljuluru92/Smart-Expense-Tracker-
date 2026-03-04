import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { createError } from './error'
import prisma from '../config/database'

interface AuthRequest extends Request {
  user?: any
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return next(createError('Not authorized to access this route', 401))
  }

  try {
    // Verify token
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

const user = await prisma.user.findUnique({
  where: { id: decoded.userId }, // ✅ FIXED
  select: {
    id: true,
    email: true,
    name: true,
    avatar: true,
    createdAt: true,
    updatedAt: true,
    preferences: true,
    level: true,
    experience: true
  }
})

    if (!user) {
      return next(createError('User not found', 401))
    }

    req.user = user
    next()
  } catch (error) {
    return next(createError('Not authorized to access this route', 401))
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('User not found', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(createError(`User role ${req.user.role} is not authorized to access this route`, 403))
    }

    next()
  }
}
