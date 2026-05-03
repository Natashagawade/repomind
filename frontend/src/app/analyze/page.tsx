'use client'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisStep {
  id: string
  label: string
  description: string
  status: 'pending' | 'running' | 'done' | 'error'
  data?: unknown
  message?: string
}

const STEPS_CONFIG: AnalysisStep[] = [
  { id: 'download',     label: 'Download Repository',  description: 'Fetching code from GitHub',              status: 'pending' },
  { id: 'extract',      label: 'Parse & Extract',       description: 'Reading files and structure',            status: 'pending' },
  { id: 'techstack',    label: 'Tech Stack Detection',  description: 'Languages, frameworks, dependencies',    status: 'pending' },
  { id: 'architecture', label: 'Architecture Analysis', description: 'Component relationships, patterns',      status: 'pending' },
  { id: 'security',     label: 'Security Scan',         description: 'Vulnerability detection',                status: 'pending' },
  { id: 'quality',      label: 'Code Quality',          description: 'Maintainability, complexity',            status: 'pending' },
  { id: 'api',          label: 'API Detection',          description: 'Endpoint mapping & docs',               status: 'pending' },
  { id: 'docs',         label: 'Documentation Gen',     description: 'README, resume bullets',                 status: 'pending' },
  { id: 'extras',       label: 'Insights & Guides',     description: 'Improvements, deploy, interview Qs',     status: 'pending' },
]

// ─── Step Icon ────────────────────────────────────────────────────────────────
function StepIcon({ status }: { status: AnalysisStep['status'] }) {
  if (status === 'done') return (
    <div className="step-icon done">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="var(--green)">
        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215L6 10.93l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
      </svg>
    </div>
  )
  if (status === 'running') return (
    <div className="step-icon running">
      <div className="w-3 h-3 border-2 rounded-full animate-spin-slow"
        style={{ borderColor: 'rgba(88,166,255,0.3)', borderTopColor: 'var(--blue)' }} />
    </div>
  )
  if (status === 'error') return (
    <div className="step-icon error">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="var(--red)">
        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
      </svg>
    </div>
  )
  return (
    <div className="step-icon pending">
      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--text3)' }} />
    </div>
  )
}

// ─── Directory Tree (terminal-style) ─────────────────────────────────────────
function DirTree({ files, rootName = 'project' }: { files: string[]; rootName?: string }) {
  type TNode = { type: 'dir' | 'file'; children: Record<string, TNode> }
  const root: Record<string, TNode> = {}

  for (const f of (files || []).slice(0, 150)) {
    const parts = f.split('/').filter(Boolean)
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (!cur[part]) cur[part] = { type: i < parts.length - 1 ? 'dir' : 'file', children: {} }
      cur = cur[part].children
    }
  }

  const lines: { text: string; isDir: boolean }[] = []

  function walk(nodes: Record<string, TNode>, prefix: string) {
    const entries = Object.entries(nodes).sort(([, a], [, b]) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return 0
    })
    entries.forEach(([name, node], idx) => {
      const isLast = idx === entries.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPrefix = prefix + (isLast ? '    ' : '│   ')
      lines.push({ text: prefix + connector + name + (node.type === 'dir' ? '/' : ''), isDir: node.type === 'dir' })
      if (node.type === 'dir') walk(node.children, childPrefix)
    })
  }

  walk(root, '')

  return (
    <div className="max-h-96 overflow-y-auto p-3 rounded-md font-mono text-xs leading-6"
      style={{ background: '#010409', border: '1px solid var(--border2)' }}>
      <div style={{ color: 'var(--orange)' }}>{rootName}/</div>
      {lines.map((line, i) => (
        <div key={i} style={{ color: line.isDir ? 'var(--blue)' : 'var(--text2)', whiteSpace: 'pre' }}>
          {line.text}
        </div>
      ))}
    </div>
  )
}

// ─── Charts Panel ─────────────────────────────────────────────────────────────
const CHART_COLORS = ['#3fb950','#58a6ff','#bc8cff','#ffa657','#ff7b72','#39c5cf','#e3b341','#f0883e']

