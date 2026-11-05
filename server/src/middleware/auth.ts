import { Request, Response, NextFunction } from 'express'
import { createError } from './error'
import prisma from '../config/database'
import { verifyToken } from '../utils/jwt'

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  preferences: true,
  level: true,
  experience: true,
} as const

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  [key: string]: unknown
}

export interface AuthRequest extends Request {
  user?: AuthUser
}

export const protect = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    return next(createError('Not authorized to access this route', 401))
  }

  try {
    const { userId } = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    })

    if (!user) {
      return next(createError('Not authorized to access this route', 401))
    }

    req.user = user
    next()
  } catch {
    return next(createError('Not authorized to access this route', 401))
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Not authorized to access this route', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Forbidden', 403))
    }

    next()
  }
}
