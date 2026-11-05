import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { errorHandler, createError } from '../src/middleware/error'

jest.mock('../src/utils/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))

function run(err: Error) {
  const json = jest.fn()
  const status = jest.fn(() => ({ json }))
  const req = { originalUrl: '/x', method: 'GET', ip: '1.2.3.4' } as unknown as Request
  errorHandler(err, req, { status } as unknown as Response, jest.fn())
  return { code: (status.mock.calls[0] as unknown[])[0], body: (json.mock.calls[0] as unknown[])[0] as { error: string } }
}

describe('errorHandler', () => {
  it('passes through operational errors', () => {
    const { code, body } = run(createError('Expense not found', 404))
    expect(code).toBe(404)
    expect(body.error).toBe('Expense not found')
  })

  it('hides internal error messages', () => {
    const { code, body } = run(new Error('connection string postgres://secret@db leaked'))
    expect(code).toBe(500)
    expect(body.error).toBe('Server Error')
  })

  it('maps Prisma record-not-found to 404', () => {
    const err = new Prisma.PrismaClientKnownRequestError('nope', { code: 'P2025', clientVersion: 'test' })
    expect(run(err).code).toBe(404)
  })

  it('maps Prisma unique violations to 409', () => {
    const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' })
    expect(run(err).code).toBe(409)
  })
})
