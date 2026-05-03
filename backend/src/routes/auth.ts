import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../middleware/error-handler'

const router = Router()

// POST /api/auth/sync — Sync NextAuth session user to DB
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  const { email, name, image, provider, providerId, accessToken } = req.body
  if (!email || !provider || !providerId) {
    return next(new AppError(400, 'email, provider, and providerId are required'))
  }

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, image, githubToken: provider === 'github' ? accessToken : undefined },
      create: { email, name, image, provider, providerId, githubToken: provider === 'github' ? accessToken : undefined },
    })
    res.json({ userId: user.id, user })
  } catch (err) { next(err) }
})

// GET /api/auth/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return next(new AppError(401, 'No authorization header'))

  try {
    res.json({ message: 'Use NextAuth session for user info' })
  } catch (err) { next(err) }
})

export default router
