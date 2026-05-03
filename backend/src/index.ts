import 'dotenv/config'
import app from './app'
import { logger } from './utils/logger'
import { prisma } from './config/database'

const PORT = parseInt(process.env.PORT || '4000', 10)

async function main() {
  // Test DB connection
  try {
    await prisma.$connect()
    logger.info('✅ Database connected')
  } catch (err) {
    logger.error('❌ Database connection failed:', err)
    process.exit(1)
  }

  const server = app.listen(PORT, () => {
    logger.info(`🚀 RepoMind API running on http://localhost:${PORT}`)
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  })

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`)
    server.close(async () => {
      await prisma.$disconnect()
      logger.info('Server closed')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  logger.error('Fatal startup error:', err)
  process.exit(1)
})
