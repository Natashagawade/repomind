'use client'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/lib/store'
import { useState } from 'react'

function RepoSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/>
    </svg>
  )
}

function StatCard({ label, value, sub, color, delay }: { label: string; value: string | number; sub: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="gh-card rounded-md p-4"
    >
      <div className="text-xs font-semibold mb-1" style={{ color: color }}>
        {label}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text3)' }}>{sub}</div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { analyses } = useAppStore()
  const [repoInput, setRepoInput] = useState('')

  const isGoogleUser = session?.provider === 'google'
  const displayName = session?.user?.name?.split(' ')[0] || 'Developer'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
              {greeting}, {displayName} 👋
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
              {analyses.length} repositories analyzed · AI-powered repository intelligence
            </p>
          </div>
        </div>
      </motion.div>

      {/* GitHub Connect Banner (Google users) */}
      {isGoogleUser && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-md p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'rgba(63,185,80,0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--green)">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--green2)' }}>Connect GitHub to unlock full features</div>
              <div className="text-xs" style={{ color: 'var(--text2)' }}>Browse your repos and run one-click real-time analysis</div>
            </div>
          </div>
          <button
            id="btn-dashboard-connect-github"
            onClick={() => router.push('/github')}
            className="gh-btn gh-btn-primary text-xs whitespace-nowrap flex-shrink-0"
          >
            Connect GitHub →
          </button>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Repositories" value={analyses.length || 0} sub="Total analyzed" color="var(--green)" delay={0.05} />
        <StatCard label="Files Parsed" value="—" sub="Across all repos" color="var(--blue)" delay={0.1} />
        <StatCard label="Security Issues" value="—" sub="Run an analysis" color="var(--red)" delay={0.15} />
        <StatCard label="Reports Ready" value={analyses.length} sub="Available for export" color="var(--purple)" delay={0.2} />
      </div>

      {/* Quick analyze */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="gh-card p-5 rounded-md"
      >
        <div className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
          Quick Analyze
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <input
              value={repoInput}
              onChange={e => setRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full pl-9 pr-3 py-2 rounded-md text-sm"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--green)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border2)'}
              onKeyDown={e => {
                if (e.key === 'Enter' && repoInput.trim()) {
                  router.push(`/analyze?repo=${encodeURIComponent(repoInput.trim())}`)
                }
              }}
            />
          </div>
          <button
            id="btn-quick-analyze"
            onClick={() => repoInput.trim() && router.push(`/analyze?repo=${encodeURIComponent(repoInput.trim())}`)}
            disabled={!repoInput.trim()}
            className="gh-btn gh-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Analyze →
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {['github/docs', 'facebook/react', 'vercel/next.js'].map(r => (
            <button
              key={r}
              onClick={() => { setRepoInput(`https://github.com/${r}`); router.push(`/analyze?repo=${encodeURIComponent(`https://github.com/${r}`)}`) }}
              className="text-xs px-2 py-1 rounded"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)' }}
            >
              {r}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 gh-card rounded-md p-5"
        >
          <div className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
            What RepoMind Analyzes
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🏗', title: 'Architecture',   desc: 'Component relationships, patterns, folder structure' },
              { icon: '🔐', title: 'Security Scan',  desc: 'Vulnerability detection with severity levels' },
              { icon: '📊', title: 'Code Quality',   desc: 'Maintainability, readability, modularity scores' },
              { icon: '📝', title: 'README Gen',     desc: 'Professional docs with badges and deploy guide' },
              { icon: '🔌', title: 'API Docs',       desc: 'Automatic endpoint detection and documentation' },
              { icon: '💼', title: 'Resume Bullets', desc: 'ATS-optimized bullets from your codebase' },
            ].map(f => (
              <div key={f.title} className="flex gap-3 p-3 rounded-md" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <span className="text-lg flex-shrink-0">{f.icon}</span>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{f.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="gh-card rounded-md p-5"
        >
          <div className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: 'var(--text2)' }}>
            Recent Analyses
          </div>
          {analyses.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 mx-auto mb-3 flex items-center justify-center rounded-full"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                <RepoSmallIcon />
              </div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>No analyses yet</div>
              <button
                onClick={() => router.push('/analyze')}
                className="mt-3 text-xs underline"
                style={{ color: 'var(--blue)' }}
              >
                Run your first analysis
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.slice(0, 6).map((a) => (
                <div key={a.id}
                  onClick={() => router.push(`/workspace?id=${a.id}`)}
                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors"
                  style={{ background: 'var(--bg3)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg3)')}
                >
                  <RepoSmallIcon />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{a.repoName}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>
                      {new Date(a.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="gh-badge gh-badge-green text-xs">Done</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
