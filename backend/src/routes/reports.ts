import { Router, Response, NextFunction } from 'express'
import { optionalAuth, AuthRequest } from '../middleware/auth'
import { prisma } from '../config/database'
import { AppError } from '../middleware/error-handler'
import { generateReadme, generateResumeBullets, generateInterviewQuestions } from '../services/analysis-engine'

const router = Router()

// GET /api/reports/:analysisId
router.get('/:analysisId', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analysis = await prisma.analysis.findUnique({
      where: { id: req.params.analysisId },
      include: { reports: true },
    })
    if (!analysis) return next(new AppError(404, 'Analysis not found'))
    res.json({ analysis, reports: analysis.reports })
  } catch (err) { next(err) }
})

// POST /api/reports/export
router.post('/export', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { analysisId, type, format, mode } = req.body
  if (!analysisId || !type) return next(new AppError(400, 'analysisId and type are required'))

  try {
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } })
    if (!analysis) return next(new AppError(404, 'Analysis not found'))

    const results = analysis.results as any
    let content = ''

    switch (type) {
      case 'readme':
        if (results?.readme?.[mode || 'professional']) {
          content = results.readme[mode || 'professional']
        }
        break
      case 'bullets':
        content = (results?.resumeBullets || []).map((b: string) => `• ${b}`).join('\n')
        break
      case 'api_docs':
        content = JSON.stringify(results?.apiDocs || [], null, 2)
        break
      case 'security':
        content = JSON.stringify(results?.security || {}, null, 2)
        break
      case 'full':
        content = JSON.stringify(results || {}, null, 2)
        break
      default:
        return next(new AppError(400, `Unknown report type: ${type}`))
    }

    // Save report to DB
    await prisma.report.create({
      data: {
        analysisId,
        userId: req.userId || 'anonymous',
        type: type.toUpperCase() as any,
        content,
        format: format || 'txt',
      },
    })

    res.json({ content, format: format || 'txt' })
  } catch (err) { next(err) }
})

// POST /api/reports/generate-readme — Generate additional README modes
router.post('/generate-readme', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { analysisId, mode } = req.body
  if (!analysisId) return next(new AppError(400, 'analysisId required'))

  try {
    const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } })
    if (!analysis) return next(new AppError(404, 'Analysis not found'))

    // For additional modes not pre-generated
    res.json({ message: 'Use the /export endpoint with type=readme and mode parameter', analysisId })
  } catch (err) { next(err) }
})

export default router
