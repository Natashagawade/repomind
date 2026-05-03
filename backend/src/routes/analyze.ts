import { Router, Response, NextFunction } from 'express'
import axios from 'axios'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { optionalAuth, AuthRequest } from '../middleware/auth'
import { parserService } from '../services/parser-engine'
import {
  generateArchitectureExplanation,
  generateReadme,
  generateResumeBullets,
  detectApiRoutes,
  runSecurityScan,
  analyzeCodeQuality,
  generateImprovements,
  generateDeploymentGuide,
  generateInterviewQuestions,
} from '../services/analysis-engine'
import { prisma } from '../config/database'
import { logger } from '../utils/logger'
import { AppError } from '../middleware/error-handler'

const router = Router()

// ─── OS-safe temp dirs (works on Windows + Linux) ────────────────────────────
const UPLOADS_DIR = path.join(os.tmpdir(), 'repomind-uploads')
const EXTRACT_DIR = path.join(os.tmpdir(), 'repomind-extracted')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })
fs.mkdirSync(EXTRACT_DIR, { recursive: true })

// ─── SSE Helper ──────────────────────────────────────────────────────────────
function sendSSE(res: Response, event: string, data: unknown) {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  } catch { /* client disconnected */ }
}

// ─── Language color map ───────────────────────────────────────────────────────
function getLanguageColor(language: string): string {
  const colorMap: Record<string, string> = {
    JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5',
    Go: '#00ADD8', Rust: '#dea584', Java: '#b07219', Ruby: '#701516',
    PHP: '#4F5D95', 'C#': '#178600', 'C++': '#f34b7d', CSS: '#563d7c',
    HTML: '#e34c26', Shell: '#89e051', SQL: '#e38c00', Swift: '#F05138',
    Kotlin: '#7F52FF', Dart: '#00B4AB', Vue: '#42b883', SCSS: '#c6538c',
  }
  return colorMap[language] || '#8b949e'
}

