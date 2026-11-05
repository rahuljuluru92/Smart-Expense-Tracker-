import jwt from 'jsonwebtoken'
import { signToken, verifyToken } from '../src/utils/jwt'

describe('jwt utils', () => {
  it('round-trips the user id', () => {
    const token = signToken('user_123')
    expect(verifyToken(token).userId).toBe('user_123')
  })

  it('rejects tokens signed with another secret', () => {
    const forged = jwt.sign({ userId: 'user_123' }, 'fallback-secret')
    expect(() => verifyToken(forged)).toThrow()
  })

  it('rejects the "none" algorithm', () => {
    const unsigned = jwt.sign({ userId: 'user_123' }, '', { algorithm: 'none' })
    expect(() => verifyToken(unsigned)).toThrow()
  })

  it('rejects tokens without a userId', () => {
    const token = jwt.sign({ sub: 'x' }, process.env.JWT_SECRET!)
    expect(() => verifyToken(token)).toThrow()
  })

  it('rejects expired tokens', () => {
    const expired = jwt.sign({ userId: 'u', exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET!)
    expect(() => verifyToken(expired)).toThrow(jwt.TokenExpiredError)
  })
})
