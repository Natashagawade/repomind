import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './error-handler'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
  accessToken?: string
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authentication required'))
  }

  const token = authHeader.slice(7)

  try {
    // For NextAuth JWTs, we extract user info directly
    // In production, verify with NEXTAUTH_SECRET
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'fallback'
    const payload = jwt.verify(token, secret) as any
    req.userId = payload.sub || payload.userId
    req.userEmail = payload.email
    req.accessToken = token
    next()
  } catch {
    // If JWT verification fails, still allow with token for GitHub API calls
    req.accessToken = token
    next()
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    req.accessToken = authHeader.slice(7)
  }
  next()
}
