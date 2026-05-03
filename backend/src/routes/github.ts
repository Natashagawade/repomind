import { Router, Response, NextFunction } from 'express'
import axios from 'axios'
import { optionalAuth, AuthRequest } from '../middleware/auth'
import { generateGithubInsights } from '../services/analysis-engine'
import { AppError } from '../middleware/error-handler'
import { logger } from '../utils/logger'

const router = Router()

function githubHeaders(token?: string) {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'RepoMind/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  else if (process.env.GITHUB_TOKEN) headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  return headers
}

// GET /api/github/repos — List authenticated user repos
router.get('/repos', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get('https://api.github.com/user/repos', {
      headers: githubHeaders(req.accessToken),
      params: { sort: 'updated', per_page: 50, visibility: 'all' },
    })
    res.json({ repos: data })
  } catch (err: any) {
    if (err.response?.status === 401) return next(new AppError(401, 'Invalid GitHub token. Please reconnect GitHub.'))
    next(err)
  }
})

// GET /api/github/user — Get GitHub user profile
router.get('/user', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get('https://api.github.com/user', {
      headers: githubHeaders(req.accessToken),
    })
    res.json({ user: data })
  } catch (err) { next(err) }
})

// GET /api/github/insights — Full profile intelligence
router.get('/insights', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [userRes, reposRes] = await Promise.all([
      axios.get('https://api.github.com/user', { headers: githubHeaders(req.accessToken) }),
      axios.get('https://api.github.com/user/repos', {
        headers: githubHeaders(req.accessToken),
        params: { sort: 'updated', per_page: 100 },
      }),
    ])

    const user = userRes.data
    const repos = reposRes.data

    // Commit activity for top repo
    let commitActivity: { day: string; count: number }[] = []
    if (repos.length > 0) {
      try {
        const { data: activity } = await axios.get(
          `https://api.github.com/repos/${repos[0].full_name}/commits`,
          { headers: githubHeaders(req.accessToken), params: { per_page: 30 } }
        )
        commitActivity = activity.slice(0, 14).map((c: any) => ({
          day: new Date(c.commit.author.date).toLocaleDateString('en-US', { weekday: 'short' }),
          count: 1,
        }))
      } catch { /* ignore */ }
    }

    const insights = await generateGithubInsights(repos)

    res.json({
      user: {
        login: user.login,
        name: user.name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
      },
      repos: repos.slice(0, 20).map((r: any) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        updatedAt: r.updated_at,
        isPrivate: r.private,
        url: r.html_url,
        topics: r.topics || [],
      })),
      commitActivity,
      insights,
    })
  } catch (err: any) {
    if (err.response?.status === 401) return next(new AppError(401, 'GitHub authentication required'))
    next(err)
  }
})

// POST /api/github/analyze — Analyze a specific GitHub repo
router.post('/analyze', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { owner, repo } = req.body
  if (!owner || !repo) return next(new AppError(400, 'owner and repo are required'))

  try {
    const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: githubHeaders(req.accessToken),
    })
    // Redirect to URL analyze
    res.json({ repoUrl: data.html_url, message: 'Use /api/analyze/url with this repoUrl' })
  } catch (err: any) {
    if (err.response?.status === 404) return next(new AppError(404, 'Repository not found'))
    next(err)
  }
})

export default router