// ─── GET /api/analyze/stream?repoUrl=... — Real-time SSE analysis ─────────────
router.get('/stream', optionalAuth, async (req: AuthRequest, res: Response) => {
  const { repoUrl } = req.query as { repoUrl: string }

  // ── Validate ──
  if (!repoUrl) {
    res.status(400).json({ error: 'repoUrl query param required' })
    return
  }
  const githubMatch = repoUrl.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/)
  if (!githubMatch) {
    res.status(400).json({ error: 'Only GitHub repository URLs are supported' })
    return
  }

  const [, owner, repoSlug] = githubMatch
  const cleanRepo = repoSlug.replace(/\.git$/, '')
  const repoName = `${owner}/${cleanRepo}`
  const extractId = uuidv4()
  const extractDir = path.join(EXTRACT_DIR, extractId)
  let zipPath: string | null = null

  // ── Set up SSE headers ──
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-store, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.flushHeaders()

  // Keep-alive ping every 10s so the browser doesn't close the connection
  const keepAlive = setInterval(() => sendSSE(res, 'ping', { ts: Date.now() }), 10000)

  const emit = (step: string, status: 'running' | 'done' | 'error', message: string, data?: unknown) => {
    sendSSE(res, 'progress', { step, status, message, data, ts: Date.now() })
  }

  try {
    // ── STEP 1: Download ──────────────────────────────────────────────────────
    emit('download', 'running', `Downloading ${repoName}…`)

    const zipUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/zipball`
    const headers: Record<string, string> = {
      'User-Agent': 'RepoMind/2.0',
      'Accept': 'application/vnd.github+json',
    }
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    // User's own GitHub token from OAuth (passed as query param since EventSource doesn't support headers)
    if (req.query.token) headers['Authorization'] = `token ${req.query.token}`

    const response = await axios.get(zipUrl, {
      headers,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 60000,
    })

    zipPath = path.join(UPLOADS_DIR, `${extractId}.zip`)
    fs.writeFileSync(zipPath, response.data)
    const fileSizeMB = (response.data.byteLength / 1024 / 1024).toFixed(1)
    emit('download', 'done', `Downloaded ${repoName} (${fileSizeMB} MB)`)

    // ── STEP 2: Extract & Parse ───────────────────────────────────────────────
    emit('extract', 'running', 'Extracting and parsing repository…')
    fs.mkdirSync(extractDir, { recursive: true })
    await parserService.extractZip(zipPath, extractDir)
    fs.rmSync(zipPath, { force: true })
    zipPath = null

    const repo = await parserService.parseDirectory(extractDir)
    const totalLangLines = Object.values(repo.languages).reduce((a, b) => a + b, 0) || 1
    const languageBreakdown = Object.entries(repo.languages)
      .sort(([, a], [, b]) => b - a)
      .map(([language, lines]) => ({
        language, lines,
        percentage: Math.round((lines / totalLangLines) * 100),
        color: getLanguageColor(language),
      }))

    emit('extract', 'done', `Parsed ${repo.fileCount} files · ${repo.totalLines.toLocaleString()} lines`, {
      fileCount: repo.fileCount,
      totalLines: repo.totalLines,
      languages: languageBreakdown,
      frameworks: repo.frameworks,
    })

    // Emit techstack immediately (no AI needed)
    emit('techstack', 'done', `Tech stack: ${repo.frameworks.slice(0, 4).join(', ') || Object.keys(repo.languages).slice(0, 3).join(', ')}`, {
      languages: languageBreakdown,
      frameworks: repo.frameworks,
      dependencies: repo.dependencies.slice(0, 30),
      hasDockerfile: repo.hasDockerfile,
      hasTests: repo.hasTests,
    })

    // ── STEP 3: Architecture ──────────────────────────────────────────────────
    emit('architecture', 'running', 'AI analyzing architecture and patterns…')
    const architecture = await generateArchitectureExplanation(repo)
    emit('architecture', 'done', 'Architecture analysis complete', architecture)

    // ── STEP 4: Security ──────────────────────────────────────────────────────
    emit('security', 'running', 'Running security vulnerability scan…')
    const security = await runSecurityScan(repo)
    emit('security', 'done', `Security score: ${security?.score ?? '—'}/100`, security)

    // ── STEP 5: Code Quality ──────────────────────────────────────────────────
    emit('quality', 'running', 'Analyzing code quality…')
    const quality = await analyzeCodeQuality(repo)
    emit('quality', 'done', `Quality scores: Maintainability ${quality?.maintainabilityScore ?? '—'}, Readability ${quality?.readabilityScore ?? '—'}`, quality)

    // ── STEP 6: API Routes ────────────────────────────────────────────────────
    emit('api', 'running', 'Detecting API endpoints…')
    const apiDocs = await detectApiRoutes(repo)
    emit('api', 'done', `Found ${(apiDocs as any[]).length} API routes`, apiDocs)

    // ── STEP 7: Docs (README + Resume) ───────────────────────────────────────
    emit('docs', 'running', 'Generating README and resume bullets…')
    const [readme, bullets] = await Promise.all([
      generateReadme(repo, 'professional'),
      generateResumeBullets(repo),
    ])
    emit('docs', 'done', `README generated · ${(bullets as string[]).length} resume bullets`, { readme, bullets })

    // ── STEP 8: Extras ────────────────────────────────────────────────────────
    emit('extras', 'running', 'Generating improvements, deployment guide, interview questions…')
    const [improvements, deployGuide, interviewQs] = await Promise.all([
      generateImprovements(repo),
      generateDeploymentGuide(repo),
      generateInterviewQuestions(repo),
    ])
    emit('extras', 'done', `${(improvements as any[]).length} improvements · ${(interviewQs as any[]).length} interview Qs`, {
      improvements,
      deployGuide,
      interviewQs,
    })

    // ── Save to DB ────────────────────────────────────────────────────────────
    const metadata = {
      fileCount: repo.fileCount,
      totalLines: repo.totalLines,
      languages: languageBreakdown,
      frameworks: repo.frameworks,
      dependencies: repo.dependencies,
      folderDepth: repo.maxDepth,
      apiRouteCount: (apiDocs as any[]).length,
      hasDockerfile: repo.hasDockerfile,
      hasTests: repo.hasTests,
      hasReadme: repo.hasReadme,
      fileList: repo.files.map(f => f.path).slice(0, 200),
    }
    const results = {
      architecture,
      techStack: {
        languages: Object.keys(repo.languages),
        frameworks: repo.frameworks,
        databases: repo.frameworks.filter(f => ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Prisma', 'Sequelize', 'TypeORM'].includes(f)),
        libraries: repo.dependencies.slice(0, 30),
        deploymentConfigs: [
          repo.hasDockerfile ? 'Docker' : null,
          repo.files.some(f => f.name === 'vercel.json') ? 'Vercel' : null,
        ].filter(Boolean),
      },
      readme: { professional: readme, minimal: '', opensource: '', recruiter: '' },
      resumeBullets: bullets,
      apiDocs,
      security,
      codeQuality: quality,
      improvements,
      deploymentGuide: { platforms: deployGuide },
      interviewQuestions: interviewQs,
      metrics: {
        languageBreakdown,
        linesOfCode: repo.totalLines,
        dependencyCount: repo.dependencies.length,
        apiRouteCount: (apiDocs as any[]).length,
        folderComplexity: repo.maxDepth,
        fileCount: repo.fileCount,
      },
    }

    let analysisId = extractId
    try {
      const analysis = await prisma.analysis.create({
        data: {
          id: extractId,
          userId: req.userId || 'anonymous',
          repoName,
          repoUrl,
          inputType: 'URL',
          status: 'COMPLETE',
          metadata,
          results,
          completedAt: new Date(),
        },
      })
      analysisId = analysis.id
    } catch (dbErr) {
      logger.warn('Failed to save analysis to DB (non-fatal):', dbErr)
    }

    // ── Send final complete event ─────────────────────────────────────────────
    sendSSE(res, 'complete', { analysisId, repoName, metadata, results })
    clearInterval(keepAlive)
    res.end()
  } catch (err: any) {
    logger.error('Streaming analysis error:', err?.message || err)

    const userMessage = err?.status === 401 && err?.message?.includes('Incorrect API key')
      ? 'OpenAI API key is invalid. Please set a valid OPENAI_API_KEY in backend/.env'
      : err?.status === 429
      ? 'AI rate limit reached. Please wait a moment and try again.'
      : err?.response?.status === 404
      ? `Repository "${repoUrl}" not found or is private.`
      : err?.response?.status === 403
      ? 'GitHub rate limit exceeded. Please try again in a few minutes.'
      : err?.message || 'Analysis failed unexpectedly. Please try again.'

    sendSSE(res, 'error', { message: userMessage, step: 'error' })
    clearInterval(keepAlive)
    res.end()
  } finally {
    parserService.cleanupDir(extractDir)
    if (zipPath) {
      try { fs.rmSync(zipPath, { force: true }) } catch { /* ignore */ }
    }
  }
})

// ─── POST /api/analyze/url — Non-streaming sync fallback ─────────────────────
router.post('/url', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { repoUrl } = req.body
  if (!repoUrl) return next(new AppError(400, 'repoUrl is required'))

  const githubMatch = repoUrl.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/)
  if (!githubMatch) return next(new AppError(400, 'Only GitHub repository URLs are supported'))

  const [, owner, repoSlug] = githubMatch
  const cleanRepo = repoSlug.replace(/\.git$/, '')
  const repoName = `${owner}/${cleanRepo}`
  const extractId = uuidv4()
  const extractDir = path.join(EXTRACT_DIR, extractId)
  let zipPath: string | null = null

  try {
    const zipUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/zipball`
    const headers: Record<string, string> = { 'User-Agent': 'RepoMind/2.0' }
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
    if (req.accessToken) headers['Authorization'] = `token ${req.accessToken}`

    const response = await axios.get(zipUrl, {
      headers,
      responseType: 'arraybuffer',
      maxRedirects: 5,
      timeout: 60000,
    })

    zipPath = path.join(UPLOADS_DIR, `${extractId}.zip`)
    fs.writeFileSync(zipPath, response.data)
    fs.mkdirSync(extractDir, { recursive: true })
    await parserService.extractZip(zipPath, extractDir)
    fs.rmSync(zipPath, { force: true })
    zipPath = null

    const repo = await parserService.parseDirectory(extractDir)
    const totalLangLines = Object.values(repo.languages).reduce((a, b) => a + b, 0) || 1
    const languageBreakdown = Object.entries(repo.languages)
      .sort(([, a], [, b]) => b - a)
      .map(([language, lines]) => ({
        language, lines,
        percentage: Math.round((lines / totalLangLines) * 100),
        color: getLanguageColor(language),
      }))

    const [architecture, security, quality, improvements, deployGuide, interviewQs] = await Promise.all([
      generateArchitectureExplanation(repo).catch(() => null),
      runSecurityScan(repo).catch(() => null),
      analyzeCodeQuality(repo).catch(() => null),
      generateImprovements(repo).catch(() => []),
      generateDeploymentGuide(repo).catch(() => []),
      generateInterviewQuestions(repo).catch(() => []),
    ])
    const [readme, bullets, apiDocs] = await Promise.all([
      generateReadme(repo, 'professional').catch(() => '# README\n\nProject documentation.'),
      generateResumeBullets(repo).catch(() => []),
      detectApiRoutes(repo).catch(() => []),
    ])

    const metadata = {
      fileCount: repo.fileCount, totalLines: repo.totalLines, languages: languageBreakdown,
      frameworks: repo.frameworks, dependencies: repo.dependencies, folderDepth: repo.maxDepth,
      apiRouteCount: (apiDocs as any[]).length, hasDockerfile: repo.hasDockerfile,
      hasTests: repo.hasTests, hasReadme: repo.hasReadme,
      fileList: repo.files.map(f => f.path).slice(0, 200),
    }
    const results = {
      architecture, techStack: { languages: Object.keys(repo.languages), frameworks: repo.frameworks, databases: [], libraries: repo.dependencies.slice(0, 30), deploymentConfigs: [] },
      readme: { professional: readme, minimal: '', opensource: '', recruiter: '' },
      resumeBullets: bullets, apiDocs, security, codeQuality: quality,
      improvements, deploymentGuide: { platforms: deployGuide }, interviewQuestions: interviewQs,
      metrics: { languageBreakdown, linesOfCode: repo.totalLines, dependencyCount: repo.dependencies.length, apiRouteCount: (apiDocs as any[]).length, folderComplexity: repo.maxDepth, fileCount: repo.fileCount },
    }

    const analysis = await prisma.analysis.create({
      data: { id: extractId, userId: req.userId || 'anonymous', repoName, repoUrl, inputType: 'URL', status: 'COMPLETE', metadata, results, completedAt: new Date() },
    })

    res.json({ analysisId: analysis.id, repoName, metadata, results })
  } catch (err: any) {
    if (err.response?.status === 404) return next(new AppError(404, 'Repository not found or is private'))
    if (err.response?.status === 403) return next(new AppError(403, 'GitHub API rate limit exceeded'))
    next(err)
  } finally {
    parserService.cleanupDir(extractDir)
    if (zipPath) { try { fs.rmSync(zipPath, { force: true }) } catch { /* ignore */ } }
  }
})

// ─── GET /api/analyze — List user analyses ────────────────────────────────────
router.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analyses = await prisma.analysis.findMany({
      where: { userId: req.userId || 'anonymous' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, repoName: true, status: true, createdAt: true, metadata: true },
    })
    res.json({ analyses })
  } catch (err) { next(err) }
})

// ─── GET /api/analyze/:id ──────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analysis = await prisma.analysis.findUnique({ where: { id: req.params.id } })
    if (!analysis) return next(new AppError(404, 'Analysis not found'))
    res.json(analysis)
  } catch (err) { next(err) }
})

export default router
