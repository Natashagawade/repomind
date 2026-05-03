import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/request-logger'

// Route imports
import analyzeRoutes from './routes/analyze'
import reportsRoutes from './routes/reports'
import githubRoutes from './routes/github'
import metricsRoutes from './routes/metrics'
import authRoutes from './routes/auth'
import insightsRoutes from './routes/insights'

const app = express()

// Trust proxy (for rate limiting behind Vercel/Railway)
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}))

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Compression
app.use(compression())

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use(requestLogger)

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', globalLimiter)

// Analysis rate limiter (more restrictive)
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Analysis limit reached. Please wait before running another analysis.' },
})

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'repomind-api',
  })
})

// API routes
app.use('/api/auth', authRoutes)
app.use('/api/analyze', analysisLimiter, analyzeRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/github', githubRoutes)
app.use('/api/metrics', metricsRoutes)
app.use('/api/insights', insightsRoutes)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` })
})

// Error handler
app.use(errorHandler)

export default app
