/**
 * repoAnalyzer.service.ts
 * Reusable GitHub API integration layer with in-memory caching.
 * Used by all AI Insights features.
 */
import axios from 'axios'
import { logger } from '../utils/logger'

// ─── In-memory cache (TTL: 5 min) ────────────────────────────────────────────
const cache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000

function cacheGet(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry.data
}

function cacheSet(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() })
}

// ─── Token validity state (checked lazily once) ───────────────────────────────
let _tokenValid: boolean | null = null

async function isTokenValid(): Promise<boolean> {
  if (_tokenValid !== null) return _tokenValid
  const tok = process.env.GITHUB_TOKEN
  if (!tok || tok.trim() === '') { _tokenValid = false; return false }
  try {
    await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${tok}`, 'User-Agent': 'RepoMind/2.0' },
      timeout: 5000,
    })
    _tokenValid = true
    logger.info('[repoAnalyzer] GitHub token is valid ✓')
  } catch {
    _tokenValid = false
    logger.warn('[repoAnalyzer] GitHub token invalid/expired — using unauthenticated requests (60/hr rate limit)')
  }
  return _tokenValid
}

// ─── GitHub headers builder ───────────────────────────────────────────────────
export async function githubHeaders(token?: string): Promise<Record<string, string>> {
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'RepoMind/2.0',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) {
    h['Authorization'] = `Bearer ${token}`
  } else if (await isTokenValid()) {
    h['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }
  // else: unauthenticated (60 req/hr limit but works for public repos)
  return h
}

// ─── Parse owner/repo from URL ────────────────────────────────────────────────
export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const m = repoUrl.match(/github\.com\/([^/\s]+)\/([^/\s?#]+)/)
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/, '') }
}

// ─── Fetch helpers (with cache) ───────────────────────────────────────────────
async function ghGet(url: string, token?: string, params?: any): Promise<any> {
  const key = `${url}:${JSON.stringify(params || {})}`
  const cached = cacheGet(key)
  if (cached !== undefined && cached !== null) return cached
  try {
    const headers = await githubHeaders(token)
    const { data } = await axios.get(url, { headers, params, timeout: 15000 })
    cacheSet(key, data)
    return data
  } catch (err: any) {
    const status = err?.response?.status
    logger.warn(`GitHub API error: ${url} → ${status || err?.message}`)
    // Bubble up only unexpected errors; let 401/403/404 propagate for proper error messages
    if (status === 401 || status === 403 || status === 404) throw err
    return null
  }
}

// ─── Core data fetchers ───────────────────────────────────────────────────────

export async function fetchRepoMeta(owner: string, repo: string, token?: string) {
  const data = await ghGet(`https://api.github.com/repos/${owner}/${repo}`, token)
  // Return a minimal stub if API is unavailable so services don't crash
  if (!data) return {
    name: owner + '/' + repo, description: '', stargazers_count: 0, forks_count: 0,
    watchers_count: 0, open_issues_count: 0, default_branch: 'main', license: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    language: null, full_name: `${owner}/${repo}`, homepage: null, has_issues: true,
  }
  return data
}

export async function fetchReadme(owner: string, repo: string, token?: string): Promise<string> {
  try {
    const data = await ghGet(`https://api.github.com/repos/${owner}/${repo}/readme`, token)
    if (!data?.content) return ''
    return Buffer.from(data.content, 'base64').toString('utf-8')
  } catch { return '' }
}

export async function fetchCommitActivity(owner: string, repo: string, token?: string): Promise<any[]> {
  try {
    return await ghGet(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, token) || []
  } catch { return [] }
}

export async function fetchContributors(owner: string, repo: string, token?: string): Promise<any[]> {
  try {
    const result = await ghGet(`https://api.github.com/repos/${owner}/${repo}/stats/contributors`, token, { per_page: 30 })
    return Array.isArray(result) ? result : []
  } catch { return [] }
}

export async function fetchRecentCommits(owner: string, repo: string, token?: string): Promise<any[]> {
  try {
    const result = await ghGet(`https://api.github.com/repos/${owner}/${repo}/commits`, token, { per_page: 50 })
    return Array.isArray(result) ? result : []
  } catch { return [] }
}

export async function fetchLanguages(owner: string, repo: string, token?: string): Promise<Record<string, number>> {
  try {
    return await ghGet(`https://api.github.com/repos/${owner}/${repo}/languages`, token) || {}
  } catch { return {} }
}

export async function fetchTags(owner: string, repo: string, token?: string): Promise<any[]> {
  try {
    return await ghGet(`https://api.github.com/repos/${owner}/${repo}/releases`, token, { per_page: 10 }) || []
  } catch { return [] }
}

export async function fetchIssues(owner: string, repo: string, token?: string): Promise<any[]> {
  try {
    return await ghGet(`https://api.github.com/repos/${owner}/${repo}/issues`, token, { per_page: 30, state: 'open' }) || []
  } catch { return [] }
}

export async function fetchContents(owner: string, repo: string, path = '', token?: string): Promise<any[]> {
  try {
    const result = await ghGet(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, token)
    return Array.isArray(result) ? result : []
  } catch { return [] }
}

export async function fetchTopModifiedFiles(owner: string, repo: string, token?: string): Promise<{ file: string; changes: number }[]> {
  try {
    const commits = await fetchRecentCommits(owner, repo, token)
    const fileMap = new Map<string, number>()
    for (const commit of commits.slice(0, 20)) {
      try {
        const detail = await ghGet(
          `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
          token
        )
        for (const f of detail.files || []) {
          fileMap.set(f.filename, (fileMap.get(f.filename) || 0) + (f.changes || 1))
        }
      } catch { /* ignore individual commit errors */ }
    }
    return [...fileMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([file, changes]) => ({ file, changes }))
  } catch { return [] }
}
