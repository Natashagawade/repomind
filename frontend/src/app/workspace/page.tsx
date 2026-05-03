'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { apiClient } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisData {
  id: string
  repoName: string
  repoUrl?: string
  status: string
  createdAt: string
  metadata: any
  results: any
}

// ─── Helper components ────────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', Ruby: '#701516', 'C#': '#178600', CSS: '#563d7c',
  HTML: '#e34c26', Shell: '#89e051', Vue: '#42b883', PHP: '#4F5D95',
}

function MethodBadge({ method }: { method: string }) {
  const cls = method === 'GET' ? 'gh-badge-green' : method === 'POST' ? 'gh-badge-blue'
    : method === 'DELETE' ? 'gh-badge-red' : method === 'PUT' || method === 'PATCH' ? 'gh-badge-orange'
    : 'gh-badge-purple'
  return <span className={`gh-badge ${cls}`}>{method}</span>
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--yellow)' : 'var(--red)'
  return (
    <div className="gh-card rounded-md p-4 text-center">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="text-4xl font-black mb-1"
        style={{ color }}
      >
        {score ?? '—'}
      </motion.div>
      <div className="text-xs mb-2" style={{ color: 'var(--text2)' }}>{label}</div>
      <div className="gh-progress-track" style={{ height: 4 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score ?? 0}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ height: '100%', borderRadius: 99, background: color }}
        />
      </div>
    </div>
  )
}

function EmptyState({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
        <svg width="28" height="28" viewBox="0 0 16 16" fill="var(--text3)">
          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/>
        </svg>
      </div>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>No analysis loaded</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
        Run an analysis first to see results in the workspace
      </p>
      <button id="btn-workspace-analyze" onClick={onAnalyze} className="gh-btn gh-btn-primary">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.5 1a4.501 4.501 0 0 1 .216 8.99l3.147 3.146a.5.5 0 0 1-.707.708l-3.147-3.147A4.5 4.5 0 1 1 11.5 1Zm-7 6a.5.5 0 0 0 0 1H6v1.5a.5.5 0 0 0 1 0V8h1.5a.5.5 0 0 0 0-1H7V5.5a.5.5 0 0 0-1 0V7H4.5z"/>
        </svg>
        Analyze a Repository
      </button>
    </div>
  )
}

