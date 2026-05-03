'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { apiClient } from '@/lib/api'

const PIE_COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#6b7280']

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="h-20 animate-shimmer rounded-md"/>)}</div>
      <div className="h-64 animate-shimmer rounded-md"/>
      <div className="h-48 animate-shimmer rounded-md"/>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'var(--green)' }: any) {
  return (
    <div className="gh-card p-4 rounded-md text-center">
      <div className="text-2xl font-black mb-0.5" style={{ color }}>{value}</div>
      <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

const chartStyle = { background: 'transparent', border: 'none', outline: 'none' }
const tooltipStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text)' }

export function ContributionInsights({ repoUrl }: { repoUrl: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!repoUrl) return
    setLoading(true); setError(''); setData(null)
    apiClient.get(`/api/insights/contribution-insights?repoUrl=${encodeURIComponent(repoUrl)}`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || 'Failed to fetch contribution data'))
      .finally(() => setLoading(false))
  }, [repoUrl])

  if (!repoUrl) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📊</div>
      <p className="text-sm" style={{ color: 'var(--text3)' }}>Enter a GitHub repository URL above to see contribution analytics.</p>
    </div>
  )
  if (loading) return <SkeletonLoader />
  if (error) return <div className="gh-card p-4 rounded-md" style={{ borderLeft: '3px solid var(--red)' }}><p className="text-sm" style={{ color: 'var(--red)' }}>⚠ {error}</p></div>
  if (!data) return null

  const { summary, weeklyCommits, topContributors, heatmap, pieData, topModifiedFiles } = data

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Commits" value={summary.totalCommits?.toLocaleString() || '—'} />
        <StatCard label="Contributors" value={summary.totalContributors} color="var(--blue)" />
        <StatCard label="Last 4 Weeks" value={summary.last4WeekCommits} color="var(--purple)" />
        <StatCard label="Top Contributor" value={summary.topContributor} sub={`${summary.topContributorPct}% of commits`} color="var(--orange)" />
      </div>

      {/* Line Chart — Commit frequency */}
      <div className="gh-card p-4 rounded-md">
        <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>
          Commit Frequency (Last 12 Weeks)
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyCommits} style={chartStyle}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="commits" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar + Pie row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart — Top contributors */}
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>
            Top Contributors
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topContributors.slice(0,8)} layout="vertical" style={chartStyle}>
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="login" tick={{ fontSize: 10, fill: 'var(--text2)' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="total" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart — Contribution % */}
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text3)' }}>
            Contribution Share
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart style={chartStyle}>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                labelLine={false}
              >
                {pieData.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v} commits`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Heatmap */}
      {heatmap.length > 0 && (
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
            Commit Activity Heatmap
          </div>
          <div className="flex flex-wrap gap-1">
            {heatmap.slice(-90).map((d: any) => {
              const intensity = Math.min(d.count / 5, 1)
              return (
                <div key={d.date} title={`${d.date}: ${d.count} commits`}
                  className="w-3 h-3 rounded-sm cursor-default"
                  style={{ background: d.count === 0 ? 'var(--bg4)' : `rgba(124,58,237,${0.2 + intensity * 0.8})` }}
                />
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text3)' }}>
            <span>Less</span>
            {[0.1,0.3,0.5,0.7,1].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ background: `rgba(124,58,237,${o})` }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {/* Top modified files */}
      {topModifiedFiles.length > 0 && (
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
            Most Modified Files
          </div>
          <div className="space-y-2">
            {topModifiedFiles.map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--text2)' }}>{f.file}</span>
                <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((f.changes / topModifiedFiles[0]?.changes) * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                    className="h-full rounded-full" style={{ background: 'var(--purple)' }} />
                </div>
                <span className="text-xs w-10 text-right font-mono" style={{ color: 'var(--text3)' }}>{f.changes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
