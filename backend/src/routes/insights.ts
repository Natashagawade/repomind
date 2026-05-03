/**
 * insights.ts — AI Insights routes
 * GET /api/insights/resume-generator?repoUrl=...
 * GET /api/insights/contribution-insights?repoUrl=...
 * GET /api/insights/repo-health?repoUrl=...
 * GET /api/insights/readme-generator?repoUrl=...
 */
import { Router, Response, NextFunction } from 'express'
import { optionalAuth, AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error-handler'
import { logger } from '../utils/logger'
import { parseRepoUrl, fetchCommitActivity, fetchContributors, fetchRecentCommits, fetchTopModifiedFiles, fetchRepoMeta } from '../services/repoAnalyzer.service'
import { computeHealthScore } from '../services/healthScore.service'
import { generateResumeData } from '../services/resumeGenerator.service'
import { generateReadmeContent } from '../services/readmeGenerator.service'

const router = Router()

// ─── Helper to extract owner/repo ─────────────────────────────────────────────
function extractOwnerRepo(repoUrl: string, next: NextFunction): { owner: string; repo: string } | null {
  const parsed = parseRepoUrl(repoUrl)
  if (!parsed) {
    next(new AppError(400, 'Invalid GitHub repository URL'))
    return null
  }
  return parsed
}

// ─── GET /api/insights/resume-generator ──────────────────────────────────────
router.get('/resume-generator', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { repoUrl } = req.query as { repoUrl: string }
  if (!repoUrl) return next(new AppError(400, 'repoUrl query parameter is required'))

  const parsed = extractOwnerRepo(repoUrl, next)
  if (!parsed) return

  try {
    logger.info(`[AI Insights] Resume generator: ${parsed.owner}/${parsed.repo}`)
    const result = await generateResumeData(parsed.owner, parsed.repo, req.accessToken)
    res.json({ ...result, repoUrl, repoName: `${parsed.owner}/${parsed.repo}` })
  } catch (err: any) {
    if (err?.response?.status === 404) return next(new AppError(404, 'Repository not found or is private'))
    if (err?.response?.status === 403) return next(new AppError(403, 'GitHub API rate limit exceeded'))
    logger.error('[AI Insights] Resume generator error:', err?.message)
    next(err)
  }
})