// ─── File Tree building ───────────────────────────────────────────────────────
function buildFileTree(files: string[]): { name: string; type: 'dir' | 'file'; depth: number; path: string }[] {
  const seen = new Set<string>()
  const tree: { name: string; type: 'dir' | 'file'; depth: number; path: string }[] = []

  for (const f of files.slice(0, 60)) {
    const parts = f.split('/')
    for (let d = 0; d < parts.length; d++) {
      const partPath = parts.slice(0, d + 1).join('/')
      if (seen.has(partPath)) continue
      seen.add(partPath)
      const isLast = d === parts.length - 1
      tree.push({ name: parts[d], type: isLast ? 'file' : 'dir', depth: d, path: partPath })
    }
  }
  return tree
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN WORKSPACE
// ════════════════════════════════════════════════════════════════════════════
function WorkspaceContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { analyses, currentAnalysis, setCurrentAnalysis } = useAppStore()

  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Load from query param or current analysis or most recent
  const loadAnalysis = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/api/analyze/${id}`)
      setAnalysis(data)
      setCurrentAnalysis(data)
    } catch {
      // Fallback to store
      const stored = analyses.find(a => a.id === id)
      if (stored) setAnalysis(stored as any)
    } finally {
      setLoading(false)
    }
  }, [analyses, setCurrentAnalysis])

  useEffect(() => {
    const id = searchParams.get('id')
    if (id) {
      loadAnalysis(id)
    } else if (currentAnalysis) {
      setAnalysis(currentAnalysis as any)
    } else if (analyses.length > 0) {
      loadAnalysis(analyses[0].id)
    }
  }, [searchParams, currentAnalysis, analyses, loadAnalysis])

  // Also poll backend for latest
  useEffect(() => {
    const fetchLatest = async () => {
      if (analysis) return // already have one
      try {
        const { data } = await apiClient.get('/api/analyze')
        if (data.analyses?.length > 0) {
          await loadAnalysis(data.analyses[0].id)
        }
      } catch { /* ignore */ }
    }
    fetchLatest()
  }, [analysis, loadAnalysis])

  const results = analysis?.results || {}
  const metadata = analysis?.metadata || {}
  const repoName = analysis?.repoName || ''

  const TABS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'architecture', label: 'Architecture' },
    { id: 'security',     label: `Security${metadata ? ` (${results.security?.score ?? '—'})` : ''}` },
    { id: 'quality',      label: 'Quality' },
    { id: 'api',          label: `API (${(results.apiDocs || []).length})` },
    { id: 'readme',       label: 'README' },
    { id: 'resume',       label: 'Resume' },
    { id: 'improvements', label: 'Improvements' },
    { id: 'deploy',       label: 'Deploy' },
    { id: 'interview',    label: 'Interview Qs' },
  ]

  const fileTree = metadata?.languages
    ? buildFileTree(
        // Build a representative listing from language info
        Object.keys(metadata.languages || {}).flatMap((_, i) => [`src/module${i + 1}/index.ts`, `src/module${i + 1}/service.ts`])
      )
    : []

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-12 animate-shimmer rounded-md" />
        <div className="h-24 animate-shimmer rounded-md" />
        <div className="h-96 animate-shimmer rounded-md" />
      </div>
    )
  }

  if (!analysis) {
    return <EmptyState onAnalyze={() => router.push('/analyze')} />
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Workspace</h1>
            <span className="gh-badge gh-badge-green">✓ Complete</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <a href={analysis.repoUrl || '#'} target="_blank" rel="noopener noreferrer"
              className="text-sm font-mono hover:underline" style={{ color: 'var(--blue)' }}>
              {repoName}
            </a>
            <span style={{ color: 'var(--text3)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text2)' }}>
              {metadata.fileCount?.toLocaleString()} files · {metadata.totalLines?.toLocaleString()} lines
            </span>
            <span style={{ color: 'var(--text3)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text2)' }}>
              {new Date(analysis.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {/* History picker */}
          {analyses.length > 1 && (
            <div className="relative">
              <button
                id="btn-switch-analysis"
                onClick={() => setShowHistory(h => !h)}
                className="gh-btn gh-btn-secondary text-xs"
              >
                Switch Repo ▾
              </button>
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute right-0 top-9 z-20 rounded-md overflow-hidden shadow-xl"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', minWidth: 240 }}
                  >
                    {analyses.slice(0, 10).map(a => (
                      <div
                        key={a.id}
                        onClick={() => { loadAnalysis(a.id); setShowHistory(false) }}
                        className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors"
                        style={{ color: a.id === analysis.id ? 'var(--green)' : 'var(--text2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0 }}>
                          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z"/>
                        </svg>
                        <span className="flex-1 truncate">{a.repoName}</span>
                        {a.id === analysis.id && <span>✓</span>}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <button
            id="btn-workspace-export"
            onClick={() => router.push(`/reports?id=${analysis.id}`)}
            className="gh-btn gh-btn-primary text-xs"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Zm-1-5.47L8 11.81 4.25 8.53a.749.749 0 1 0-.996 1.12l4.25 3.76a.75.75 0 0 0 .996 0l4.25-3.76a.749.749 0 1 0-.996-1.12L8.75 9.56V1.75a.75.75 0 0 0-1.5 0v7.81l-1.5-1.03Z"/>
            </svg>
            Export Reports
          </button>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
        {[
          { label: 'Files', value: metadata.fileCount?.toLocaleString() || '—' },
          { label: 'Lines', value: metadata.totalLines?.toLocaleString() || '—' },
          { label: 'Deps', value: metadata.dependencies?.length || '—' },
          { label: 'API Routes', value: metadata.apiRouteCount ?? '—' },
          { label: 'Frameworks', value: metadata.frameworks?.length || '—' },
          { label: 'Security', value: results.security?.score ? `${results.security.score}/100` : '—' },
          { label: 'Depth', value: metadata.folderDepth || '—' },
        ].map(s => (
          <div key={s.label} className="gh-card p-2 rounded-md text-center">
            <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{s.value}</div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main layout: file tree + tab panel */}
      <div className="flex gap-0 rounded-md overflow-hidden" style={{ border: '1px solid var(--border)', minHeight: 560 }}>
        {/* File tree sidebar */}
        <div className="w-48 flex-shrink-0 overflow-y-auto" style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border)' }}>
          <div className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
            Files
          </div>
          {metadata.languages && (
            <div className="p-2 font-mono text-xs space-y-0.5">
              {/* Repo root */}
              <div className="flex items-center gap-1.5 py-0.5 px-1 rounded-md" style={{ color: 'var(--blue)' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.75 0A1.75 1.75 0 0 0 0 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0 0 16 14.25V1.75A1.75 1.75 0 0 0 14.25 0Zm1 1.5h11a.25.25 0 0 1 .25.25v11.5a.25.25 0 0 1-.25.25h-11a.25.25 0 0 1-.25-.25V1.75a.25.25 0 0 1 .25-.25Z"/>
                </svg>
                <span className="truncate">{repoName.split('/')[1] || repoName}</span>
              </div>

              {/* Render language-based virtual tree */}
              {(metadata.languages as any[]).slice(0, 8).map((lang: any, i: number) => (
                <div key={i}>
                  <div className="flex items-center gap-1.5 py-0.5 px-1" style={{ paddingLeft: 16, color: 'var(--text2)' }}>
                    <span style={{ color: lang.color }}>●</span>
                    <span className="truncate">{lang.language.toLowerCase()}/</span>
                  </div>
                  <div className="py-0.5 px-1 text-xs truncate"
                    style={{ paddingLeft: 28, color: selectedFile === `${lang.language}-index` ? 'var(--text)' : 'var(--text3)', cursor: 'pointer' }}
                    onClick={() => setSelectedFile(`${lang.language}-index`)}>
                    index.{lang.language === 'Python' ? 'py' : lang.language === 'Go' ? 'go' : 'ts'}
                  </div>
                </div>
              ))}

              {/* Common files */}
              {[
                metadata.hasDockerfile && { name: 'Dockerfile', icon: '🐳' },
                metadata.hasReadme && { name: 'README.md', icon: '📝' },
                metadata.hasTests && { name: 'tests/', icon: '🧪' },
                metadata.dependencies?.length && { name: 'package.json', icon: '📦' },
              ].filter(Boolean).map((f: any) => (
                <div key={f.name} className="flex items-center gap-1.5 py-0.5 px-1 cursor-pointer rounded-sm"
                  style={{ color: 'var(--text3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text3)')}
                >
                  <span>{f.icon}</span>
                  <span className="truncate">{f.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab panel */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--bg2)' }}>
          {/* Tab bar */}
          <div className="flex border-b overflow-x-auto flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                id={`ws-tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className="px-3 py-2.5 text-xs whitespace-nowrap transition-all"
                style={{
                  color: tab === t.id ? 'var(--text)' : 'var(--text2)',
                  borderBottom: tab === t.id ? '2px solid var(--green)' : '2px solid transparent',
                  marginBottom: -1,
                  background: tab === t.id ? 'rgba(63,185,80,0.04)' : 'transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >

                {/* ── Overview ─────────────────────────────────────────── */}
                {tab === 'overview' && (
                  <>
                    {/* Language bars */}
                    <div className="gh-card p-4 rounded-md">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Languages</div>
                      <div className="space-y-2">
                        {(metadata.languages || []).slice(0, 7).map((l: any) => (
                          <div key={l.language} className="flex items-center gap-3">
                            <span className="lang-dot" style={{ background: l.color || LANG_COLORS[l.language] || '#8b949e' }} />
                            <span className="text-xs w-24 flex-shrink-0" style={{ color: 'var(--text)' }}>{l.language}</span>
                            <div className="flex-1 gh-progress-track" style={{ height: 6 }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${l.percentage}%` }}
                                transition={{ duration: 0.8 }}
                                style={{ height: '100%', borderRadius: 99, background: l.color || LANG_COLORS[l.language] || '#8b949e' }}
                              />
                            </div>
                            <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--text3)' }}>{l.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Frameworks + flags */}
                    <div className="grid grid-cols-2 gap-3">
                      {(metadata.frameworks || []).length > 0 && (
                        <div className="gh-card p-4 rounded-md">
                          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Frameworks</div>
                          <div className="flex flex-wrap gap-1.5">
                            {(metadata.frameworks as string[]).map(f => (
                              <span key={f} className="gh-badge gh-badge-green">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="gh-card p-4 rounded-md">
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Features</div>
                        {[
                          { label: 'Has Dockerfile', v: metadata.hasDockerfile },
                          { label: 'Has Tests', v: metadata.hasTests },
                          { label: 'Has README', v: metadata.hasReadme },
                        ].map(f => (
                          <div key={f.label} className="flex items-center gap-2 text-xs py-0.5">
                            <span style={{ color: f.v ? 'var(--green)' : 'var(--red)' }}>{f.v ? '✓' : '✗'}</span>
                            <span style={{ color: f.v ? 'var(--text)' : 'var(--text3)' }}>{f.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── Architecture ─────────────────────────────────────── */}
                {tab === 'architecture' && (
                  results.architecture ? (
                    <>
                      <div className="gh-card p-4 rounded-md">
                        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Summary</div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{results.architecture.summary}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Folder Structure', value: results.architecture.folderStructure, color: 'var(--blue)' },
                          { label: 'Component Relationships', value: results.architecture.componentRelationships, color: 'var(--purple)' },
                          { label: 'Auth Flow', value: results.architecture.authFlowDetection, color: 'var(--orange)' },
                          { label: 'Database', value: results.architecture.databaseSummary, color: 'var(--green)' },
                          { label: 'Backend / Frontend', value: results.architecture.backendFrontendSeparation, color: 'var(--blue)' },
                        ].filter(i => i.value).map(item => (
                          <div key={item.label} className="gh-card p-4 rounded-md">
                            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: item.color }}>{item.label}</div>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>Architecture data not available</div>
                )}

                {/* ── Security ─────────────────────────────────────────── */}
                {tab === 'security' && (
                  results.security ? (
                    <>
                      <div className="gh-card p-5 rounded-md flex items-center gap-5">
                        <div className="text-5xl font-black" style={{
                          color: results.security.score >= 80 ? 'var(--green)' : results.security.score >= 60 ? 'var(--yellow)' : 'var(--red)'
                        }}>{results.security.score}</div>
                        <div>
                          <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>Security Score / 100</div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{results.security.summary}</p>
                        </div>
                      </div>
                      {(results.security.issues || []).length === 0
                        ? <div className="text-center py-6" style={{ color: 'var(--green2)' }}>✓ No security issues found</div>
                        : (results.security.issues as any[]).map((issue: any, i: number) => (
                          <div key={i} className="gh-card p-4 rounded-md flex gap-3">
                            <span className={`gh-badge flex-shrink-0 mt-0.5 ${issue.severity === 'high' ? 'gh-badge-red' : issue.severity === 'medium' ? 'gh-badge-orange' : 'gh-badge-blue'}`}>
                              {(issue.severity || 'low').toUpperCase()}
                            </span>
                            <div>
                              <div className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{issue.type}</div>
                              <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--text2)' }}>{issue.description}</p>
                              {issue.recommendation && <p className="text-xs" style={{ color: 'var(--green2)' }}>✓ {issue.recommendation}</p>}
                              {issue.file && <code className="text-xs mt-1 block" style={{ color: 'var(--text3)' }}>{issue.file}</code>}
                            </div>
                          </div>
                        ))
                      }
                    </>
                  ) : <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>Security data not available</div>
                )}

                {/* ── Quality ──────────────────────────────────────────── */}
                {tab === 'quality' && (
                  results.codeQuality ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <ScoreRing score={results.codeQuality.maintainabilityScore} label="Maintainability" />
                        <ScoreRing score={results.codeQuality.readabilityScore} label="Readability" />
                        <ScoreRing score={results.codeQuality.modularityScore} label="Modularity" />
                      </div>
                      {(results.codeQuality.positives || []).length > 0 && (
                        <div className="gh-card p-4 rounded-md">
                          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green2)' }}>Strengths</div>
                          {(results.codeQuality.positives as string[]).map((p, i) => (
                            <div key={i} className="flex gap-2 text-xs py-0.5" style={{ color: 'var(--text2)' }}>
                              <span style={{ color: 'var(--green)' }}>✓</span>{p}
                            </div>
                          ))}
                        </div>
                      )}
                      {(results.codeQuality.issues || []).length > 0 && (
                        <div className="gh-card p-4 rounded-md">
                          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--red)' }}>Issues</div>
                          {(results.codeQuality.issues as string[]).map((p, i) => (
                            <div key={i} className="flex gap-2 text-xs py-0.5" style={{ color: 'var(--text2)' }}>
                              <span style={{ color: 'var(--red)' }}>✗</span>{p}
                            </div>
                          ))}
                        </div>
                      )}
                      {(results.codeQuality.largeFiles || []).length > 0 && (
                        <div className="gh-card p-4 rounded-md">
                          <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--orange)' }}>Large Files</div>
                          {(results.codeQuality.largeFiles as string[]).map((f, i) => (
                            <code key={i} className="block text-xs py-0.5" style={{ color: 'var(--text2)' }}>{f}</code>
                          ))}
                        </div>
                      )}
                    </>
                  ) : <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>Quality data not available</div>
                )}

                {/* ── API ──────────────────────────────────────────────── */}
                {tab === 'api' && (
                  (results.apiDocs || []).length === 0
                    ? <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>No API routes detected</div>
                    : (results.apiDocs as any[]).map((ep: any, i: number) => (
                      <div key={i} className="gh-card p-3 rounded-md">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <MethodBadge method={ep.method} />
                          <code className="text-sm" style={{ color: 'var(--text)' }}>{ep.path}</code>
                          {ep.auth && <span className="gh-badge gh-badge-purple ml-auto">🔒 Auth</span>}
                        </div>
                        {ep.description && <p className="text-xs" style={{ color: 'var(--text2)' }}>{ep.description}</p>}
                      </div>
                    ))
                )}

                {/* ── README ───────────────────────────────────────────── */}
                {tab === 'readme' && (
                  results.readme?.professional ? (
                    <div className="gh-card rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>README.md</span>
                        <button id="btn-ws-copy-readme"
                          onClick={() => navigator.clipboard.writeText(results.readme.professional)}
                          className="gh-btn gh-btn-secondary text-xs py-1 px-2">Copy</button>
                      </div>
                      <pre className="p-4 text-xs leading-relaxed overflow-x-auto"
                        style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 500, overflowY: 'auto' }}>
                        {results.readme.professional}
                      </pre>
                    </div>
                  ) : <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>README not generated</div>
                )}

                {/* ── Resume ───────────────────────────────────────────── */}
                {tab === 'resume' && (
                  (results.resumeBullets || []).length === 0
                    ? <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>No resume bullets</div>
                    : (
                      <div className="gh-card rounded-md overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>ATS-Optimized Resume Bullets</span>
                          <button id="btn-ws-copy-bullets"
                            onClick={() => navigator.clipboard.writeText((results.resumeBullets as string[]).map(b => `• ${b}`).join('\n'))}
                            className="gh-btn gh-btn-secondary text-xs py-1 px-2">Copy All</button>
                        </div>
                        <div className="p-4 space-y-2">
                          {(results.resumeBullets as string[]).map((b, i) => (
                            <div key={i} className="flex gap-3 p-3 rounded-md text-xs leading-relaxed"
                              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                              <span className="font-bold flex-shrink-0" style={{ color: 'var(--green)' }}>•</span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                )}

                {/* ── Improvements ─────────────────────────────────────── */}
                {tab === 'improvements' && (
                  (results.improvements || []).length === 0
                    ? <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>No improvements data</div>
                    : (results.improvements as any[]).map((imp: any, i: number) => (
                      <div key={i} className="gh-card p-4 rounded-md">
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`gh-badge flex-shrink-0 mt-0.5 ${imp.priority === 'high' ? 'gh-badge-red' : imp.priority === 'medium' ? 'gh-badge-orange' : 'gh-badge-blue'}`}>
                            {(imp.priority || 'low').toUpperCase()}
                          </span>
                          <div className="font-medium text-sm" style={{ color: 'var(--text)' }}>{imp.title}</div>
                          {imp.category && <span className="ml-auto gh-badge gh-badge-purple">{imp.category}</span>}
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text2)' }}>{imp.description}</p>
                      </div>
                    ))
                )}

                {/* ── Deploy ───────────────────────────────────────────── */}
                {tab === 'deploy' && (
                  (results.deploymentGuide?.platforms || []).length === 0
                    ? <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>No deployment guide</div>
                    : (results.deploymentGuide.platforms as any[]).map((guide: any, i: number) => (
                      <div key={i} className="gh-card p-4 rounded-md">
                        <div className="font-semibold text-sm mb-3 capitalize" style={{ color: 'var(--text)' }}>
                          {guide.platform === 'vercel' ? '▲ Vercel' : guide.platform === 'docker' ? '🐳 Docker' : guide.platform === 'render' ? '🟣 Render' : guide.platform === 'railway' ? '🚂 Railway' : guide.platform}
                        </div>
                        {(guide.steps || []).length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {(guide.steps as string[]).map((step, j) => (
                              <div key={j} className="flex gap-2 text-xs" style={{ color: 'var(--text2)' }}>
                                <span className="flex-shrink-0 font-mono" style={{ color: 'var(--text3)' }}>{j + 1}.</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(guide.commands || []).length > 0 && (
                          <div className="rounded-md p-3 font-mono text-xs" style={{ background: '#010409', border: '1px solid var(--border2)' }}>
                            {(guide.commands as string[]).map((cmd, j) => (
                              <div key={j} className="flex gap-2" style={{ color: 'var(--green2)' }}>
                                <span style={{ color: 'var(--text3)' }}>$</span>{cmd}
                              </div>
                            ))}
                          </div>
                        )}
                        {guide.notes && <p className="text-xs mt-3" style={{ color: 'var(--text3)' }}>💡 {guide.notes}</p>}
                      </div>
                    ))
                )}

                {/* ── Interview ────────────────────────────────────────── */}
                {tab === 'interview' && (
                  (results.interviewQuestions || []).length === 0
                    ? <div className="text-center py-12 text-sm" style={{ color: 'var(--text3)' }}>No interview questions</div>
                    : (results.interviewQuestions as any[]).map((q: any, i: number) => (
                      <div key={i} className="gh-card p-4 rounded-md"
                        style={{ borderLeft: `3px solid ${q.category === 'security' ? 'var(--red)' : q.category === 'database' ? 'var(--blue)' : q.category === 'scaling' ? 'var(--orange)' : 'var(--green)'}` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text3)' }}>{q.category}</span>
                          <span className={`ml-auto gh-badge ${q.difficulty === 'hard' ? 'gh-badge-red' : q.difficulty === 'medium' ? 'gh-badge-orange' : 'gh-badge-blue'}`}>
                            {q.difficulty}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text)' }}>{q.question}</p>
                        {q.hint && <p className="text-xs" style={{ color: 'var(--text2)' }}>💡 {q.hint}</p>}
                      </div>
                    ))
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="space-y-4 animate-fade-in">
        <div className="h-12 animate-shimmer rounded-md" />
        <div className="h-24 animate-shimmer rounded-md" />
        <div className="h-96 animate-shimmer rounded-md" />
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}
