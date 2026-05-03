/**
 * resumeGenerator.service.ts
 * Generates ATS-friendly resume bullet points from GitHub repo analysis.
 * Uses OpenAI if available, falls back to heuristic analysis.
 */
import axios from 'axios'
import {
  fetchRepoMeta, fetchReadme, fetchLanguages,
  fetchContributors, fetchRecentCommits, fetchContents,
} from './repoAnalyzer.service'
import { logger } from '../utils/logger'

// ─── OpenAI optional client ───────────────────────────────────────────────────
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
      temperature: 0.4,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    })
    return res.choices[0]?.message?.content || null
  } catch (e: any) {
    logger.warn('AI call failed in resumeGenerator:', e?.message)
    return null
  }
}

function safeJSON<T>(text: string, fallback: T): T {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try { return JSON.parse(clean) } catch { return fallback }
}

// ─── Heuristic resume bullet builder ─────────────────────────────────────────
function buildHeuristicBullets(
  meta: any,
  languages: Record<string, number>,
  readme: string,
  commits: any[],
  contributors: any[],
  frameworks: string[]
): { project_summary: string; resume_bullets: string[]; skills_detected: string[] } {
  const name = meta.name || 'the project'
  const desc = meta.description || ''
  const langs = Object.keys(languages).slice(0, 4)
  const totalLangBytes = Object.values(languages).reduce((a: any, b: any) => a + b, 0)
  const primaryLang = langs[0] || 'code'

  const bullets: string[] = []

  // Core development bullet
  const techStack = [...langs.slice(0, 3), ...frameworks.slice(0, 2)].join(', ')
  bullets.push(
    `Developed ${name} — ${desc || 'a software project'} — using ${techStack}, achieving ${commits.length}+ commits across the development lifecycle`
  )

  // Frontend/backend specifics
  if (frameworks.some(f => ['React', 'Next.js', 'Vue', 'Angular', 'Svelte'].includes(f))) {
    const fe = frameworks.filter(f => ['React', 'Next.js', 'Vue', 'Angular', 'Svelte'].includes(f))
    bullets.push(`Built responsive, component-driven UI with ${fe.join(' & ')}, ensuring seamless cross-device user experience`)
  }

  if (frameworks.some(f => ['Express', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Hono'].includes(f))) {
    const be = frameworks.filter(f => ['Express', 'Fastify', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Hono'].includes(f))
    bullets.push(`Engineered scalable RESTful API backend with ${be.join(' & ')}, handling structured data flow and business logic`)
  }

  // Database
  if (frameworks.some(f => ['Prisma', 'TypeORM', 'Sequelize', 'Mongoose', 'Drizzle'].includes(f))) {
    const dbs = frameworks.filter(f => ['Prisma', 'TypeORM', 'Sequelize', 'Mongoose', 'Drizzle'].includes(f))
    bullets.push(`Implemented relational data modeling and migrations using ${dbs.join(' & ')} ORM`)
  }

  // Testing
  if (readme.includes('test') || readme.includes('jest') || readme.includes('vitest')) {
    bullets.push('Maintained code quality through automated test suites and continuous integration practices')
  }

  // Docker
  if (readme.includes('docker') || readme.includes('Docker')) {
    bullets.push('Containerized application using Docker for consistent development-to-production deployments')
  }

  // CI/CD
  if (readme.includes('GitHub Actions') || readme.includes('CI/CD') || readme.includes('pipeline')) {
    bullets.push('Implemented CI/CD pipelines for automated testing and zero-downtime deployments')
  }

  // TypeScript
  if (langs.includes('TypeScript')) {
    bullets.push('Applied TypeScript throughout full codebase, reducing runtime errors and improving developer velocity')
  }

  // Authentication
  if (readme.toLowerCase().includes('auth') || readme.toLowerCase().includes('login')) {
    bullets.push('Integrated secure authentication and authorization flow with role-based access control')
  }

  // Team size
  if (contributors.length > 2) {
    bullets.push(`Collaborated in a team of ${contributors.length} contributors, managing code reviews and feature branches via Git`)
  }

  // Stars / community
  if (meta.stargazers_count > 50) {
    bullets.push(`Open-source project with ${meta.stargazers_count}+ GitHub stars, demonstrating community adoption`)
  }

  // Language diversity
  if (langs.length >= 3) {
    bullets.push(`Worked across ${langs.length} programming languages (${langs.join(', ')}) in a polyglot codebase`)
  }

  const langPct = Object.entries(languages)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([l, b]) => `${l} (${Math.round(((b as number) / totalLangBytes) * 100)}%)`)
    .join(', ')

  bullets.push(`Primary language breakdown: ${langPct}`)

  // Skills detected
  const skills_detected = [
    ...langs,
    ...frameworks,
    meta.license ? 'Open Source' : null,
    commits.length > 50 ? 'Version Control' : null,
    contributors.length > 1 ? 'Team Collaboration' : null,
  ].filter(Boolean) as string[]

  return {
    project_summary: desc
      ? `${name}: ${desc}`
      : `${name} is a ${primaryLang}-based project with ${langs.join(', ')} components${meta.stargazers_count ? ` and ${meta.stargazers_count} GitHub stars` : ''}.`,
    resume_bullets: bullets.slice(0, 10),
    skills_detected: [...new Set(skills_detected)].slice(0, 15),
  }
}

// ─── Detect frameworks from package.json in repo ──────────────────────────────
async function detectFrameworks(owner: string, repo: string, token?: string): Promise<string[]> {
  const frameworks: string[] = []
  try {
    const contents = await fetchContents(owner, repo, '', token)
    const hasPkg = contents.some((f: any) => f.name === 'package.json')
    if (!hasPkg) return frameworks

    const pkgRaw = await axios.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`,
      { timeout: 8000 }
    ).then(r => r.data).catch(() => null)

    if (!pkgRaw) return frameworks

    const deps = Object.keys({
      ...(pkgRaw.dependencies || {}),
      ...(pkgRaw.devDependencies || {}),
    })

    const fwMap: [string, string][] = [
      ['next', 'Next.js'], ['react', 'React'], ['vue', 'Vue'],
      ['@angular/core', 'Angular'], ['svelte', 'Svelte'],
      ['express', 'Express'], ['fastify', 'Fastify'], ['@nestjs/core', 'NestJS'],
      ['hono', 'Hono'], ['prisma', 'Prisma'], ['typeorm', 'TypeORM'],
      ['sequelize', 'Sequelize'], ['mongoose', 'Mongoose'], ['drizzle-orm', 'Drizzle'],
      ['tailwindcss', 'Tailwind CSS'], ['vite', 'Vite'],
    ]

    for (const [pkg, name] of fwMap) {
      if (deps.some(d => d === pkg || d.startsWith(pkg + '/'))) frameworks.push(name)
    }
  } catch { /* ignore */ }
  return [...new Set(frameworks)]
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateResumeData(
  owner: string,
  repo: string,
  token?: string
): Promise<{ project_summary: string; resume_bullets: string[]; skills_detected: string[] }> {
  const [meta, languages, readme, commits, contributors, frameworks] = await Promise.all([
    fetchRepoMeta(owner, repo, token),
    fetchLanguages(owner, repo, token),
    fetchReadme(owner, repo, token),
    fetchRecentCommits(owner, repo, token),
    fetchContributors(owner, repo, token),
    detectFrameworks(owner, repo, token),
  ])

  // Try AI first
  if (openaiClient) {
    const langStr = Object.entries(languages).map(([l, b]) => `${l}:${b}`).join(', ')
    const readmeSnip = readme.slice(0, 1500)
    const prompt = `Repository: ${meta.full_name}
Description: ${meta.description || 'N/A'}
Stars: ${meta.stargazers_count}, Forks: ${meta.forks_count}
Languages: ${langStr}
Frameworks detected: ${frameworks.join(', ') || 'none'}
Commits (recent): ${commits.length}
Contributors: ${contributors.length}
README excerpt:\n${readmeSnip}

Generate resume content. Return ONLY valid JSON:
{
  "project_summary": "2-3 sentence summary",
  "resume_bullets": ["bullet1", "bullet2", ...],
  "skills_detected": ["skill1", "skill2", ...]
}`

    const aiResult = await askAI(
      'You are an expert technical resume writer. Generate ATS-friendly, action-verb-led resume bullet points. Each bullet must start with a strong action verb. Return ONLY valid JSON, no markdown fences.',
      prompt,
      900
    )

    if (aiResult) {
      const parsed = safeJSON<any>(aiResult, null)
      if (parsed?.resume_bullets?.length > 0) return parsed
    }
  }

  // Fallback heuristic
  return buildHeuristicBullets(meta, languages, readme, commits, contributors, frameworks)
}