// ─── GET /api/insights/contribution-insights ──────────────────────────────────
router.get('/contribution-insights', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { repoUrl } = req.query as { repoUrl: string }
  if (!repoUrl) return next(new AppError(400, 'repoUrl query parameter is required'))

  const parsed = extractOwnerRepo(repoUrl, next)
  if (!parsed) return

  const { owner, repo } = parsed

  try {
    logger.info(`[AI Insights] Contribution insights: ${owner}/${repo}`)

    const [meta, rawActivity, contributors, recentCommits, topFiles] = await Promise.all([
      fetchRepoMeta(owner, repo, req.accessToken),
      fetchCommitActivity(owner, repo, req.accessToken),
      fetchContributors(owner, repo, req.accessToken),
      fetchRecentCommits(owner, repo, req.accessToken),
      fetchTopModifiedFiles(owner, repo, req.accessToken),
    ])

    // ── Commit frequency line chart (last 52 weeks → last 12 for display) ───
    const weeklyCommits = (Array.isArray(rawActivity) ? rawActivity : [])
      .slice(-12)
      .map((w: any, i: number) => {
        const weekStart = new Date(Date.now() - (12 - i) * 7 * 24 * 60 * 60 * 1000)
        return {
          week: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          commits: w?.total || 0,
          additions: w?.days?.reduce((s: number, d: number) => s + d, 0) || 0,
        }
      })

    // ── Top contributors bar chart ────────────────────────────────────────────
    const safeContributors = Array.isArray(contributors) ? contributors : []
    const totalContributions = safeContributors.reduce((s: number, c: any) => s + (c.total || 0), 0)
    const topContributors = safeContributors
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10)
      .map((c: any) => ({
        login: c.author?.login || 'unknown',
        avatarUrl: c.author?.avatar_url || '',
        total: c.total || 0,
        percentage: totalContributions > 0 ? Math.round((c.total / totalContributions) * 100) : 0,
        weeks: (c.weeks || []).slice(-12).map((w: any) => ({
          w: w.w,
          commits: w.c || 0,
          additions: w.a || 0,
          deletions: w.d || 0,
        })),
      }))

    // ── Activity heatmap (last 6 months from recent commits) ─────────────────
    const heatmapData: Record<string, number> = {}
    for (const commit of recentCommits) {
      const date = commit.commit?.author?.date?.slice(0, 10)
      if (date) heatmapData[date] = (heatmapData[date] || 0) + 1
    }
    const heatmap = Object.entries(heatmapData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))

    // ── Contribution percentage pie chart ─────────────────────────────────────
    const pieData = topContributors.slice(0, 6).map(c => ({
      name: c.login,
      value: c.total,
      percentage: c.percentage,
    }))
    // Add "Others" slice if needed
    const coveredTotal = topContributors.slice(0, 6).reduce((s, c) => s + c.total, 0)
    if (totalContributions > coveredTotal) {
      pieData.push({
        name: 'Others',
        value: totalContributions - coveredTotal,
        percentage: 100 - topContributors.slice(0, 6).reduce((s, c) => s + c.percentage, 0),
      })
    }

    // ── Summary stats ─────────────────────────────────────────────────────────
    const totalCommitsAllTime = safeContributors.reduce((s: number, c: any) => s + (c.total || 0), 0)
    const last4WeekCommits = weeklyCommits.slice(-4).reduce((s, w) => s + w.commits, 0)

    res.json({
      repoUrl,
      repoName: `${owner}/${repo}`,
      repoMeta: {
        name: meta.name,
        description: meta.description || '',
        stars: meta.stargazers_count,
        forks: meta.forks_count,
        watchers: meta.watchers_count,
        openIssues: meta.open_issues_count,
        language: meta.language,
        createdAt: meta.created_at,
        updatedAt: meta.updated_at,
      },
      summary: {
        totalCommits: totalContributions,
        totalCommitsAllTime,
        last4WeekCommits,
        totalContributors: safeContributors.length,
        topContributor: topContributors[0]?.login || 'N/A',
        topContributorPct: topContributors[0]?.percentage || 0,
      },
      weeklyCommits,
      topContributors,
      heatmap,
      pieData,
      topModifiedFiles: topFiles,
    })
  } catch (err: any) {
    if (err?.response?.status === 404) return next(new AppError(404, 'Repository not found or is private'))
    if (err?.response?.status === 403) return next(new AppError(403, 'GitHub API rate limit exceeded'))
    logger.error('[AI Insights] Contribution insights error:', err?.message)
    next(err)
  }
})

// ─── GET /api/insights/repo-health ───────────────────────────────────────────
router.get('/repo-health', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { repoUrl } = req.query as { repoUrl: string }
  if (!repoUrl) return next(new AppError(400, 'repoUrl query parameter is required'))

  const parsed = extractOwnerRepo(repoUrl, next)
  if (!parsed) return

  try {
    logger.info(`[AI Insights] Repo health: ${parsed.owner}/${parsed.repo}`)
    const result = await computeHealthScore(parsed.owner, parsed.repo, req.accessToken)
    res.json({ ...result, repoUrl, repoName: `${parsed.owner}/${parsed.repo}` })
  } catch (err: any) {
    if (err?.response?.status === 404) return next(new AppError(404, 'Repository not found or is private'))
    if (err?.response?.status === 403) return next(new AppError(403, 'GitHub API rate limit exceeded'))
    logger.error('[AI Insights] Repo health error:', err?.message)
    next(err)
  }
})

// ─── GET /api/insights/readme-generator ──────────────────────────────────────
router.get('/readme-generator', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { repoUrl } = req.query as { repoUrl: string }
  if (!repoUrl) return next(new AppError(400, 'repoUrl query parameter is required'))

  const parsed = extractOwnerRepo(repoUrl, next)
  if (!parsed) return

  try {
    logger.info(`[AI Insights] README generator: ${parsed.owner}/${parsed.repo}`)
    const result = await generateReadmeContent(parsed.owner, parsed.repo, req.accessToken)
    res.json({
      ...result,
      repoUrl,
      repoName: `${parsed.owner}/${parsed.repo}`,
      filename: 'README.md',
    })
  } catch (err: any) {
    if (err?.response?.status === 404) return next(new AppError(404, 'Repository not found or is private'))
    if (err?.response?.status === 403) return next(new AppError(403, 'GitHub API rate limit exceeded'))
    logger.error('[AI Insights] README generator error:', err?.message)
    next(err)
  }
})

export default router
