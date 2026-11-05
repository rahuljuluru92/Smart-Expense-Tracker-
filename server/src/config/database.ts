import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
})

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`)
    logger.debug(`Params: ${e.params}`)
    logger.debug(`Duration: ${e.duration}ms`)
  })
}


export default prisma
