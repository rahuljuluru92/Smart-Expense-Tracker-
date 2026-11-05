import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { logger } from '../utils/logger'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // Express identifies error handlers by their 4-argument signature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500
  let message = err.isOperational ? err.message : 'Server Error'

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401
    message = 'Invalid token'
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401
    message = 'Token expired'
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        statusCode = 409
        message = 'Resource already exists'
        break
      case 'P2025':
        statusCode = 404
        message = 'Record not found'
        break
      case 'P2003':
        statusCode = 400
        message = 'Related record not found'
        break
      default:
        statusCode = 500
        message = 'Database error'
    }
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body
    statusCode = 400
    message = 'Invalid JSON payload'
  }

  const logPayload = {
    message: err.message,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    ...(statusCode >= 500 && { stack: err.stack }),
  }
  if (statusCode >= 500) logger.error(logPayload)
  else logger.warn(logPayload)

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError
  error.statusCode = statusCode
  error.isOperational = true
  return error
}