function ChartsPanel({ results, metadata }: { results: any; metadata: any }) {
  const langs = (metadata.languages || []).slice(0, 8)
  const pieData = langs.map((l: any) => ({ name: l.language, value: l.percentage }))

  const qualityData = results.codeQuality ? [
    { metric: 'Maintainability', score: results.codeQuality.maintainabilityScore || 0 },
    { metric: 'Readability',     score: results.codeQuality.readabilityScore || 0 },
    { metric: 'Modularity',      score: results.codeQuality.modularityScore || 0 },
    { metric: 'Security',        score: results.security?.score || 0 },
  ] : []

  const radarData = qualityData.map(d => ({ subject: d.metric, score: d.score, fullMark: 100 }))

  return (
    <div className="space-y-6">
      {/* Quality Radar */}
      {qualityData.length > 0 && (
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Quality Radar</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border2)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text2)', fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 10 }} />
              <Radar dataKey="score" stroke="var(--green)" fill="var(--green)" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Language Pie */}
      {pieData.length > 0 && (
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Language Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)' }} />
              <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Score Bar */}
      {qualityData.length > 0 && (
        <div className="gh-card p-4 rounded-md">
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Score Breakdown</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={qualityData} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 10 }} />
              <YAxis type="category" dataKey="metric" tick={{ fill: 'var(--text2)', fontSize: 11 }} width={110} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 12 }} />
              <Bar dataKey="score" radius={4}>
                {qualityData.map((d: any, i: number) => <Cell key={i} fill={d.score >= 80 ? '#3fb950' : d.score >= 60 ? '#ffa657' : '#ff7b72'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function ResultsPanel({ data }: { data: any }) {
  const [tab, setTab] = useState<'summary'|'overview'|'charts'|'directory'|'run'|'security'|'quality'|'readme'|'api'|'resume'|'improvements'>('summary')
  const [copied, setCopied] = useState(false)
  const results = data?.results || {}
  const metadata = data?.metadata || {}
  const fileList: string[] = metadata.fileList || []

  const copyText = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Detect likely run commands from frameworks
  const frameworks: string[] = metadata.frameworks || []
  const hasNext = frameworks.includes('Next.js') || frameworks.includes('React')
  const hasExpress = frameworks.includes('Express') || frameworks.includes('NestJS')
  const hasPython = Object.keys(metadata.languages || {}).includes('Python') || (metadata.languages || []).some?.((l: any) => l.language === 'Python')
  const hasDocker = metadata.hasDockerfile

  const runSteps = [
    { step: '1. Clone the repository', cmd: `git clone ${data.repoUrl || '<repo-url>'}` },
    { step: '2. Install dependencies', cmd: hasPython ? 'pip install -r requirements.txt' : 'npm install' },
    ...(hasNext ? [{ step: '3. Start frontend dev server', cmd: 'npm run dev' }] : []),
    ...(hasExpress ? [{ step: '3. Start backend server', cmd: 'npm start  # or: node src/index.js' }] : []),
    ...(!hasNext && !hasExpress && !hasPython ? [{ step: '3. Run the project', cmd: 'npm start' }] : []),
    ...(hasPython ? [{ step: '3. Run the app', cmd: 'python main.py  # or: uvicorn main:app --reload' }] : []),
    ...(hasDocker ? [{ step: '(Optional) Run with Docker', cmd: 'docker compose up --build' }] : []),
  ]

  const tabs = [
    { id: 'summary',      label: '📋 Summary' },
    { id: 'overview',     label: 'Overview' },
    { id: 'charts',       label: '📊 Charts' },
    { id: 'directory',    label: '📁 Structure' },
    { id: 'run',          label: '🚀 Run Locally' },
    { id: 'security',     label: `Security ${results.security?.score ? `(${results.security.score})` : ''}` },
    { id: 'quality',      label: 'Quality' },
    { id: 'readme',       label: 'README' },
    { id: 'api',          label: `API (${(results.apiDocs || []).length})` },
    { id: 'resume',       label: 'Resume' },
    { id: 'improvements', label: 'Improvements' },
  ] as const

  const router2 = useRouter()
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
      {/* Success banner */}
      <div className="flex items-center gap-3 p-4 rounded-md mb-4"
        style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(63,185,80,0.2)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--green)">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215L6 10.93l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: 'var(--green2)' }}>
            ✓ Analysis Complete — {data.repoName}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
            {metadata.fileCount?.toLocaleString()} files · {metadata.totalLines?.toLocaleString()} lines · {metadata.frameworks?.slice(0,4).join(', ') || 'No frameworks detected'}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button id="btn-open-workspace" onClick={() => router2.push('/workspace')}
            className="gh-btn gh-btn-secondary text-xs py-1 px-2">
            Open Workspace
          </button>
          <button id="btn-view-reports" onClick={() => router2.push('/reports')}
            className="gh-btn gh-btn-primary text-xs py-1 px-2">
            View Reports
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            id={`result-tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className="px-3 py-2 text-xs font-medium whitespace-nowrap transition-all"
            style={{
              color: tab === t.id ? 'var(--text)' : 'var(--text2)',
              borderBottom: tab === t.id ? '2px solid var(--orange)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 animate-fade-in">

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        {tab === 'summary' && (
          <div className="space-y-4">
            {/* Short project summary card */}
            <div className="gh-card p-5 rounded-md">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Project Summary</div>
              {results.architecture?.summary ? (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{results.architecture.summary}</p>
              ) : (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
                  {data.repoName} — analyzed {metadata.fileCount?.toLocaleString() || '?'} files,
                  {' '}{metadata.totalLines?.toLocaleString() || '?'} lines of code.
                  {frameworks.length > 0 && ` Built with ${frameworks.slice(0, 4).join(', ')}.`}
                </p>
              )}
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Files', value: metadata.fileCount?.toLocaleString() || '—', color: 'var(--green)' },
                { label: 'Lines of Code', value: metadata.totalLines?.toLocaleString() || '—', color: 'var(--blue)' },
                { label: 'Dependencies', value: metadata.dependencies?.length ?? '—', color: 'var(--purple)' },
                { label: 'API Routes', value: metadata.apiRouteCount ?? '—', color: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="gh-card p-3 rounded-md text-center">
                  <div className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Architecture details */}
            {results.architecture && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Folder Structure', value: results.architecture.folderStructure },
                  { label: 'Auth Flow', value: results.architecture.authFlowDetection },
                  { label: 'Database', value: results.architecture.databaseSummary },
                  { label: 'Backend / Frontend', value: results.architecture.backendFrontendSeparation },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} className="p-3 rounded-md" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>{item.label}</div>
                    <div className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
            {/* Dependencies list */}
            {metadata.dependencies?.length > 0 && (
              <div className="gh-card p-4 rounded-md">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Key Dependencies ({metadata.dependencies.length} total)</div>
                <div className="flex flex-wrap gap-1.5">
                  {(metadata.dependencies as string[]).slice(0, 24).map((d: string) => (
                    <span key={d} className="gh-badge gh-badge-blue">{d}</span>
                  ))}
                  {metadata.dependencies.length > 24 && (
                    <span className="gh-badge" style={{ background: 'var(--bg3)', borderColor: 'var(--border2)', color: 'var(--text3)' }}>+{metadata.dependencies.length - 24} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Charts ───────────────────────────────────────────────────────── */}
        {tab === 'charts' && <ChartsPanel results={results} metadata={metadata} />}

        {/* ── Directory ────────────────────────────────────────────────────── */}
        {tab === 'directory' && (
          <div className="gh-card rounded-md overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>Directory Structure — {data.repoName}</span>
              <span className="text-xs" style={{ color: 'var(--text3)' }}>{metadata.fileCount} files</span>
            </div>
            <div className="p-3">
              {fileList.length > 0 ? (
                <DirTree files={fileList} rootName={data.repoName?.split('/').pop() || 'project'} />
              ) : results.architecture?.folderStructure ? (
                <div>
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text2)' }}>{results.architecture.folderStructure}</p>
                  <div className="text-center py-4 text-xs" style={{ color: 'var(--text3)' }}>Full file tree available after re-analysis</div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>Directory data not available for this analysis</div>
              )}
            </div>
          </div>
        )}

        {/* ── Run Locally ───────────────────────────────────────────────────── */}
        {tab === 'run' && (
          <div className="space-y-4">
            {/* Steps */}
            <div className="gh-card rounded-md overflow-hidden">
              <div className="px-4 py-3" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>How to Run Locally</div>
              </div>
              <div className="p-4 space-y-3">
                {runSteps.map((s, i) => (
                  <div key={i}>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>{s.step}</div>
                    <div className="rounded-md px-3 py-2 font-mono text-xs flex items-center gap-2" style={{ background: '#010409', border: '1px solid var(--border2)', color: 'var(--green2)' }}>
                      <span style={{ color: 'var(--text3)' }}>$</span> {s.cmd}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Env Keys */}
            <div className="gh-card rounded-md overflow-hidden">
              <div className="px-4 py-3" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>Required Environment Variables (.env)</div>
              </div>
              <div className="p-4">
                {(results.deploymentGuide?.platforms?.[0]?.envVars || []).length > 0 ? (
                  <div className="rounded-md p-3 font-mono text-xs space-y-1" style={{ background: '#010409', border: '1px solid var(--border2)' }}>
                    {(results.deploymentGuide.platforms[0].envVars as string[]).map((v: string, i: number) => (
                      <div key={i} style={{ color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--blue)' }}>{v.split('=')[0]}</span>
                        {v.includes('=') ? <span style={{ color: 'var(--text3)' }}>={v.split('=')[1]}</span> : <span style={{ color: 'var(--text3)' }}>=&lt;your_value&gt;</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md p-3 font-mono text-xs space-y-1" style={{ background: '#010409', border: '1px solid var(--border2)' }}>
                    {[
                      ...(frameworks.some(f => ['Next.js','React'].includes(f)) ? ['NEXT_PUBLIC_API_URL=http://localhost:4000','NEXTAUTH_SECRET=<random_secret>','NEXTAUTH_URL=http://localhost:3000'] : []),
                      ...(frameworks.some(f => ['Express','NestJS','Fastify'].includes(f)) ? ['PORT=4000','NODE_ENV=development','DATABASE_URL=<your_db_url>'] : []),
                      ...(results.architecture?.authFlowDetection?.includes('NextAuth') ? ['GITHUB_CLIENT_ID=<github_oauth_client_id>','GITHUB_CLIENT_SECRET=<github_oauth_client_secret>','GOOGLE_CLIENT_ID=<google_oauth_client_id>','GOOGLE_CLIENT_SECRET=<google_oauth_client_secret>'] : []),
                      ...((results.architecture?.databaseSummary || '').includes('Prisma') ? ['DATABASE_URL=postgresql://user:pass@localhost:5432/dbname'] : []),
                    ].filter(Boolean).map((v: string, i: number) => (
                      <div key={i} style={{ color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--blue)' }}>{v.split('=')[0]}</span>
                        <span style={{ color: 'var(--text3)' }}>={v.split('=').slice(1).join('=')}</span>
                      </div>
                    ))}
                    {frameworks.length === 0 && <div style={{ color: 'var(--text3)' }}># No env variables detected</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Dependencies */}
            <div className="gh-card rounded-md overflow-hidden">
              <div className="px-4 py-3" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>Dependencies ({metadata.dependencies?.length || 0} packages)</div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  {(metadata.dependencies as string[] || []).slice(0, 40).map((d: string) => (
                    <span key={d} className="gh-badge gh-badge-purple">{d}</span>
                  ))}
                  {(metadata.dependencies?.length || 0) > 40 && (
                    <span className="gh-badge" style={{ background: 'var(--bg3)', borderColor: 'var(--border2)', color: 'var(--text3)' }}>+{metadata.dependencies.length - 40} more</span>
                  )}
                </div>
                {(!metadata.dependencies || metadata.dependencies.length === 0) && (
                  <div className="text-sm text-center py-4" style={{ color: 'var(--text3)' }}>No package dependencies detected</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Files', value: metadata.fileCount?.toLocaleString() || '—', color: 'var(--green)' },
                { label: 'Lines of Code', value: metadata.totalLines?.toLocaleString() || '—', color: 'var(--blue)' },
                { label: 'Dependencies', value: metadata.dependencies?.length || '—', color: 'var(--purple)' },
                { label: 'API Routes', value: metadata.apiRouteCount ?? '—', color: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="gh-card p-3 rounded-md text-center">
                  <div className="text-2xl font-bold mb-0.5" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Architecture */}
            {results.architecture?.summary && (
              <div className="gh-card p-4 rounded-md">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Architecture</div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>{results.architecture.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Folder Structure', value: results.architecture.folderStructure },
                    { label: 'Auth Flow', value: results.architecture.authFlowDetection },
                    { label: 'Database', value: results.architecture.databaseSummary },
                    { label: 'Backend/Frontend', value: results.architecture.backendFrontendSeparation },
                  ].filter(i => i.value).map(item => (
                    <div key={item.label} className="p-3 rounded-md" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--text3)' }}>{item.label}</div>
                      <div className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {metadata.languages?.length > 0 && (
              <div className="gh-card p-4 rounded-md">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Languages</div>
                <div className="space-y-2">
                  {metadata.languages.slice(0, 8).map((l: any) => (
                    <div key={l.language} className="flex items-center gap-3">
                      <span className="lang-dot" style={{ background: l.color }} />
                      <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--text)' }}>{l.language}</span>
                      <div className="flex-1 gh-progress-track" style={{ height: 6 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${l.percentage}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                          className="gh-progress-fill"
                          style={{ background: l.color, height: '100%' }}
                        />
                      </div>
                      <span className="text-xs w-10 text-right font-mono" style={{ color: 'var(--text2)' }}>{l.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frameworks + flags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {metadata.frameworks?.length > 0 && (
                <div className="gh-card p-4 rounded-md">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Frameworks & Tools</div>
                  <div className="flex flex-wrap gap-1.5">
                    {metadata.frameworks.map((f: string) => (
                      <span key={f} className="gh-badge gh-badge-green">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="gh-card p-4 rounded-md">
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Project Features</div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Has Dockerfile', value: metadata.hasDockerfile },
                    { label: 'Has Tests', value: metadata.hasTests },
                    { label: 'Has README', value: metadata.hasReadme },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2 text-xs">
                      <span style={{ color: f.value ? 'var(--green)' : 'var(--red)' }}>
                        {f.value ? '✓' : '✗'}
                      </span>
                      <span style={{ color: f.value ? 'var(--text)' : 'var(--text3)' }}>{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Security ──────────────────────────────────────────────────────── */}
        {tab === 'security' && (
          <div className="space-y-3">
            {results.security ? (
              <>
                <div className="gh-card p-5 rounded-md flex items-center gap-5">
                  <div className="text-5xl font-black flex-shrink-0" style={{
                    color: (results.security.score ?? 0) >= 80 ? 'var(--green)' :
                           (results.security.score ?? 0) >= 60 ? 'var(--yellow)' : 'var(--red)'
                  }}>
                    {results.security.score ?? '—'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>Security Score / 100</div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{results.security.summary}</p>
                  </div>
                </div>
                {(results.security.issues || []).length === 0
                  ? <div className="text-center py-6 text-sm" style={{ color: 'var(--green2)' }}>✓ No security issues found</div>
                  : (results.security.issues as any[]).map((issue: any, i: number) => (
                    <div key={i} className="gh-card p-4 rounded-md flex gap-3">
                      <span className={`gh-badge flex-shrink-0 mt-0.5 ${
                        issue.severity === 'high' ? 'gh-badge-red' :
                        issue.severity === 'medium' ? 'gh-badge-orange' : 'gh-badge-blue'
                      }`}>
                        {(issue.severity || 'low').toUpperCase()}
                      </span>
                      <div>
                        <div className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{issue.type}</div>
                        <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--text2)' }}>{issue.description}</p>
                        {issue.recommendation && (
                          <p className="text-xs" style={{ color: 'var(--green2)' }}>✓ Fix: {issue.recommendation}</p>
                        )}
                        {issue.file && <p className="text-xs font-mono mt-1" style={{ color: 'var(--text3)' }}>{issue.file}</p>}
                      </div>
                    </div>
                  ))
                }
              </>
            ) : (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>Security data not available</div>
            )}
          </div>
        )}

        {/* ── Quality ───────────────────────────────────────────────────────── */}
        {tab === 'quality' && (
          <div className="space-y-3">
            {results.codeQuality ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Maintainability', value: results.codeQuality.maintainabilityScore },
                    { label: 'Readability', value: results.codeQuality.readabilityScore },
                    { label: 'Modularity', value: results.codeQuality.modularityScore },
                  ].map(s => (
                    <div key={s.label} className="gh-card p-4 rounded-md text-center">
                      <div className="text-4xl font-black mb-1" style={{
                        color: (s.value ?? 0) >= 80 ? 'var(--green)' : (s.value ?? 0) >= 60 ? 'var(--yellow)' : 'var(--red)'
                      }}>{s.value ?? '—'}</div>
                      <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>{s.label}</div>
                      <div className="gh-progress-track" style={{ height: 4 }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.value ?? 0}%` }}
                          transition={{ duration: 0.8 }}
                          style={{
                            height: '100%',
                            borderRadius: 99,
                            background: (s.value ?? 0) >= 80 ? 'var(--green)' : (s.value ?? 0) >= 60 ? 'var(--yellow)' : 'var(--red)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {(results.codeQuality.positives || []).length > 0 && (
                  <div className="gh-card p-4 rounded-md">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green2)' }}>Strengths</div>
                    {(results.codeQuality.positives as string[]).map((p, i) => (
                      <div key={i} className="flex gap-2 mb-1 text-xs" style={{ color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--green)' }}>✓</span> {p}
                      </div>
                    ))}
                  </div>
                )}
                {(results.codeQuality.issues || []).length > 0 && (
                  <div className="gh-card p-4 rounded-md">
                    <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--red)' }}>Issues</div>
                    {(results.codeQuality.issues as string[]).map((p, i) => (
                      <div key={i} className="flex gap-2 mb-1 text-xs" style={{ color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--red)' }}>✗</span> {p}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>Quality data not available</div>
            )}
          </div>
        )}

        {/* ── README ────────────────────────────────────────────────────────── */}
        {tab === 'readme' && (
          results.readme?.professional ? (
            <div className="gh-card rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>README.md</span>
                <button id="btn-copy-readme"
                  onClick={() => copyText(results.readme.professional)}
                  className="gh-btn gh-btn-secondary text-xs py-1 px-2">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs leading-relaxed overflow-x-auto"
                style={{
                  color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 600, overflowY: 'auto',
                }}>
                {results.readme.professional}
              </pre>
            </div>
          ) : (
            <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>README not generated</div>
          )
        )}

        {/* ── API ───────────────────────────────────────────────────────────── */}
        {tab === 'api' && (
          <div className="space-y-2">
            {(results.apiDocs as any[] || []).length === 0
              ? <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>No API routes detected in this repository</div>
              : (results.apiDocs as any[]).map((ep: any, i: number) => (
              <div key={i} className="gh-card p-4 rounded-md">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`gh-badge ${
                    ep.method === 'GET' ? 'gh-badge-green' :
                    ep.method === 'POST' ? 'gh-badge-blue' :
                    ep.method === 'DELETE' ? 'gh-badge-red' :
                    ep.method === 'PUT' || ep.method === 'PATCH' ? 'gh-badge-orange' : 'gh-badge-purple'
                  }`}>{ep.method}</span>
                  <code className="text-sm font-mono" style={{ color: 'var(--text)' }}>{ep.path}</code>
                  {ep.auth && <span className="gh-badge gh-badge-purple">Auth</span>}
                </div>
                {ep.description && <p className="text-xs mt-1" style={{ color: 'var(--text2)' }}>{ep.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Resume ────────────────────────────────────────────────────────── */}
        {tab === 'resume' && (
          (results.resumeBullets as string[] || []).length === 0
            ? <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>No resume bullets generated</div>
            : (
            <div className="gh-card rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>ATS-Optimized Resume Bullets</span>
                <button id="btn-copy-bullets"
                  onClick={() => copyText((results.resumeBullets as string[]).map((b: string) => `• ${b}`).join('\n'))}
                  className="gh-btn gh-btn-secondary text-xs py-1 px-2">
                  {copied ? '✓ Copied' : 'Copy All'}
                </button>
              </div>
              <div className="p-4 space-y-2">
                {(results.resumeBullets as string[]).map((b: string, i: number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-md text-xs leading-relaxed"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <span className="flex-shrink-0 font-bold" style={{ color: 'var(--green)' }}>•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* ── Improvements ──────────────────────────────────────────────────── */}
        {tab === 'improvements' && (
          <div className="space-y-3">
            {(results.improvements as any[] || []).length === 0
              ? <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>No improvements data</div>
              : (results.improvements as any[]).map((imp: any, i: number) => (
              <div key={i} className="gh-card p-4 rounded-md">
                <div className="flex items-start gap-2 mb-2">
                  <span className={`gh-badge flex-shrink-0 mt-0.5 ${
                    imp.priority === 'high' ? 'gh-badge-red' :
                    imp.priority === 'medium' ? 'gh-badge-orange' : 'gh-badge-blue'
                  }`}>{(imp.priority || 'low').toUpperCase()}</span>
                  <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{imp.title}</div>
                  {imp.category && (
                    <span className="ml-auto gh-badge gh-badge-purple text-xs">{imp.category}</span>
                  )}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{imp.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Analyze Page ────────────────────────────────────────────────────────
function AnalyzeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addAnalysis } = useAppStore()

  const prefilledRepo = searchParams.get('repo') || ''
  const prefilledName = searchParams.get('name') || ''

  const [repoUrl, setRepoUrl] = useState(prefilledRepo)
  const [steps, setSteps] = useState<AnalysisStep[]>(STEPS_CONFIG)
  const [isRunning, setIsRunning] = useState(false)   // separate from stale-closure-prone state
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [logs, setLogs] = useState<string[]>([])
  const esRef = useRef<EventSource | null>(null)
  const isRunningRef = useRef(false)   // always up-to-date ref alongside state
  const logsRef = useRef<HTMLDivElement>(null)
  const autoStarted = useRef(false)

  // Auto-start when navigated from GitHub page
  useEffect(() => {
    if (prefilledRepo && !autoStarted.current) {
      autoStarted.current = true
      const t = setTimeout(() => startAnalysis(prefilledRepo), 400)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledRepo])

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [logs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) { esRef.current.close(); esRef.current = null }
    }
  }, [])

  const updateStep = useCallback((id: string, updates: Partial<AnalysisStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-200), msg])  // cap at 200 lines
  }, [])

  const reset = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    isRunningRef.current = false
    setIsRunning(false)
    setDone(false)
    setError(null)
    setResult(null)
    setLogs([])
    setSteps(STEPS_CONFIG)
  }, [])

  const startAnalysis = useCallback(async (url?: string) => {
    const target = (url || repoUrl).trim()
    if (!target) return
    if (isRunningRef.current) return  // prevent double-start

    // Clear previous run
    if (esRef.current) { esRef.current.close(); esRef.current = null }

    isRunningRef.current = true
    setIsRunning(true)
    setDone(false)
    setError(null)
    setResult(null)
    setSteps(STEPS_CONFIG)
    setLogs([`▶ Starting analysis of ${target}…`])

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const sseUrl = `${apiBase}/api/analyze/stream?repoUrl=${encodeURIComponent(target)}`

    const es = new EventSource(sseUrl)
    esRef.current = es

    es.addEventListener('progress', (e: MessageEvent) => {
      try {
        const evt = JSON.parse(e.data)
        const { step, status, message } = evt
        addLog(`${message}`)
        updateStep(step, { status, message, data: evt.data })

        // Mark prior pending steps as done when a new one starts
        if (status === 'running') {
          setSteps(prev => {
            const idx = prev.findIndex(s => s.id === step)
            return prev.map((s, i) => (i < idx && s.status === 'pending' ? { ...s, status: 'done' } : s))
          })
        }
      } catch { /* ignore parse errors */ }
    })

    es.addEventListener('ping', () => { /* keep-alive, do nothing */ })

    es.addEventListener('complete', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setResult(data)
        setDone(true)
        setSteps(prev => prev.map(s => ({ ...s, status: 'done' as const })))
        addLog('✓ Analysis complete!')
        // Save to store so workspace + reports pages auto-populate
        addAnalysis({
          id: data.analysisId || data.id || crypto.randomUUID(),
          repoName: data.repoName,
          repoUrl: data.repoUrl || target,
          status: 'complete',
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          metadata: data.metadata,
          results: data.results,
        })
      } catch { /* ignore */ }
      isRunningRef.current = false
      setIsRunning(false)
      es.close()
      esRef.current = null
    })

    es.addEventListener('error', (e: MessageEvent) => {
      // Named 'error' event fired by our server
      try {
        const evt = JSON.parse(e.data)
        setError(evt.message || 'Analysis failed')
      } catch {
        setError('Analysis failed. Please try again.')
      }
      isRunningRef.current = false
      setIsRunning(false)
      es.close()
      esRef.current = null
    })

    // Generic network-level error (different from our named 'error' SSE event)
    es.onerror = () => {
      if (!isRunningRef.current) return  // Already stopped or completed
      // Only treat as error if we haven't received 'complete' yet
      if (!done) {
        setError('Connection to analysis server lost. Check that the backend is running on port 4000, then retry.')
        isRunningRef.current = false
        setIsRunning(false)
        es.close()
        esRef.current = null
      }
    }
  }, [repoUrl, addLog, updateStep, done])

  const progress = steps.filter(s => s.status === 'done').length / steps.length * 100
  const displayName = prefilledName || repoUrl.match(/github\.com\/([^?]+)/)?.[1] || repoUrl

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Analyze Repository</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
          Real-time AI analysis — architecture, security, quality, docs
        </p>
      </div>

      {/* Input — hide when running */}
      {!isRunning && !done && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="gh-card p-4 rounded-md">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
                className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <input
                id="input-repo-url"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full pl-9 pr-3 py-2 rounded-md text-sm font-mono transition-all"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--green)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border2)'}
                onKeyDown={e => { if (e.key === 'Enter') startAnalysis() }}
              />
            </div>
            <button
              id="btn-start-analysis"
              onClick={() => startAnalysis()}
              disabled={!repoUrl.trim()}
              className="gh-btn gh-btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.5 1a4.501 4.501 0 0 1 .216 8.99l3.147 3.146a.5.5 0 0 1-.707.708l-3.147-3.147A4.5 4.5 0 1 1 11.5 1Zm-7 6a.5.5 0 0 0 0 1H6v1.5a.5.5 0 0 0 1 0V8h1.5a.5.5 0 0 0 0-1H7V5.5a.5.5 0 0 0-1 0V7H4.5z"/>
              </svg>
              Start Analysis
            </button>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>
            Or go to{' '}
            <button onClick={() => router.push('/github')} className="underline" style={{ color: 'var(--blue)' }}>
              GitHub Repos
            </button>{' '}
            to pick from your repositories
          </p>
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-md p-4 flex items-start gap-3"
            style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--red)" className="flex-shrink-0 mt-0.5">
              <path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium mb-1" style={{ color: 'var(--red)' }}>Analysis Failed</div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{error}</p>
              {error.includes('OPENAI_API_KEY') && (
                <p className="text-xs mt-2" style={{ color: 'var(--orange)' }}>
                  💡 Add your OpenAI API key to <code className="text-xs" style={{ background: 'var(--bg4)', padding: '1px 4px', borderRadius: 3 }}>backend/.env</code> as <code className="text-xs" style={{ background: 'var(--bg4)', padding: '1px 4px', borderRadius: 3 }}>OPENAI_API_KEY=sk-...</code> then restart the backend.
                </p>
              )}
            </div>
            <button
              id="btn-retry-analysis"
              onClick={reset}
              className="gh-btn gh-btn-secondary text-xs py-1 px-3 flex-shrink-0"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Panel */}
      {(isRunning || done) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Steps sidebar */}
          <div className="lg:col-span-2 gh-card rounded-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
              <div>
                <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)', maxWidth: 180 }}>
                  {displayName}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                  {done
                    ? '✓ Analysis complete'
                    : `Step ${Math.min(steps.filter(s => s.status !== 'pending').length + 1, steps.length)} of ${steps.length}`}
                </div>
              </div>
              {done && (
                <button onClick={reset} className="gh-btn gh-btn-secondary text-xs py-1 px-2">
                  New Analysis
                </button>
              )}
            </div>

            {/* Overall progress bar */}
            <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text3)' }}>
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="gh-progress-track">
                <motion.div
                  className="gh-progress-fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            {/* Step list */}
            <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
              {steps.map(step => (
                <div
                  key={step.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors"
                  style={{ background: step.status === 'running' ? 'rgba(88,166,255,0.04)' : 'transparent' }}
                >
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{
                      color: step.status === 'done' ? 'var(--green2)' :
                             step.status === 'running' ? 'var(--blue)' :
                             step.status === 'error' ? 'var(--red)' : 'var(--text3)',
                    }}>
                      {step.label}
                    </div>
                    <div className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--text3)' }}>
                      {step.message || step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal log */}
          <div className="lg:col-span-3 terminal flex flex-col" style={{ minHeight: 420 }}>
            <div className="terminal-header flex-shrink-0">
              <div className="terminal-dot" style={{ background: '#ff5f57' }} />
              <div className="terminal-dot" style={{ background: '#febc2e' }} />
              <div className="terminal-dot" style={{ background: '#28c840' }} />
              <span className="ml-2 text-xs" style={{ color: 'var(--text3)', fontFamily: 'inherit' }}>
                repomind — analysis log
              </span>
              {isRunning && (
                <span className="ml-auto text-xs font-mono" style={{ color: 'var(--green)' }}>
                  <span className="animate-pulse">●</span> LIVE
                </span>
              )}
              {done && (
                <span className="ml-auto text-xs" style={{ color: 'var(--green2)' }}>✓ Done</span>
              )}
            </div>
            <div
              ref={logsRef}
              className="flex-1 overflow-y-auto p-4 space-y-0.5"
              style={{ maxHeight: 420, minHeight: 380 }}
            >
              <AnimatePresence initial={false}>
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-mono leading-5 flex gap-2"
                  >
                    <span style={{ color: 'var(--text3)', flexShrink: 0, userSelect: 'none' }}>$</span>
                    <span style={{
                      color: log.startsWith('✓') ? 'var(--green2)' :
                             log.toLowerCase().includes('error') || log.toLowerCase().includes('failed') ? 'var(--red)' :
                             log.startsWith('▶') ? 'var(--blue)' : 'var(--text2)',
                    }}>
                      {log}
                      {i === logs.length - 1 && isRunning && (
                        <span className="animate-blink" style={{ color: 'var(--green)' }}>▌</span>
                      )}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {done && result && <ResultsPanel data={result} />}
    </div>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-sm" style={{ color: 'var(--text3)' }}>Loading…</div>
      </div>
    }>
      <AnalyzeContent />
    </Suspense>
  )
}
