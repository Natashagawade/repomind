import { Router, Response, NextFunction } from 'express'
import { optionalAuth, AuthRequest } from '../middleware/auth'
import { prisma } from '../config/database'
import { AppError } from '../middleware/error-handler'

const router = Router()

// GET /api/metrics — Global metrics for user
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId: req.userId || 'anonymous', status: 'COMPLETE' },
      select: { metadata: true, results: true, repoName: true, createdAt: true },
    })

    const aggregated = analyses.reduce((acc, a) => {
      const meta = a.metadata as any
      if (!meta) return acc
      acc.totalLines += meta.totalLines || 0
      acc.totalFiles += meta.fileCount || 0
      acc.totalDeps += meta.dependencies?.length || 0
      acc.totalRoutes += meta.apiRouteCount || 0
      return acc
    }, { totalLines: 0, totalFiles: 0, totalDeps: 0, totalRoutes: 0 })

    res.json({
      global: aggregated,
      repoCount: analyses.length,
      analyses: analyses.map(a => ({
        repoName: a.repoName,
        metadata: a.metadata,
        createdAt: a.createdAt,
      })),
    })
  } catch (err) { next(err) }
})

// GET /api/metrics/:analysisId — Metrics for specific analysis
router.get('/:analysisId', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: req.params.analysisId },
      select: { metadata: true, results: true, repoName: true },
    })
    if (!analysis) return next(new AppError(404, 'Analysis not found'))

    const results = analysis.results as any
    res.json({
      repoName: analysis.repoName,
      metadata: analysis.metadata,
      metrics: results?.metrics || null,
    })
  } catch (err) { next(err) }
})

export default router
