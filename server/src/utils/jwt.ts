import jwt, { SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export interface TokenPayload {
  userId: string
}

const ALGORITHM = 'HS256'

export function signToken(userId: string): string {
  return jwt.sign({ userId } satisfies TokenPayload, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] })
  if (typeof decoded !== 'object' || typeof (decoded as TokenPayload).userId !== 'string') {
    throw new jwt.JsonWebTokenError('Malformed token payload')
  }
  return decoded as TokenPayload
}
