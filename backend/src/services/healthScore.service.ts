/**
 * healthScore.service.ts
 * Repo Health Score Engine — evaluates repository quality across 5 dimensions.
 * Uses GitHub API data with heuristic scoring rules.
 */
import {
  fetchRepoMeta, fetchReadme, fetchCommitActivity,
  fetchContributors, fetchTags, fetchIssues, fetchContents,
} from './repoAnalyzer.service'

interface HealthBreakdown {
  documentation: number
  activity: number
  dependencies: number
  contributors: number
  completeness: number
}

interface HealthScoreResult {
  health_score: number
  grade: string
  breakdown: HealthBreakdown
  details: {
    documentation: string[]
    activity: string[]
    dependencies: string[]
    contributors: string[]
    completeness: string[]
  }
  repoMeta: {
    name: string
    description: string
    stars: number
    forks: number
    openIssues: number
    defaultBranch: string
    license: string | null
    createdAt: string
    updatedAt: string
    language: string | null
  }
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

// ── Documentation Score (max 20) ─────────────────────────────────────────────
async function scoreDocumentation(
  owner: string, repo: string, readme: string, token?: string
): Promise<{ score: number; details: string[] }> {
  let score = 0
  const details: string[] = []

  // README presence
  if (readme.length > 0) {
    score += 6; details.push('✓ README present')
  } else {
    details.push('✗ No README found')
  }

  // README quality
  if (readme.length > 500) { score += 3; details.push('✓ README has substantial content') }
  else if (readme.length > 100) { score += 1 }

  // README has sections (## headings)
  const sectionCount = (readme.match(/^#{1,3} /gm) || []).length
  if (sectionCount >= 4) { score += 4; details.push('✓ README is well-structured with multiple sections') }
  else if (sectionCount >= 2) { score += 2; details.push('✓ README has basic sections') }

  // Code examples
  if (readme.includes('```')) { score += 3; details.push('✓ README includes code examples') }
  else { details.push('✗ README lacks code examples') }

  // Wiki or docs folder
  try {
    const contents = await fetchContents(owner, repo, '', token)
    const hasDocs = contents.some((f: any) => /^docs?$/i.test(f.name))
    if (hasDocs) { score += 4; details.push('✓ Dedicated docs/ directory found') }
  } catch { /* ignore */ }

  return { score: Math.min(score, 20), details }
}

// ── Activity Score (max 20) ───────────────────────────────────────────────────
async function scoreActivity(
  owner: string, repo: string, meta: any, token?: string
): Promise<{ score: number; details: string[] }> {
  let score = 0
  const details: string[] = []

  const rawActivity = await fetchCommitActivity(owner, repo, token)
  const activity = Array.isArray(rawActivity) ? rawActivity : []
  const last4Weeks = activity.slice(-4)
  const recentCommits = last4Weeks.reduce((s: number, w: any) => s + (w?.total || 0), 0)

  if (recentCommits >= 20) { score += 8; details.push(`✓ Very active: ${recentCommits} commits in last 4 weeks`) }
  else if (recentCommits >= 10) { score += 6; details.push(`✓ Active: ${recentCommits} commits in last 4 weeks`) }
  else if (recentCommits >= 4) { score += 4; details.push(`~ Moderate: ${recentCommits} commits in last 4 weeks`) }
  else if (recentCommits >= 1) { score += 2; details.push(`~ Low activity: ${recentCommits} commits in last 4 weeks`) }
  else { details.push('✗ No commits in last 4 weeks — possibly inactive') }

  // Age vs frequency
  const createdAt = new Date(meta.created_at)
  const updatedAt = new Date(meta.updated_at)
  const ageMonths = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
  const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceUpdate < 7) { score += 6; details.push('✓ Updated in the last week') }
  else if (daysSinceUpdate < 30) { score += 4; details.push('✓ Updated in the last month') }
  else if (daysSinceUpdate < 90) { score += 2; details.push('~ Updated in the last 3 months') }
  else { details.push('✗ Not updated in more than 3 months') }

  if (ageMonths > 6 && recentCommits > 2) { score += 6; details.push('✓ Sustained maintenance over time') }

  return { score: Math.min(score, 20), details }
}

// ── Dependency Freshness Score (max 15) ───────────────────────────────────────
async function scoreDependencies(
  owner: string, repo: string, token?: string
): Promise<{ score: number; details: string[] }> {
  let score = 0
  const details: string[] = []

  const contents = await fetchContents(owner, repo, '', token)

  const hasPackageJson = contents.some((f: any) => f.name === 'package.json')
  const hasRequirements = contents.some((f: any) => f.name === 'requirements.txt' || f.name === 'Pipfile')
  const hasGoMod = contents.some((f: any) => f.name === 'go.mod')
  const hasLockFile = contents.some((f: any) => ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock'].includes(f.name))
  const hasDependabot = contents.some((f: any) => f.name === '.github')

  if (hasPackageJson || hasRequirements || hasGoMod) {
    score += 5; details.push('✓ Dependency manifest found')
  } else {
    details.push('✗ No dependency manifest found')
  }

  if (hasLockFile) { score += 5; details.push('✓ Lock file present — reproducible builds') }
  else { details.push('✗ No lock file — builds may be non-reproducible') }

  if (hasDependabot) { score += 5; details.push('✓ .github directory found (may have Dependabot config)') }
  else { details.push('~ Consider adding Dependabot for automated dependency updates') }

  return { score: Math.min(score, 15), details }
}

// ── Contributor Score (max 15) ────────────────────────────────────────────────
async function scoreContributors(
  owner: string, repo: string, token?: string
): Promise<{ score: number; details: string[] }> {
  let score = 0
  const details: string[] = []

  const rawContributors = await fetchContributors(owner, repo, token)
  const contributors = Array.isArray(rawContributors) ? rawContributors : []
  const activeCount = contributors.filter((c: any) => (c.total || 0) > 2).length

  if (activeCount >= 5) { score += 8; details.push(`✓ ${activeCount} active contributors`) }
  else if (activeCount >= 2) { score += 5; details.push(`✓ ${activeCount} contributors`) }
  else if (activeCount === 1) { score += 2; details.push('~ Solo project (1 contributor)') }
  else { details.push('✗ No contributor data available') }

  // Spread of contributions
  if (contributors.length >= 2) {
    const total = contributors.reduce((s: number, c: any) => s + c.total, 0)
    const top = contributors[0]?.total || 0
    const topPct = total > 0 ? top / total : 1
    if (topPct < 0.7) { score += 7; details.push('✓ Healthy contribution spread among team') }
    else if (topPct < 0.9) { score += 4; details.push('~ Most commits from primary contributor') }
    else { score += 1; details.push('~ Highly concentrated contributions') }
  }

  return { score: Math.min(score, 15), details }
}

// ── Completeness Score (max 20) ───────────────────────────────────────────────
async function scoreCompleteness(
  owner: string, repo: string, meta: any, token?: string
): Promise<{ score: number; details: string[] }> {
  let score = 0
  const details: string[] = []

  const contents = await fetchContents(owner, repo, '', token)
  const fileNames = contents.map((f: any) => f.name.toLowerCase())

  // License
  if (meta.license) { score += 4; details.push(`✓ License: ${meta.license.name}`) }
  else { details.push('✗ No license detected') }

  // Issues enabled & present
  if (meta.has_issues) { score += 2; details.push('✓ Issues enabled') }

  // Open issues — low count is good
  const openIssues = meta.open_issues_count || 0
  if (openIssues === 0) { score += 2; details.push('✓ No open issues') }
  else if (openIssues < 10) { score += 1; details.push(`~ ${openIssues} open issues`) }
  else { details.push(`✗ ${openIssues} open issues — needs triage`) }

  // Releases
  const releases = await fetchTags(owner, repo, token)
  if (releases.length >= 3) { score += 4; details.push(`✓ ${releases.length} releases published`) }
  else if (releases.length >= 1) { score += 2; details.push(`~ ${releases.length} release(s) found`) }
  else { details.push('✗ No releases — consider versioning') }

  // CI/CD
  const hasGhActions = fileNames.some(f => f === '.github') ||
    (await fetchContents(owner, repo, '.github', token)
      .then(c => c.some((f: any) => f.name === 'workflows'))
      .catch(() => false))
  if (hasGhActions) { score += 4; details.push('✓ GitHub Actions / CI-CD detected') }
  else { details.push('✗ No CI/CD configuration found') }

  // Tests
  const hasTests = fileNames.some(f => ['test', 'tests', '__tests__', 'spec'].includes(f)) ||
    contents.some((f: any) => /\.(test|spec)\.[jt]sx?$/.test(f.name))
  if (hasTests) { score += 4; details.push('✓ Test directory/files detected') }
  else { details.push('✗ No tests found — add test coverage') }

  return { score: Math.min(score, 20), details }
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function computeHealthScore(
  owner: string,
  repo: string,
  token?: string
): Promise<HealthScoreResult> {
  const [meta, readme] = await Promise.all([
    fetchRepoMeta(owner, repo, token),
    fetchReadme(owner, repo, token),
  ])

  const [docResult, actResult, depResult, conResult, comResult] = await Promise.all([
    scoreDocumentation(owner, repo, readme, token),
    scoreActivity(owner, repo, meta, token),
    scoreDependencies(owner, repo, token),
    scoreContributors(owner, repo, token),
    scoreCompleteness(owner, repo, meta, token),
  ])

  const breakdown: HealthBreakdown = {
    documentation: docResult.score,
    activity: actResult.score,
    dependencies: depResult.score,
    contributors: conResult.score,
    completeness: comResult.score,
  }

  const health_score = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return {
    health_score,
    grade: scoreToGrade(health_score),
    breakdown,
    details: {
      documentation: docResult.details,
      activity: actResult.details,
      dependencies: depResult.details,
      contributors: conResult.details,
      completeness: comResult.details,
    },
    repoMeta: {
      name: meta.name,
      description: meta.description || '',
      stars: meta.stargazers_count,
      forks: meta.forks_count,
      openIssues: meta.open_issues_count,
      defaultBranch: meta.default_branch,
      license: meta.license?.name || null,
      createdAt: meta.created_at,
      updatedAt: meta.updated_at,
      language: meta.language || null,
    },
  }
}
