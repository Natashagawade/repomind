/**
 * Static Analysis Engine — No AI API required
 * Analyzes repository structure, files, and patterns to produce
 * meaningful insights using deterministic rules.
 */
import { logger } from '../utils/logger'
import type { ParsedRepo } from './parser-engine'

// ─── Try OpenAI (gracefully falls back to static if quota exceeded) ────────────
let openaiClient: any = null
try {
  const OpenAI = require('openai')
  const key = process.env.OPENAI_API_KEY
  if (key && key !== 'your-openai-api-key-here') {
    openaiClient = new OpenAI.default({ apiKey: key })
  }
} catch { /* openai not installed */ }

async function askAI(system: string, user: string, maxTokens = 800): Promise<string | null> {
  if (!openaiClient) return null
  try {
    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      temperature: 0.3,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    })
    return res.choices[0]?.message?.content || null
  } catch (e: any) {
    if (e?.status === 429 || e?.status === 402) {
      logger.warn('AI quota exceeded — using static analysis fallback')
    } else {
      logger.warn('AI call failed:', e?.message)
    }
    return null  // silently fall back
  }
}

function safeParseJSON<T>(text: string, fallback: T): T {
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try { return JSON.parse(stripped) } catch {
    const start = stripped.search(/[{\[]/)
    if (start !== -1) {
      try {
        const slice = stripped.slice(start)
        const end = findMatchingEnd(slice)
        return JSON.parse(slice.slice(0, end + 1))
      } catch { /* fall through */ }
    }
    return fallback
  }
}

function findMatchingEnd(s: string): number {
  let depth = 0, inStr = false, escape = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (escape) { escape = false; continue }
    if (c === '\\' && inStr) { escape = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{' || c === '[') depth++
    if (c === '}' || c === ']') { depth--; if (depth === 0) return i }
  }
  return s.length - 1
}

function buildRepoContext(repo: ParsedRepo): string {
  const topFiles = repo.files
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10)
    .map(f => `### ${f.path} (${f.lines} lines)\n${f.content.slice(0, 1000)}`)
    .join('\n\n')
  return `Files: ${repo.fileCount}, Lines: ${repo.totalLines}
Languages: ${Object.entries(repo.languages).map(([l, n]) => `${l}:${n}`).join(', ')}
Frameworks: ${repo.frameworks.join(', ') || 'none'}
Deps: ${repo.dependencies.slice(0, 20).join(', ')}
Docker: ${repo.hasDockerfile}, Tests: ${repo.hasTests}, README: ${repo.hasReadme}
Name: ${repo.packageJson?.name || 'N/A'}, Desc: ${repo.packageJson?.description || 'N/A'}
\n${topFiles}`
}

// ════════════════════════════════════════════════════════════════════════════
// STATIC ANALYSIS FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function detectProjectType(repo: ParsedRepo): string {
  const fw = repo.frameworks.join(' ').toLowerCase()
  const deps = repo.dependencies.join(' ').toLowerCase()
  const langs = Object.keys(repo.languages).map(l => l.toLowerCase())

  if (fw.includes('next') || fw.includes('react')) return 'React/Next.js Web Application'
  if (fw.includes('vue') || deps.includes('vue')) return 'Vue.js Web Application'
  if (fw.includes('angular') || deps.includes('@angular')) return 'Angular Web Application'
  if (fw.includes('express') || fw.includes('fastify') || fw.includes('koa')) return 'Node.js REST API'
  if (fw.includes('django') || fw.includes('flask') || fw.includes('fastapi')) return 'Python Web Application'
  if (fw.includes('spring') || langs.includes('java')) return 'Java Spring Application'
  if (langs.includes('python')) return 'Python Application'
  if (langs.includes('go')) return 'Go Application'
  if (langs.includes('rust')) return 'Rust Application'
  if (langs.includes('typescript') || langs.includes('javascript')) return 'JavaScript/TypeScript Application'
  return 'Software Project'
}

function detectPatterns(repo: ParsedRepo): string[] {
  const patterns: string[] = []
  const allPaths = repo.files.map(f => f.path.toLowerCase())

  if (allPaths.some(p => p.includes('/components/') || p.includes('/component'))) patterns.push('Component-based architecture')
  if (allPaths.some(p => p.includes('/hooks/') || p.includes('/hook'))) patterns.push('Custom hooks pattern')
  if (allPaths.some(p => p.includes('/store') || p.includes('/redux') || p.includes('/zustand'))) patterns.push('State management (Redux/Zustand)')
  if (allPaths.some(p => p.includes('/context') || p.includes('context.tsx'))) patterns.push('React Context API')
  if (allPaths.some(p => p.includes('/middleware'))) patterns.push('Middleware pattern')
  if (allPaths.some(p => p.includes('/service') || p.includes('/services'))) patterns.push('Service layer pattern')
  if (allPaths.some(p => p.includes('/repository') || p.includes('/repo'))) patterns.push('Repository pattern')
  if (allPaths.some(p => p.includes('prisma') || p.includes('.prisma'))) patterns.push('Prisma ORM')
  if (allPaths.some(p => p.includes('/api/') || p.includes('route'))) patterns.push('RESTful API routes')
  if (allPaths.some(p => p.includes('/test') || p.includes('.test.') || p.includes('.spec.'))) patterns.push('Unit test suite')
  if (allPaths.some(p => p.includes('docker') || p.includes('compose'))) patterns.push('Containerized deployment')
  if (allPaths.some(p => p.includes('.github/workflows'))) patterns.push('CI/CD via GitHub Actions')
  if (allPaths.some(p => p.includes('tailwind'))) patterns.push('Tailwind CSS utility-first styling')
  if (allPaths.some(p => p.includes('/pages/') || p.includes('/app/'))) patterns.push('File-based routing (Next.js)')

  return [...new Set(patterns)]
}

function detectAuthMechanism(repo: ParsedRepo): string {
  const allContent = repo.files.slice(0, 30).map(f => f.content).join(' ').toLowerCase()
  const allPaths = repo.files.map(f => f.path.toLowerCase()).join(' ')

  if (allPaths.includes('nextauth') || allContent.includes('next-auth')) return 'NextAuth.js — supports OAuth (Google, GitHub), JWT sessions'
  if (allContent.includes('passport')) return 'Passport.js authentication middleware'
  if (allContent.includes('jwt') || allContent.includes('jsonwebtoken')) return 'JWT-based authentication'
  if (allContent.includes('bcrypt') || allContent.includes('argon2')) return 'Password hashing with bcrypt/argon2'
  if (allContent.includes('oauth') || allContent.includes('google_client_id')) return 'OAuth 2.0 integration'
  if (allContent.includes('firebase') || allContent.includes('firebaseconfig')) return 'Firebase Authentication'
  if (allPaths.includes('auth') || allContent.includes('authenticate')) return 'Custom authentication implementation'
  return 'No explicit authentication detected'
}

function detectDatabase(repo: ParsedRepo): string {
  const fw = repo.frameworks.join(' ').toLowerCase()
  const deps = repo.dependencies.join(' ').toLowerCase()
  const content = repo.files.slice(0, 20).map(f => f.content).join(' ').toLowerCase()

  const dbs: string[] = []
  if (fw.includes('prisma') || deps.includes('prisma')) dbs.push('PostgreSQL/MySQL via Prisma ORM')
  if (fw.includes('mongoose') || deps.includes('mongoose') || content.includes('mongodb')) dbs.push('MongoDB with Mongoose ODM')
  if (fw.includes('sequelize') || deps.includes('sequelize')) dbs.push('SQL via Sequelize ORM')
  if (fw.includes('typeorm') || deps.includes('typeorm')) dbs.push('SQL via TypeORM')
  if (deps.includes('pg') || deps.includes('postgres')) dbs.push('PostgreSQL (direct pg driver)')
  if (deps.includes('mysql2') || deps.includes('mysql')) dbs.push('MySQL')
  if (deps.includes('sqlite') || deps.includes('better-sqlite3')) dbs.push('SQLite')
  if (deps.includes('redis') || content.includes('redis')) dbs.push('Redis (caching/sessions)')
  if (dbs.length === 0) return 'No database detected'
  return dbs.join(', ')
}

function detectFolderStructure(repo: ParsedRepo): string {
  const allPaths = repo.files.map(f => f.path)
  const topLevelDirs = [...new Set(allPaths.map(p => p.split('/')[0]).filter(d => d && !d.includes('.')))]

  const hasSrc = allPaths.some(p => p.startsWith('src/'))
  const hasApp = allPaths.some(p => p.startsWith('app/'))
  const hasPackages = allPaths.some(p => p.startsWith('packages/'))
  const hasApps = allPaths.some(p => p.startsWith('apps/'))

  if (hasPackages && hasApps) return `Monorepo structure with packages/ and apps/ directories. Top-level: ${topLevelDirs.slice(0, 8).join(', ')}`
  if (hasSrc) return `Standard src/ layout. Organized as: ${topLevelDirs.slice(0, 8).join(', ')}`
  if (hasApp) return `Next.js App Router structure with app/ directory. Top-level dirs: ${topLevelDirs.slice(0, 8).join(', ')}`
  return `Top-level structure: ${topLevelDirs.slice(0, 10).join(', ')}`
}

// ─── Security static analysis ────────────────────────────────────────────────
function staticSecurityScan(repo: ParsedRepo): any {
  const issues: any[] = []
  let score = 100

  const allContent = repo.files.slice(0, 40).map(f => ({ path: f.path, content: f.content }))

  // Check for hardcoded secrets
  const secretPatterns = [
    { pattern: /(?:password|passwd|pwd)\s*=\s*["'][^"']{3,}["']/gi, type: 'Hardcoded password', severity: 'high' },
    { pattern: /(?:api_key|apikey|api-key)\s*=\s*["'][a-z0-9_\-]{8,}["']/gi, type: 'Hardcoded API key', severity: 'high' },
    { pattern: /(?:secret|token)\s*=\s*["'][a-z0-9_\-]{8,}["']/gi, type: 'Hardcoded secret/token', severity: 'medium' },
    { pattern: /mongodb(\+srv)?:\/\/[^@]+@/g, type: 'Hardcoded MongoDB connection string', severity: 'high' },
    { pattern: /mysql:\/\/[^@]+@/g, type: 'Hardcoded MySQL connection string', severity: 'high' },
  ]

  for (const { path, content } of allContent) {
    if (path.includes('.env') || path.includes('node_modules') || path.includes('.git')) continue
    for (const { pattern, type, severity } of secretPatterns) {
      if (pattern.test(content)) {
        issues.push({ severity, type, description: `Potential ${type} found`, file: path, recommendation: `Move to environment variables (.env file)` })
        score -= severity === 'high' ? 15 : 8
      }
    }
  }

  // Check for .env committed
  if (repo.files.some(f => f.name === '.env' && !f.path.includes('.env.example'))) {
    issues.push({ severity: 'high', type: '.env file committed', description: 'Environment file may be committed to version control', file: '.env', recommendation: 'Add .env to .gitignore and use .env.example instead' })
    score -= 20
  }

  // Check for missing .gitignore
  if (!repo.files.some(f => f.name === '.gitignore')) {
    issues.push({ severity: 'medium', type: 'Missing .gitignore', description: 'No .gitignore file found — sensitive files may be committed', recommendation: 'Add a comprehensive .gitignore file' })
    score -= 10
  }

  // Check for HTTPS
  const allContent2 = repo.files.slice(0, 20).map(f => f.content).join(' ')
  if (allContent2.includes('http://') && !allContent2.includes('http://localhost')) {
    issues.push({ severity: 'low', type: 'Insecure HTTP URLs', description: 'HTTP URLs detected (should use HTTPS)', recommendation: 'Replace all http:// with https:// in production configs' })
    score -= 5
  }

  // Check for console.log in production code
  const jsFiles = repo.files.filter(f => (f.path.endsWith('.js') || f.path.endsWith('.ts')) && !f.path.includes('test') && !f.path.includes('spec'))
  const consoleCount = jsFiles.filter(f => /console\.(log|error|warn)/.test(f.content)).length
  if (consoleCount > 5) {
    issues.push({ severity: 'low', type: 'Excessive console logging', description: `${consoleCount} files contain console.log statements`, recommendation: 'Use a proper logger (winston, pino) and remove debug console.logs' })
    score -= 3
  }

  // Positive: has validation
  const hasDeps = repo.dependencies.join(' ').toLowerCase()
  if (hasDeps.includes('zod') || hasDeps.includes('joi') || hasDeps.includes('yup')) {
    // bonus for input validation
    score = Math.min(score + 5, 100)
  }
  if (hasDeps.includes('helmet')) {
    score = Math.min(score + 5, 100)
  }

  score = Math.max(score, 20)

  let summary = ''
  const highCount = issues.filter(i => i.severity === 'high').length
  const medCount = issues.filter(i => i.severity === 'medium').length
  if (score >= 85) summary = 'Good security posture. Minor improvements recommended.'
  else if (score >= 70) summary = `Fair security. ${highCount} high and ${medCount} medium severity issues found.`
  else summary = `Security needs attention. ${highCount} high severity issues require immediate action.`

  return { score, summary, issues }
}

// ─── Code quality static analysis ────────────────────────────────────────────
function staticCodeQuality(repo: ParsedRepo): any {
  const jsFiles = repo.files.filter(f => ['.ts', '.tsx', '.js', '.jsx'].some(ext => f.path.endsWith(ext)))
  const largeFiles = jsFiles.filter(f => f.lines > 300).map(f => `${f.path} (${f.lines} lines)`)

  // Maintainability: penalize large files, reward tests and typing
  let maintainability = 80
  if (largeFiles.length > 5) maintainability -= 10
  if (largeFiles.length > 10) maintainability -= 10
  if (repo.hasTests) maintainability += 10
  if (repo.frameworks.includes('TypeScript') || Object.keys(repo.languages).includes('TypeScript')) maintainability += 5
  if (repo.hasDockerfile) maintainability += 5

  // Readability
  let readability = 75
  const avgFileLength = repo.fileCount > 0 ? repo.totalLines / repo.fileCount : 0
  if (avgFileLength < 100) readability += 10
  else if (avgFileLength > 300) readability -= 10
  if (repo.files.some(f => f.path.includes('README'))) readability += 5

  // Modularity
  let modularity = 75
  const dirs = [...new Set(repo.files.map(f => f.path.split('/').slice(0, 2).join('/')))].length
  if (dirs > 5) modularity += 10
  if (dirs > 10) modularity += 5
  if (repo.files.some(f => f.path.includes('/components/'))) modularity += 5
  if (repo.files.some(f => f.path.includes('/services/'))) modularity += 5
  if (largeFiles.length > 5) modularity -= 10

  const clamp = (v: number) => Math.min(Math.max(v, 40), 98)
  maintainability = clamp(maintainability)
  readability = clamp(readability)
  modularity = clamp(modularity)

  const positives: string[] = []
  const issues: string[] = []

  if (repo.hasTests) positives.push('Test suite detected — good coverage culture')
  else issues.push('No test files found — add unit and integration tests')

  if (Object.keys(repo.languages).includes('TypeScript')) positives.push('TypeScript used — better type safety and developer experience')
  else if (Object.keys(repo.languages).includes('JavaScript')) issues.push('Consider adding TypeScript for better type safety at scale')

  if (repo.hasDockerfile) positives.push('Dockerfile present — consistent deployment environment')
  else issues.push('No Dockerfile — consider containerizing for reproducible deployments')

  if (largeFiles.length > 0) issues.push(`${largeFiles.length} large files detected (>300 lines) — consider splitting`)
  if (repo.files.some(f => f.path.includes('/components/'))) positives.push('Component-based structure promotes reusability')
  if (repo.files.some(f => f.path.includes('/services/'))) positives.push('Service layer separates business logic from controllers')
  if (repo.hasReadme) positives.push('README present — good project documentation start')
  else issues.push('No README file — add project documentation')

  const avgLen = repo.fileCount > 0 ? Math.round(repo.totalLines / repo.fileCount) : 0
  if (avgLen < 150) positives.push(`Average file length is ${avgLen} lines — well-focused modules`)
  else if (avgLen > 250) issues.push(`Average file length is ${avgLen} lines — consider breaking down larger files`)

  return { maintainabilityScore: maintainability, readabilityScore: readability, modularityScore: modularity, positives, issues, largeFiles: largeFiles.slice(0, 5), duplicateLogic: [] }
}

// ─── API Route detection (static regex) ──────────────────────────────────────
function staticDetectApiRoutes(repo: ParsedRepo): any[] {
  const routeFiles = repo.files.filter(f =>
    f.path.toLowerCase().includes('route') ||
    f.path.toLowerCase().includes('/api/') ||
    f.path.toLowerCase().includes('controller') ||
    f.path.toLowerCase().includes('endpoint')
  ).slice(0, 10)

  const routes: any[] = []
  const routePatterns = [
    // Express: router.get('/path', ...)
    /(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"`](\/[^'"`]*)/gi,
    // Next.js API route export
    /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)/gi,
    // FastAPI/Flask: @app.route, @router.get
    /@(?:app|router)\.(?:route|get|post|put|delete|patch)\s*\(\s*['"`](\/[^'"`]*)/gi,
  ]

  for (const file of routeFiles) {
    for (const pattern of routePatterns) {
      let match
      while ((match = pattern.exec(file.content)) !== null) {
        const method = match[1]?.toUpperCase() || 'GET'
        const path = match[2] || file.path.replace(/.*\/pages\/api/, '/api').replace(/\.[jt]sx?$/, '')
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          routes.push({
            method,
            path: path.startsWith('/') ? path : `/${path}`,
            description: `${method} endpoint in ${file.path.split('/').pop()}`,
            auth: /auth|protected|middleware/i.test(file.content),
          })
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set()
  return routes.filter(r => {
    const key = `${r.method}:${r.path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 20)
}

// ─── Resume bullets (deterministic) ──────────────────────────────────────────
function staticResumeBullets(repo: ParsedRepo): string[] {
  const bullets: string[] = []
  const langs = Object.keys(repo.languages)
  const fw = repo.frameworks
  const name = repo.packageJson?.name || 'the application'

  const techStack = [...langs.slice(0, 3), ...fw.slice(0, 3)].join(', ')
  bullets.push(`Developed ${name} using ${techStack} with ${repo.fileCount} source files and ${repo.totalLines.toLocaleString()} lines of code`)

  if (fw.some(f => ['React', 'Next.js', 'Vue', 'Angular'].includes(f))) {
    bullets.push(`Built responsive, component-based frontend using ${fw.filter(f => ['React', 'Next.js', 'Vue', 'Angular'].includes(f)).join('/')} with modular architecture`)
  }
  if (fw.some(f => ['Express', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI'].includes(f))) {
    bullets.push(`Engineered RESTful API backend with ${fw.filter(f => ['Express', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI'].includes(f)).join('/')} serving multiple endpoints`)
  }
  if (fw.some(f => ['Prisma', 'Sequelize', 'TypeORM', 'Mongoose'].includes(f))) {
    bullets.push(`Implemented database layer using ${fw.filter(f => ['Prisma', 'Sequelize', 'TypeORM', 'Mongoose'].includes(f)).join('/')} ORM with structured data models`)
  }
  if (repo.hasTests) bullets.push(`Maintained code quality through automated test suites covering critical business logic`)
  if (repo.hasDockerfile) bullets.push(`Containerized application using Docker enabling consistent development and production deployments`)
  if (repo.files.some(f => f.path.includes('.github/workflows'))) bullets.push(`Implemented CI/CD pipeline using GitHub Actions for automated testing and deployment`)
  if (repo.frameworks.includes('TypeScript') || langs.includes('TypeScript')) {
    bullets.push(`Leveraged TypeScript across full codebase ensuring type safety and reducing runtime errors`)
  }
  if (repo.files.some(f => f.path.includes('auth') || f.path.includes('Auth'))) {
    bullets.push(`Integrated authentication and authorization flow protecting application resources`)
  }
  if (repo.dependencies.some(d => d.includes('redis'))) bullets.push(`Implemented Redis caching layer improving application performance and reducing database load`)
  if (repo.maxDepth > 5) bullets.push(`Maintained clean separation of concerns across ${repo.maxDepth}-level directory hierarchy`)

  bullets.push(`Managed ${repo.dependencies.length} third-party dependencies ensuring compatibility and security`)

  return bullets.filter(b => b.length > 20).slice(0, 10)
}

// ─── Improvements (deterministic) ────────────────────────────────────────────
function staticImprovements(repo: ParsedRepo): any[] {
  const improvements: any[] = []

  if (!repo.hasTests) improvements.push({ title: 'Add Test Coverage', description: 'No test files detected. Add unit tests (Jest/Vitest) and integration tests to catch regressions early and enable safe refactoring.', priority: 'high', category: 'testing' })
  if (!repo.hasDockerfile) improvements.push({ title: 'Add Docker Configuration', description: 'Containerize the application with a Dockerfile and docker-compose.yml for consistent development and production environments.', priority: 'medium', category: 'devops' })
  if (!repo.hasReadme) improvements.push({ title: 'Create README Documentation', description: 'Add a comprehensive README with setup instructions, architecture overview, environment variables, and contribution guidelines.', priority: 'high', category: 'documentation' })
  if (!repo.files.some(f => f.path.includes('.github/workflows'))) improvements.push({ title: 'Set Up CI/CD Pipeline', description: 'Add GitHub Actions workflows for automated testing, linting, and deployment on each pull request.', priority: 'medium', category: 'devops' })
  if (!repo.files.some(f => f.path.includes('.env.example') || f.path.includes('.env.sample'))) improvements.push({ title: 'Add .env.example File', description: 'Create a .env.example template documenting required environment variables without actual secrets.', priority: 'medium', category: 'security' })
  if (!repo.dependencies.some(d => ['winston', 'pino', 'morgan'].includes(d))) improvements.push({ title: 'Add Structured Logging', description: 'Implement a proper logging library (winston/pino) instead of console.log for production-grade log management and observability.', priority: 'medium', category: 'architecture' })
  if (!repo.dependencies.some(d => ['zod', 'joi', 'yup'].includes(d))) improvements.push({ title: 'Add Input Validation', description: 'Implement schema validation (Zod/Joi) for all API inputs to prevent injection attacks and improve error messages.', priority: 'high', category: 'security' })

  const largeFiles = repo.files.filter(f => f.lines > 400)
  if (largeFiles.length > 3) improvements.push({ title: 'Refactor Large Files', description: `${largeFiles.length} files exceed 400 lines (${largeFiles.slice(0, 3).map(f => f.path.split('/').pop()).join(', ')}). Break these into smaller, focused modules.`, priority: 'low', category: 'architecture' })

  return improvements.slice(0, 8)
}

// ─── Deployment guide (deterministic) ────────────────────────────────────────
function staticDeploymentGuide(repo: ParsedRepo): any[] {
  const guides: any[] = []
  const fw = repo.frameworks
  const name = repo.packageJson?.name || 'app'
  const hasNext = fw.includes('Next.js') || repo.files.some(f => f.name === 'next.config.js')
  const hasExpress = fw.includes('Express') || fw.includes('Node.js')

  if (hasNext) {
    guides.push({
      platform: 'vercel',
      steps: ['Connect GitHub repo to Vercel', 'Set environment variables in Vercel dashboard', 'Deploy — Vercel auto-detects Next.js', 'Set up custom domain if needed'],
      commands: ['npx vercel', 'vercel --prod'],
      envVars: ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'],
      notes: 'Vercel is the recommended platform for Next.js apps with zero-config deployment',
    })
  }

  if (hasExpress || (!hasNext && fw.length > 0)) {
    guides.push({
      platform: 'render',
      steps: ['Push code to GitHub', 'Create new Web Service on Render', 'Connect GitHub repository', 'Set build command and start command', 'Add environment variables'],
      commands: [`npm install`, `npm run build`, `npm start`],
      envVars: ['NODE_ENV=production', 'PORT=10000', 'DATABASE_URL'],
      notes: 'Render provides free tier for hobby projects with automatic deploys',
    })
  }

  if (repo.hasDockerfile) {
    guides.push({
      platform: 'docker',
      steps: ['Build Docker image', 'Test locally with docker-compose', 'Push to Docker Hub or GitHub Container Registry', 'Deploy to any cloud provider (AWS ECS, GCP Cloud Run, DigitalOcean)'],
      commands: [`docker build -t ${name} .`, `docker run -p 3000:3000 ${name}`, `docker push username/${name}`],
      envVars: ['NODE_ENV=production'],
      notes: 'Docker provides maximum portability and works on any cloud provider',
    })
  } else {
    guides.push({
      platform: 'railway',
      steps: ['Sign up at railway.app', 'Connect GitHub repository', 'Railway auto-detects Node.js/Python', 'Add environment variables', 'Deploy with one click'],
      commands: ['railway login', 'railway up'],
      envVars: ['NODE_ENV=production', 'DATABASE_URL'],
      notes: 'Railway is developer-friendly with automatic builds and free $5/month credit',
    })
  }

  return guides
}

// ─── Interview questions (deterministic) ─────────────────────────────────────
function staticInterviewQuestions(repo: ParsedRepo): any[] {
  const questions: any[] = []
  const fw = repo.frameworks
  const langs = Object.keys(repo.languages)

  questions.push({ category: 'architecture', question: `Why did you choose ${fw[0] || langs[0]} for this project?`, difficulty: 'easy', hint: 'Discuss tradeoffs, team familiarity, ecosystem, performance' })
  questions.push({ category: 'architecture', question: 'How would you scale this application to handle 10x the current load?', difficulty: 'hard', hint: 'Horizontal scaling, caching, CDN, database read replicas, microservices' })
  questions.push({ category: 'architecture', question: 'Explain the folder structure and how you organized the codebase.', difficulty: 'easy', hint: 'Separation of concerns, domain-driven vs layer-driven, why this approach' })

  if (fw.some(f => ['Prisma', 'Sequelize', 'TypeORM', 'Mongoose'].includes(f))) {
    questions.push({ category: 'database', question: 'How do you handle database migrations in this project?', difficulty: 'medium', hint: 'Schema versioning, migration files, rollback strategy, zero-downtime migrations' })
    questions.push({ category: 'database', question: 'What indexing strategy do you use and why?', difficulty: 'hard', hint: 'Query patterns, composite indexes, performance tradeoffs, explain analyze' })
  }

  questions.push({ category: 'security', question: 'How do you prevent SQL injection / NoSQL injection in this codebase?', difficulty: 'medium', hint: 'Parameterized queries, ORM protection, input validation' })
  questions.push({ category: 'security', question: 'How do you handle authentication and authorization?', difficulty: 'medium', hint: 'JWT vs sessions, OAuth, role-based access control, token refresh' })
  questions.push({ category: 'security', question: 'What sensitive data is in this project and how do you protect it?', difficulty: 'easy', hint: 'Environment variables, encryption at rest, HTTPS, secrets management' })

  questions.push({ category: 'scaling', question: 'How would you add caching to improve performance?', difficulty: 'medium', hint: 'Redis, CDN, HTTP cache headers, memoization, cache invalidation strategies' })
  questions.push({ category: 'scaling', question: 'How would you handle a sudden spike in traffic?', difficulty: 'hard', hint: 'Auto-scaling, load balancers, queue-based processing, circuit breakers' })

  if (repo.hasTests) {
    questions.push({ category: 'general', question: 'What is your testing strategy and what do you test?', difficulty: 'medium', hint: 'Unit vs integration vs e2e, test pyramid, what to mock, CI integration' })
  }

  questions.push({ category: 'general', question: 'What would you do differently if you were to start this project over?', difficulty: 'easy', hint: 'Honest reflection on technical debt, architecture decisions, library choices' })
  questions.push({ category: 'general', question: 'How do you handle errors and logging in production?', difficulty: 'medium', hint: 'Global error handlers, structured logging, monitoring (Sentry, Datadog), alerting' })

  return questions.slice(0, 12)
}

// ─── Build a terminal-style tree from file paths ─────────────────────────────
function buildFileTree(files: string[], maxDepth = 4): string {
  type Node = { type: 'dir' | 'file'; children: Record<string, Node> }
  const root: Record<string, Node> = {}

  for (const filePath of files.slice(0, 120)) {
    const parts = filePath.split('/')
    let cur = root
    for (let i = 0; i < Math.min(parts.length, maxDepth); i++) {
      const part = parts[i]
      if (!cur[part]) {
        cur[part] = { type: i < parts.length - 1 ? 'dir' : 'file', children: {} }
      }
      cur = cur[part].children
    }
  }

  const lines: string[] = []
  function renderNode(nodes: Record<string, Node>, prefix: string, depth: number) {
    const entries = Object.entries(nodes).sort(([, a], [, b]) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return 0
    })
    entries.forEach(([name, node], idx) => {
      const isLast = idx === entries.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPrefix = prefix + (isLast ? '    ' : '│   ')
      lines.push(prefix + connector + name + (node.type === 'dir' ? '/' : ''))
      if (node.type === 'dir' && depth < maxDepth) {
        renderNode(node.children, childPrefix, depth + 1)
      }
    })
  }
  renderNode(root, '', 0)
  return lines.join('\n')
}

// ─── Detect env vars needed by the project ───────────────────────────────────
function detectEnvVars(repo: ParsedRepo): string[] {
  const vars: string[] = []
  const fw = repo.frameworks
  const deps = repo.dependencies.join(' ').toLowerCase()
  const content = repo.files.slice(0, 30).map(f => f.content).join(' ')

  if (fw.includes('Next.js') || fw.includes('React')) {
    vars.push('NEXT_PUBLIC_API_URL=http://localhost:4000')
    vars.push('NEXTAUTH_URL=http://localhost:3000')
    vars.push('NEXTAUTH_SECRET=<generate-with-openssl-rand-hex-32>')
  }
  if (fw.includes('Express') || fw.includes('NestJS') || fw.includes('Fastify')) {
    vars.push('PORT=4000')
    vars.push('NODE_ENV=development')
  }
  if (deps.includes('prisma') || deps.includes('pg') || deps.includes('postgres')) {
    vars.push('DATABASE_URL=postgresql://user:password@localhost:5432/dbname')
  }
  if (deps.includes('mongoose') || content.includes('mongodb')) {
    vars.push('MONGODB_URI=mongodb://localhost:27017/dbname')
  }
  if (deps.includes('redis')) vars.push('REDIS_URL=redis://localhost:6379')
  if (content.includes('OPENAI_API_KEY') || deps.includes('openai')) vars.push('OPENAI_API_KEY=sk-...')
  if (content.includes('ANTHROPIC')) vars.push('ANTHROPIC_API_KEY=sk-ant-...')
  if (content.includes('GITHUB_CLIENT_ID') || content.includes('GITHUB_ID')) {
    vars.push('GITHUB_CLIENT_ID=<your-github-oauth-app-client-id>')
    vars.push('GITHUB_CLIENT_SECRET=<your-github-oauth-app-client-secret>')
  }
  if (content.includes('GOOGLE_CLIENT_ID') || content.includes('GOOGLE_ID')) {
    vars.push('GOOGLE_CLIENT_ID=<your-google-oauth-client-id>')
    vars.push('GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>')
  }
  if (deps.includes('stripe')) vars.push('STRIPE_SECRET_KEY=sk_test_...')
  if (deps.includes('sendgrid') || deps.includes('@sendgrid')) vars.push('SENDGRID_API_KEY=SG...')
  if (deps.includes('aws-sdk') || deps.includes('@aws-sdk')) {
    vars.push('AWS_ACCESS_KEY_ID=<your-access-key>')
    vars.push('AWS_SECRET_ACCESS_KEY=<your-secret-key>')
    vars.push('AWS_REGION=us-east-1')
  }
  if (content.includes('JWT_SECRET') || deps.includes('jsonwebtoken')) {
    vars.push('JWT_SECRET=<generate-with-openssl-rand-hex-32>')
  }
  return [...new Set(vars)]
}

// ─── README (deterministic template — detailed) ────────────────────────────────
function staticReadme(repo: ParsedRepo): string {
  const name = repo.packageJson?.name || 'Project'
  const desc = repo.packageJson?.description || 'A modern, full-featured software project built with industry-standard technologies.'
  const allLangs = Object.entries(repo.languages).sort(([, a], [, b]) => b - a)
  const primaryLang = allLangs[0]?.[0] || 'JavaScript'
  const fw = repo.frameworks
  const isNode = ['TypeScript', 'JavaScript'].some(l => Object.keys(repo.languages).includes(l))
  const isPython = Object.keys(repo.languages).includes('Python')
  const isGo = Object.keys(repo.languages).includes('Go')
  const hasNext = fw.includes('Next.js')
  const hasExpress = fw.some(f => ['Express', 'Fastify', 'NestJS', 'Hono'].includes(f))
  const hasFrontend = fw.some(f => ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'].includes(f))
  const envVars = detectEnvVars(repo)
  const fileTree = buildFileTree(repo.files.map(f => f.path))
  const auth = detectAuthMechanism(repo)
  const db = detectDatabase(repo)
  const projectType = detectProjectType(repo)
  const patterns = detectPatterns(repo)

  const installCmd = isPython ? 'pip install -r requirements.txt' : isGo ? 'go mod download' : 'npm install'
  let devCmds = []
  if (hasNext && hasExpress) {
    devCmds = [
      '# Terminal 1 — Frontend',
      'cd frontend && npm run dev',
      '',
      '# Terminal 2 — Backend',
      'cd backend && npm run dev',
    ]
  } else if (hasNext) {
    devCmds = ['npm run dev']
  } else if (hasExpress) {
    devCmds = ['npm run dev   # or: npm start']
  } else if (isPython) {
    devCmds = ['python main.py   # or: uvicorn main:app --reload']
  } else if (isGo) {
    devCmds = ['go run main.go']
  } else {
    devCmds = ['npm start']
  }

  const techTable = [
    '| Category | Technology |',
    '|---|---|',
    ...allLangs.slice(0, 4).map(([l]) => `| Language | ${l} |`),
    ...fw.slice(0, 6).map(f => `| Framework / Library | ${f} |`),
    ...(db !== 'No database detected' ? [`| Database | ${db} |`] : []),
    ...(auth !== 'No explicit authentication detected' ? [`| Auth | ${auth} |`] : []),
    ...(repo.hasDockerfile ? ['| Deployment | Docker |'] : []),
    ...(repo.hasTests ? ['| Testing | Automated Test Suite |'] : []),
  ].join('\n')

  const prereqs = [
    isNode ? '- **Node.js** 18+  →  [nodejs.org](https://nodejs.org/)' : '',
    isNode ? '- **npm** (comes with Node) or **yarn** / **pnpm**' : '',
    isPython ? '- **Python** 3.10+  →  [python.org](https://python.org/)' : '',
    isGo ? '- **Go** 1.21+  →  [go.dev](https://go.dev/)' : '',
    repo.hasDockerfile ? '- **Docker** (optional, for containerised setup)  →  [docker.com](https://docker.com/)' : '',
    db.includes('PostgreSQL') ? '- **PostgreSQL** 14+ running locally  →  [postgresql.org](https://postgresql.org/)' : '',
    db.includes('MongoDB') ? '- **MongoDB** 6+ running locally  →  [mongodb.com](https://mongodb.com/)' : '',
  ].filter(Boolean).join('\n')

  const envBlock = envVars.length > 0
    ? `## ⚙️ Environment Variables

Create a \`.env\` file in the project root (copy from \`.env.example\` if present):

\`\`\`env
${envVars.join('\n')}
\`\`\`

> **Never commit your \`.env\` file.** Add it to \`.gitignore\`.
`
    : ''

  const dockerBlock = repo.hasDockerfile
    ? `## 🐳 Docker Setup

\`\`\`bash
# Build the image
docker build -t ${name.toLowerCase().replace(/\s+/g, '-')} .

# Run the container
docker run -p 3000:3000 --env-file .env ${name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

Or with Docker Compose (if \`docker-compose.yml\` is present):

\`\`\`bash
docker compose up --build
\`\`\`
`
    : ''

  const testBlock = repo.hasTests
    ? `## 🧪 Running Tests

\`\`\`bash
${isNode ? 'npm test\n\n# With coverage\nnpm run test:coverage' : isPython ? 'pytest\n\n# With coverage\npytest --cov' : 'go test ./...'}
\`\`\`
`
    : ''

  const scripts = repo.packageJson?.scripts
    ? Object.entries(repo.packageJson.scripts as Record<string, string>)
        .slice(0, 8)
        .map(([k, v]) => `| \`npm run ${k}\` | \`${v}\` |`)
        .join('\n')
    : ''

  const scriptsBlock = scripts
    ? `## 📜 Available Scripts

| Command | Description |
|---|---|
${scripts}
`
    : ''

  return `# ${name}

> ${desc}

![Language](https://img.shields.io/badge/${encodeURIComponent(primaryLang)}-informational?style=flat-square) ${fw[0] ? `![Framework](https://img.shields.io/badge/${encodeURIComponent(fw[0])}-764ABC?style=flat-square)` : ''} ![Files](https://img.shields.io/badge/files-${repo.fileCount}-blue?style=flat-square) ![Lines](https://img.shields.io/badge/lines-${repo.totalLines.toLocaleString()}-green?style=flat-square)

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
${repo.hasTests ? '- [Running Tests](#running-tests)\n' : ''}${repo.hasDockerfile ? '- [Docker Setup](#docker-setup)\n' : ''}- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

**${name}** is a ${projectType.toLowerCase()} with **${repo.fileCount.toLocaleString()} files** and **${repo.totalLines.toLocaleString()} lines of code**.

${patterns.length > 0 ? `Key architectural patterns include: ${patterns.slice(0, 4).join(', ')}.` : ''}

## 🛠️ Tech Stack

${techTable}

## 🏗️ Architecture

${detectFolderStructure(repo)}

**Authentication:** ${auth}

**Database:** ${db}

${patterns.length > 0 ? `**Patterns Detected:**\n${patterns.map(p => `- ${p}`).join('\n')}` : ''}

## 🚀 Getting Started

### Prerequisites

${prereqs}

### Installation

\`\`\`bash
# 1. Clone the repository
git clone <repository-url>
cd ${name.replace(/\s+/g, '-').toLowerCase()}

# 2. Install dependencies
${installCmd}
\`\`\`

${envVars.length > 0 ? `### Environment Setup

\`\`\`bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env   # or: code .env
\`\`\`` : ''}

### Running Locally

\`\`\`bash
${devCmds.join('\n')}
\`\`\`

${hasNext ? '> App available at **http://localhost:3000**' : hasExpress ? '> API available at **http://localhost:4000**' : ''}

${envBlock}
## 📁 Project Structure

\`\`\`
${name}/
${fileTree}
\`\`\`

${scriptsBlock}
${testBlock}
${dockerBlock}
## 🤝 Contributing

Contributions are welcome and appreciated! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch
   \`\`\`bash
   git checkout -b feature/your-feature-name
   \`\`\`
3. **Make** your changes and add tests where applicable
4. **Commit** with a descriptive message
   \`\`\`bash
   git commit -m "feat: add your feature description"
   \`\`\`
5. **Push** to your fork
   \`\`\`bash
   git push origin feature/your-feature-name
   \`\`\`
6. **Open** a Pull Request against the \`main\` branch

### Code Style

- Follow existing code conventions
- Add comments for non-obvious logic
- Ensure all tests pass before submitting
- Keep PRs focused and atomic

## 📊 Project Stats

| Metric | Value |
|---|---|
| Total Files | ${repo.fileCount.toLocaleString()} |
| Lines of Code | ${repo.totalLines.toLocaleString()} |
| Dependencies | ${repo.dependencies.length} |
| Directory Depth | ${repo.maxDepth} levels |
| Has Tests | ${repo.hasTests ? '✅ Yes' : '❌ No'} |
| Has Docker | ${repo.hasDockerfile ? '✅ Yes' : '❌ No'} |

## 📄 License

Please check the repository for license information. If no license is present, all rights are reserved by the author.

---

<p align="center">Built with ❤️ using ${fw.slice(0, 3).join(', ') || primaryLang}</p>
`
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS — These try AI first, fall back to static if API fails/unavailable
// ════════════════════════════════════════════════════════════════════════════

export async function generateArchitectureExplanation(repo: ParsedRepo): Promise<any> {
  const ctx = buildRepoContext(repo)
  const aiResult = await askAI(
    'You are a senior software architect. Return ONLY valid JSON with no markdown fences.',
    `Analyze this repository and return JSON with keys: summary, folderStructure, componentRelationships, backendFrontendSeparation, authFlowDetection, databaseSummary\n\n${ctx}`,
    600
  )
  if (aiResult) return safeParseJSON(aiResult, buildStaticArchitecture(repo))
  return buildStaticArchitecture(repo)
}

function buildStaticArchitecture(repo: ParsedRepo) {
  const patterns = detectPatterns(repo)
  return {
    summary: `${detectProjectType(repo)} with ${repo.fileCount} files across ${repo.maxDepth}-level directory structure. Uses ${repo.frameworks.slice(0, 3).join(', ') || Object.keys(repo.languages).slice(0, 2).join(', ')}. ${patterns.slice(0, 2).join('. ')}.`,
    folderStructure: detectFolderStructure(repo),
    componentRelationships: patterns.length > 0 ? patterns.join('. ') : 'Standard module relationships detected',
    backendFrontendSeparation: repo.frameworks.some(f => ['Next.js', 'React', 'Vue', 'Angular'].includes(f)) && repo.frameworks.some(f => ['Express', 'Fastify', 'Django'].includes(f)) ? 'Full-stack monorepo with frontend and backend in separate directories' : repo.frameworks.some(f => ['Next.js'].includes(f)) ? 'Next.js full-stack — frontend and API routes in the same codebase' : repo.frameworks.some(f => ['React', 'Vue', 'Angular'].includes(f)) ? 'Frontend SPA — likely connects to a separate backend API' : 'Backend-only service or API',
    authFlowDetection: detectAuthMechanism(repo),
    databaseSummary: detectDatabase(repo),
  }
}

export async function generateReadme(repo: ParsedRepo, mode: string): Promise<string> {
  const ctx = buildRepoContext(repo)
  const envVars = detectEnvVars(repo)
  const fileTree = buildFileTree(repo.files.map(f => f.path))
  const aiResult = await askAI(
    'You are a senior technical writer. Generate a comprehensive, production-quality README.md in GitHub Markdown. Use emojis for section headers. Include badges, a tech stack table, architecture details, step-by-step setup instructions, environment variable documentation, a terminal-style directory tree, available scripts table, contributing guide, and project stats table. Return ONLY the raw Markdown — no code fences around the whole output, no explanations.',
    `Generate a very detailed README.md for this repository:\n\nProject name: ${repo.packageJson?.name || 'Project'}\nDescription: ${repo.packageJson?.description || 'N/A'}\nFile tree (terminal style):\n${fileTree}\nEnvironment variables needed: ${envVars.join(', ') || 'none detected'}\n\nFull context:\n${ctx}`,
    3000
  )
  return aiResult || staticReadme(repo)
}

export async function generateResumeBullets(repo: ParsedRepo): Promise<string[]> {
  const ctx = buildRepoContext(repo)
  const aiResult = await askAI(
    'Return ONLY a JSON array of ATS-optimized resume bullet strings. No other text.',
    `Generate 8-10 resume bullets for this codebase:\n${ctx}`,
    700
  )
  if (aiResult) {
    const arr = safeParseJSON<string[]>(aiResult, [])
    if (Array.isArray(arr) && arr.length > 0) return arr
  }
  return staticResumeBullets(repo)
}

export async function detectApiRoutes(repo: ParsedRepo): Promise<any[]> {
  const routeFiles = repo.files
    .filter(f => f.path.toLowerCase().includes('route') || f.path.toLowerCase().includes('/api/') || f.path.toLowerCase().includes('controller'))
    .slice(0, 5)
    .map(f => `### ${f.path}\n${f.content.slice(0, 1200)}`)
    .join('\n\n')

  if (!routeFiles) return staticDetectApiRoutes(repo)

  const aiResult = await askAI(
    'Return ONLY a JSON array of API endpoints. No other text.',
    `Extract endpoints:\n${routeFiles}`,
    800
  )
  if (aiResult) {
    const arr = safeParseJSON<any[]>(aiResult, [])
    if (Array.isArray(arr) && arr.length > 0) return arr
  }
  return staticDetectApiRoutes(repo)
}

export async function runSecurityScan(repo: ParsedRepo): Promise<any> {
  const ctx = buildRepoContext(repo)
  const aiResult = await askAI(
    'Return ONLY valid JSON: {score, summary, issues:[{severity,type,description,file,recommendation}]}',
    `Security scan:\n${ctx}`,
    700
  )
  if (aiResult) {
    const result = safeParseJSON<any>(aiResult, null)
    if (result?.score !== undefined) return result
  }
  return staticSecurityScan(repo)
}

export async function analyzeCodeQuality(repo: ParsedRepo): Promise<any> {
  const ctx = buildRepoContext(repo)
  const aiResult = await askAI(
    'Return ONLY valid JSON: {maintainabilityScore,readabilityScore,modularityScore,issues,largeFiles,duplicateLogic,positives}',
    `Code quality analysis:\n${ctx}`,
    600
  )
  if (aiResult) {
    const result = safeParseJSON<any>(aiResult, null)
    if (result?.maintainabilityScore !== undefined) return result
  }
  return staticCodeQuality(repo)
}

export async function generateImprovements(repo: ParsedRepo): Promise<any[]> {
  const ctx = buildRepoContext(repo)
  const aiResult = await askAI(
    'Return ONLY a JSON array: [{title,description,priority,category}]',
    `Suggest improvements:\n${ctx}`,
    700
  )
  if (aiResult) {
    const arr = safeParseJSON<any[]>(aiResult, [])
    if (Array.isArray(arr) && arr.length > 0) return arr
  }
  return staticImprovements(repo)
}

export async function generateDeploymentGuide(repo: ParsedRepo): Promise<any[]> {
  const aiResult = await askAI(
    'Return ONLY a JSON array: [{platform,steps,commands,envVars,notes}]',
    `Generate deployment guides. Frameworks: ${repo.frameworks.join(', ')}, hasDocker: ${repo.hasDockerfile}`,
    600
  )
  if (aiResult) {
    const arr = safeParseJSON<any[]>(aiResult, [])
    if (Array.isArray(arr) && arr.length > 0) return arr
  }
  return staticDeploymentGuide(repo)
}

export async function generateInterviewQuestions(repo: ParsedRepo): Promise<any[]> {
  const aiResult = await askAI(
    'Return ONLY a JSON array: [{category,question,difficulty,hint}]',
    `Generate 12 interview questions for: frameworks=${repo.frameworks.join(',')}, langs=${Object.keys(repo.languages).join(',')}`,
    700
  )
  if (aiResult) {
    const arr = safeParseJSON<any[]>(aiResult, [])
    if (Array.isArray(arr) && arr.length > 0) return arr
  }
  return staticInterviewQuestions(repo)
}

export async function generateGithubInsights(repos: any[]): Promise<any> {
  const repoSummary = repos.slice(0, 10).map(r =>
    `${r.name}: ${r.language || 'Unknown'}, ${r.stargazers_count} stars, updated ${r.updated_at}`
  ).join('\n')

  const aiResult = await askAI(
    'Return ONLY valid JSON: {profileStrengthScore,portfolioReadinessScore,topLanguages,skillProfile,suggestions,missingProjects,summary}',
    `Analyze GitHub repos:\n${repoSummary}`,
    600
  )
  if (aiResult) {
    const result = safeParseJSON<any>(aiResult, null)
    if (result?.profileStrengthScore !== undefined) return result
  }

  // Static fallback
  const langCounts: Record<string, number> = {}
  repos.forEach(r => { if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1 })
  const topLangs = Object.entries(langCounts).sort(([,a],[,b]) => b-a).map(([language, count]) => ({
    language,
    percentage: Math.round((count / repos.length) * 100),
  }))

  return {
    profileStrengthScore: Math.min(40 + repos.length * 3, 95),
    portfolioReadinessScore: Math.min(30 + repos.length * 4, 90),
    topLanguages: topLangs,
    skillProfile: topLangs.slice(0, 5).map(l => l.language),
    suggestions: ['Add more README documentation to repositories', 'Create a portfolio-focused pinned repo', 'Add topics/tags to repositories for discoverability'],
    missingProjects: ['Personal portfolio website', 'Open source contribution', 'API/backend project with documentation'],
    summary: `Developer with ${repos.length} repositories primarily using ${topLangs[0]?.language || 'various languages'}.`,
  }
}
