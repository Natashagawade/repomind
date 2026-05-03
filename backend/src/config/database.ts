import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = global.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }, { emit: 'stdout', level: 'error' }]
    : [{ emit: 'stdout', level: 'error' }],
})

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma
}
