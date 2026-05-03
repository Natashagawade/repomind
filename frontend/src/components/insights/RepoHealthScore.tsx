'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api'

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="h-40 animate-shimmer rounded-md" />
      <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i=><div key={i} className="h-28 animate-shimmer rounded-md"/>)}</div>
    </div>
  )
}

function GaugeMeter({ score, grade }: { score: number; grade: string }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const gradeBg = score >= 80 ? 'rgba(16,185,129,0.1)' : score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
  const r = 70, cx = 90, cy = 90
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75
  const offset = arc - (arc * Math.min(score, 100)) / 100

  return (
    <div className="gh-card p-6 rounded-md flex items-center gap-8"
      style={{ background: `linear-gradient(135deg,${gradeBg},transparent)`, border: `1px solid ${color}33` }}>
      <div className="relative flex-shrink-0">
        <svg width={180} height={180} viewBox="0 0 180 180">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg4)" strokeWidth={14}
            strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={arc * 0.125}
            strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
          {/* Score arc */}
          <motion.circle
            cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={14}
            strokeDasharray={`${arc} ${circ - arc}`}
            initial={{ strokeDashoffset: arc }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
          />
          {/* Score text */}
          <text x={cx} y={cy - 6} textAnchor="middle" fill={color} fontSize={32} fontWeight="bold">{score}</text>
          <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text3)" fontSize={11}>out of 90</text>
        </svg>
      </div>
      <div>
        <div className="text-5xl font-black mb-1" style={{ color }}>{grade}</div>
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Repository Health Grade</div>
        <div className="text-xs" style={{ color: 'var(--text2)' }}>
          {score >= 80 ? '🟢 Excellent — well-maintained repository' :
           score >= 60 ? '🟡 Good — some improvements recommended' :
           '🔴 Needs attention — multiple issues found'}
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, score, max, details }: { label: string; score: number; max: number; details: string[] }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 75 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)'
  const [open, setOpen] = useState(false)
  return (
    <div className="gh-card p-4 rounded-md cursor-pointer" onClick={() => setOpen(o => !o)}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-semibold flex-1" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{score}/{max}</span>
        <span className="text-xs" style={{ color: 'var(--text3)' }}>{open ? '▲' : '▼'}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      {open && (
        <div className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          {details.map((d, i) => (
            <div key={i} className="flex gap-2 text-xs" style={{ color: d.startsWith('✓') ? 'var(--green2)' : d.startsWith('✗') ? 'var(--red)' : 'var(--text2)' }}>
              <span>{d}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function RepoHealthScore({ repoUrl }: { repoUrl: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!repoUrl) return
    setLoading(true); setError(''); setData(null)
    apiClient.get(`/api/insights/repo-health?repoUrl=${encodeURIComponent(repoUrl)}`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || 'Failed to compute health score'))
      .finally(() => setLoading(false))
  }, [repoUrl])

  if (!repoUrl) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">🏥</div>
      <p className="text-sm" style={{ color: 'var(--text3)' }}>Enter a GitHub repository URL above to compute the health score.</p>
    </div>
  )
  if (loading) return <SkeletonLoader />
  if (error) return <div className="gh-card p-4 rounded-md" style={{ borderLeft: '3px solid var(--red)' }}><p className="text-sm" style={{ color: 'var(--red)' }}>⚠ {error}</p></div>
  if (!data) return null

  const { health_score, grade, breakdown, details, repoMeta } = data
  const SCORE_SECTIONS = [
    { key: 'documentation', label: '📄 Documentation', max: 20 },
    { key: 'activity', label: '⚡ Activity', max: 20 },
    { key: 'dependencies', label: '📦 Dependencies', max: 15 },
    { key: 'contributors', label: '👥 Contributors', max: 15 },
    { key: 'completeness', label: '✅ Completeness', max: 20 },
  ]

  return (
    <div className="space-y-4">
      {/* Gauge */}
      <GaugeMeter score={health_score} grade={grade} />

      {/* Repo meta */}
      {repoMeta && (
        <div className="gh-card p-4 rounded-md flex flex-wrap gap-4 text-sm">
          <div><span style={{ color: 'var(--text3)' }}>⭐ Stars: </span><strong style={{ color: 'var(--text)' }}>{repoMeta.stars?.toLocaleString()}</strong></div>
          <div><span style={{ color: 'var(--text3)' }}>🍴 Forks: </span><strong style={{ color: 'var(--text)' }}>{repoMeta.forks}</strong></div>
          <div><span style={{ color: 'var(--text3)' }}>🐛 Open Issues: </span><strong style={{ color: 'var(--text)' }}>{repoMeta.openIssues}</strong></div>
          {repoMeta.license && <div><span style={{ color: 'var(--text3)' }}>📄 License: </span><strong style={{ color: 'var(--text)' }}>{repoMeta.license}</strong></div>}
          {repoMeta.language && <div><span style={{ color: 'var(--text3)' }}>💻 Language: </span><strong style={{ color: 'var(--text)' }}>{repoMeta.language}</strong></div>}
        </div>
      )}

      {/* Score breakdown */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
          Score Breakdown — click any category to see details
        </div>
        <div className="space-y-2">
          {SCORE_SECTIONS.map(s => (
            <ScoreBar key={s.key} label={s.label} score={breakdown[s.key]} max={s.max} details={details[s.key] || []} />
          ))}
        </div>
      </div>
    </div>
  )
}
