'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'

interface GHRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  private: boolean
  html_url: string
  topics: string[]
  size: number
  open_issues_count: number
  default_branch: string
}

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', Ruby: '#701516', 'C#': '#178600', 'C++': '#f34b7d',
  CSS: '#563d7c', HTML: '#e34c26', Shell: '#89e051', Swift: '#F05138', Kotlin: '#7F52FF',
  Vue: '#42b883', PHP: '#4F5D95', Dart: '#00B4AB',
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = Date.now()
  const sec = Math.floor((now - d.getTime()) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
    </svg>
  )
}
function ForkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
    </svg>
  )
}

export default function GitHubPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [repos, setRepos] = useState<GHRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all')
  const [langFilter, setLangFilter] = useState<string>('all')
  const [sort, setSort] = useState<'updated' | 'stars' | 'name'>('updated')
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  const isGitHubUser = session?.provider === 'github'
  const isGoogleUser = session?.provider === 'google'

  const fetchRepos = useCallback(async () => {
    if (!isGitHubUser) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get('/api/github/repos')
      setRepos(data.repos || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }, [isGitHubUser])

  useEffect(() => { fetchRepos() }, [fetchRepos])

  const allLangs = ['all', ...Array.from(new Set(repos.map(r => r.language).filter(Boolean) as string[]))]

  const filtered = repos
    .filter(r => {
      if (filter === 'public' && r.private) return false
      if (filter === 'private' && !r.private) return false
      if (langFilter !== 'all' && r.language !== langFilter) return false
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) &&
          !(r.description || '').toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count
      if (sort === 'name') return a.name.localeCompare(b.name)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })

  const handleAnalyze = (repo: GHRepo) => {
    setAnalyzing(repo.full_name)
    router.push(`/analyze?repo=${encodeURIComponent(repo.html_url)}&name=${encodeURIComponent(repo.full_name)}`)
  }

  // ── Not GitHub user ──────────────────────────────────────────────────────
  if (!isGitHubUser) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="gh-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
            style={{ background: 'var(--green-bg)', border: '2px solid var(--green-border)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--green)">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>Connect GitHub Account</h1>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text2)' }}>
            {isGoogleUser
              ? "You're signed in with Google. Connect GitHub to list your repositories and run AI analysis on them."
              : "Sign in with GitHub to access your repositories and run real-time AI analysis."}
          </p>

          <div className="p-4 rounded-md mb-6 text-left" style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
            <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text2)' }}>What you get:</div>
            {[
              { icon: '📁', text: 'Browse all your public and private repositories' },
              { icon: '⚡', text: 'One-click real-time AI analysis with live progress' },
              { icon: '🔒', text: 'Read-only access — we never write to your repos' },
              { icon: '📊', text: 'Architecture maps, security scans, README generation' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span>{item.icon}</span>
                <span className="text-sm" style={{ color: 'var(--text)' }}>{item.text}</span>
              </div>
            ))}
          </div>

          <button
            id="btn-connect-github"
            onClick={() => signIn('github', { callbackUrl: '/github' })}
            className="gh-btn gh-btn-primary w-full justify-center py-3 text-base"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Connect GitHub Account
          </button>
        </motion.div>
      </div>
    )
  }

  // ── GitHub user ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Your Repositories</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            {loading ? 'Loading…' : `${repos.length} repositories · ${filtered.length} shown`}
          </p>
        </div>
        <button id="btn-refresh-repos" onClick={fetchRepos}
          className="gh-btn gh-btn-secondary text-xs gap-1.5"
          disabled={loading}>
          {loading ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"/>
            </svg>
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md p-3 text-sm" style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: 'var(--red)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.75-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search repositories…"
            className="w-full pl-9 pr-3 py-1.5 rounded-md text-sm"
            style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--green)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border2)'}
          />
        </div>

        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          className="px-3 py-1.5 rounded-md text-sm cursor-pointer"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}>
          <option value="all">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>

        <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
          className="px-3 py-1.5 rounded-md text-sm cursor-pointer"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}>
          {allLangs.map(l => <option key={l} value={l}>{l === 'all' ? 'Language' : l}</option>)}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value as any)}
          className="px-3 py-1.5 rounded-md text-sm cursor-pointer"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}>
          <option value="updated">Last updated</option>
          <option value="stars">Stars</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Repo list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="gh-card p-4 animate-shimmer h-24 rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text3)' }}>
          <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="mx-auto mb-3 opacity-50">
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/>
          </svg>
          <div className="text-sm">No repositories found</div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((repo, i) => (
              <motion.div
                key={repo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="gh-card p-4 rounded-md"
              >
                <div className="flex items-start gap-4">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold hover:underline"
                        style={{ color: 'var(--blue)' }}
                      >
                        {repo.full_name}
                      </a>
                      <span className="gh-badge" style={{
                        background: repo.private ? 'rgba(255,166,87,0.1)' : 'var(--blue-bg)',
                        borderColor: repo.private ? 'rgba(255,166,87,0.3)' : 'rgba(88,166,255,0.3)',
                        color: repo.private ? 'var(--orange)' : 'var(--blue)',
                      }}>
                        {repo.private ? '🔒 Private' : 'Public'}
                      </span>
                    </div>

                    {repo.description && (
                      <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--text2)' }}>
                        {repo.description}
                      </p>
                    )}

                    {/* Topics */}
                    {repo.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {repo.topics.slice(0, 5).map(t => (
                          <span key={t} className="gh-badge gh-badge-blue text-xs">{t}</span>
                        ))}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {repo.language && (
                        <span className="gh-stat">
                          <span className="lang-dot" style={{ background: LANG_COLORS[repo.language] || '#8b949e' }} />
                          {repo.language}
                        </span>
                      )}
                      <span className="gh-stat">
                        <StarIcon />
                        {repo.stargazers_count.toLocaleString()}
                      </span>
                      <span className="gh-stat">
                        <ForkIcon />
                        {repo.forks_count.toLocaleString()}
                      </span>
                      <span className="gh-stat" style={{ color: 'var(--text3)' }}>
                        Updated {timeAgo(repo.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Analyze button */}
                  <div className="flex-shrink-0">
                    <button
                      id={`btn-analyze-${repo.name}`}
                      onClick={() => handleAnalyze(repo)}
                      disabled={analyzing === repo.full_name}
                      className="gh-btn gh-btn-primary text-xs py-1.5 px-4 whitespace-nowrap"
                    >
                      {analyzing === repo.full_name ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin-slow" />
                          Starting…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11.5 1a4.501 4.501 0 0 1 .216 8.99l3.147 3.146a.5.5 0 0 1-.707.708l-3.147-3.147A4.5 4.5 0 1 1 11.5 1zm-7 6a.5.5 0 0 0 0 1H6v1.5a.5.5 0 0 0 1 0V8h1.5a.5.5 0 0 0 0-1H7V5.5a.5.5 0 0 0-1 0V7H4.5z"/>
                          </svg>
                          Analyze
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
