'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardGrid } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'

function useCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return value
}

const LANG_DATA = [
  { lang: 'JavaScript', pct: 48, color: '#6366f1' },
  { lang: 'Python', pct: 22, color: '#34d399' },
  { lang: 'TypeScript', pct: 15, color: '#60a5fa' },
  { lang: 'CSS/HTML', pct: 10, color: '#fb923c' },
  { lang: 'Other', pct: 5, color: '#a78bfa' },
]

const REPO_LOC = [
  { name: 'ecommerce-api', lines: 24382, color: '#6366f1' },
  { name: 'ml-pipeline', lines: 18200, color: '#34d399' },
  { name: 'portfolio-site', lines: 8940, color: '#60a5fa' },
  { name: 'graphql-starter', lines: 6120, color: '#a78bfa' },
  { name: 'utils-lib', lines: 2800, color: '#fb923c' },
]

export default function MetricsPage() {
  const loc = useCounter(60442)
  const files = useCounter(1482)
  const deps = useCounter(247)
  const routes = useCounter(54)
  const maxLines = Math.max(...REPO_LOC.map(r => r.lines))

  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h1 className="font-display font-bold text-2xl text-[var(--text)] tracking-tight mb-1">Metrics Dashboard</h1>
        <p className="text-sm text-[var(--text2)]">Analytics across all analyzed repositories</p>
      </div>

      {/* Top counters */}
      <CardGrid cols={4} className="mb-4">
        {[
          { label: 'Total Lines of Code', value: loc.toLocaleString(), color: 'text-blue-400', accent: 'blue' as const },
          { label: 'Total Files', value: files.toLocaleString(), color: 'text-emerald-400', accent: 'emerald' as const },
          { label: 'Dependencies', value: deps.toLocaleString(), color: 'text-violet-400', accent: 'violet' as const },
          { label: 'API Routes', value: routes.toLocaleString(), color: 'text-orange-400', accent: 'orange' as const },
        ].map((stat, i) => (
          <Card key={stat.label} color={stat.accent} delay={i * 0.05}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text3)] mb-2">{stat.label}</div>
            <div className={`font-display font-extrabold text-3xl ${stat.color}`}>{stat.value}</div>
          </Card>
        ))}
      </CardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Language breakdown */}
        <div className="lg:col-span-2">
          <Card delay={0.1}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-2">Distribution</div>
            <div className="font-display font-semibold text-sm text-[var(--text)] mb-4">Language Breakdown</div>
            {/* Stacked bar */}
            <div className="flex h-2 rounded-full overflow-hidden mb-5">
              {LANG_DATA.map((l, i) => (
                <motion.div key={l.lang} initial={{ flex: 0 }} animate={{ flex: l.pct }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  style={{ background: l.color }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {LANG_DATA.map(l => (
                <div key={l.lang} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                  <span className="text-xs text-[var(--text2)] flex-1">{l.lang}</span>
                  <span className="text-xs font-medium text-[var(--text)]">{l.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quality scores */}
        <Card color="violet" delay={0.15}>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Overall Quality</div>
          <div className="font-display font-semibold text-sm text-[var(--text)] mb-4">Code Health</div>
          <ProgressBar label="Maintainability" value={87} color="#34d399" />
          <ProgressBar label="Readability" value={72} color="#60a5fa" />
          <ProgressBar label="Modularity" value={91} color="#a78bfa" />
          <ProgressBar label="Test Coverage" value={18} color="#f87171" />
          <ProgressBar label="Documentation" value={54} color="#fb923c" />
        </Card>
      </div>

      {/* LOC bar chart */}
      <Card delay={0.2}>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-2">Comparison</div>
        <div className="font-display font-semibold text-sm text-[var(--text)] mb-5">Lines of Code by Repository</div>
        <div className="space-y-3">
          {REPO_LOC.map((repo, i) => (
            <div key={repo.name}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[var(--text2)]">{repo.name}</span>
                <span className="font-medium text-[var(--text)]">{repo.lines.toLocaleString()} loc</span>
              </div>
              <div className="h-1.5 bg-[var(--bg4)] rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(repo.lines / maxLines) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                  style={{ background: repo.color }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Folder depth */}
        <Card color="violet" delay={0.25}>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Complexity</div>
          <div className="font-display font-semibold text-sm text-[var(--text)] mb-4">Folder Depth Analysis</div>
          {[
            { name: 'ecommerce-api', depth: 7, max: 10 },
            { name: 'ml-pipeline', depth: 5, max: 10 },
            { name: 'portfolio-site', depth: 4, max: 10 },
            { name: 'graphql-starter', depth: 6, max: 10 },
          ].map(r => (
            <ProgressBar key={r.name} label={r.name} value={r.depth} max={r.max} color="#a78bfa" suffix=" levels" />
          ))}
        </Card>

        {/* Security summary */}
        <Card color="red" delay={0.3}>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400 mb-2">Security</div>
          <div className="font-display font-semibold text-sm text-[var(--text)] mb-4">Vulnerability Summary</div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { count: 2, label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/10' },
              { count: 2, label: 'Medium', color: 'text-orange-400', bg: 'bg-orange-400/10' },
              { count: 1, label: 'Low', color: 'text-blue-400', bg: 'bg-blue-400/10' },
            ].map(s => (
              <div key={s.label} className={`p-3 rounded-lg ${s.bg} text-center`}>
                <div className={`font-display font-bold text-xl ${s.color}`}>{s.count}</div>
                <div className="text-[10px] text-[var(--text3)]">{s.label}</div>
              </div>
            ))}
          </div>
          {[
            { sev: 'HIGH', msg: 'Hardcoded API key detected' },
            { sev: 'HIGH', msg: 'Vulnerable dependency (lodash)' },
            { sev: 'MED', msg: 'Open CORS configuration' },
            { sev: 'MED', msg: 'Missing rate limiting' },
            { sev: 'LOW', msg: 'Missing security headers' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
              <span className={`text-[10px] font-semibold px-1.5 rounded ${
                item.sev === 'HIGH' ? 'bg-red-400/15 text-red-400' :
                item.sev === 'MED' ? 'bg-orange-400/15 text-orange-400' :
                'bg-blue-400/15 text-blue-400'
              }`}>{item.sev}</span>
              <span className="text-xs text-[var(--text2)]">{item.msg}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
