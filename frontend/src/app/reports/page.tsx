'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { apiClient } from '@/lib/api'

// ─── download helper ──────────────────────────────────────────────────────────
function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Toast helper (no library needed) ───────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const show = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2800)
  }, [])
  return { toast, show }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalysisSummary { id: string; repoName: string; createdAt: string; status: string; metadata: any }
interface AnalysisData { id: string; repoName: string; repoUrl?: string; createdAt: string; metadata: any; results: any }

// ─── Report definition ────────────────────────────────────────────────────────
function getReports(repoName: string, results: any, metadata: any) {
  return [
    {
      id: 'readme', icon: '📝', label: 'README',
      name: `${repoName} — Professional README`,
      meta: `Markdown · ${results?.readme?.professional?.split('\n').length || 0} lines`,
      color: 'var(--purple)', colorBg: 'rgba(163,110,255,0.08)',
      content: results?.readme?.professional || '',
      ext: '.md',
      available: !!(results?.readme?.professional),
    },
    {
      id: 'bullets', icon: '📋', label: 'Resume Bullets',
      name: `${repoName} — ATS Resume Bullets`,
      meta: `Text · ${(results?.resumeBullets || []).length} bullets`,
      color: 'var(--green)', colorBg: 'rgba(63,185,80,0.08)',
      content: (results?.resumeBullets || []).map((b: string) => `• ${b}`).join('\n'),
      ext: '.txt',
      available: (results?.resumeBullets || []).length > 0,
    },
    {
      id: 'api', icon: '🔌', label: 'API Docs',
      name: `${repoName} — API Documentation`,
      meta: `JSON · ${(results?.apiDocs || []).length} endpoints`,
      color: 'var(--blue)', colorBg: 'rgba(88,166,255,0.08)',
      content: JSON.stringify(results?.apiDocs || [], null, 2),
      ext: '.json',
      available: (results?.apiDocs || []).length > 0,
    },
    {
      id: 'security', icon: '🔒', label: 'Security Report',
      name: `${repoName} — Security Scan`,
      meta: `JSON · Score ${results?.security?.score ?? '—'}/100 · ${(results?.security?.issues || []).length} issues`,
      color: 'var(--red)', colorBg: 'rgba(248,81,73,0.08)',
      content: JSON.stringify(results?.security || {}, null, 2),
      ext: '.json',
      available: !!(results?.security),
    },
    {
      id: 'architecture', icon: '🏗', label: 'Architecture',
      name: `${repoName} — Architecture Analysis`,
      meta: `Markdown · Full architecture breakdown`,
      color: 'var(--orange)', colorBg: 'rgba(210,153,34,0.08)',
      content: results?.architecture
        ? `# Architecture Report: ${repoName}\n\n## Summary\n${results.architecture.summary}\n\n## Folder Structure\n${results.architecture.folderStructure}\n\n## Component Relationships\n${results.architecture.componentRelationships}\n\n## Backend / Frontend\n${results.architecture.backendFrontendSeparation}\n\n## Auth Flow\n${results.architecture.authFlowDetection}\n\n## Database\n${results.architecture.databaseSummary}`
        : '',
      ext: '.md',
      available: !!(results?.architecture?.summary),
    },
    {
      id: 'improvements', icon: '💡', label: 'Improvements',
      name: `${repoName} — Suggested Improvements`,
      meta: `Text · ${(results?.improvements || []).length} suggestions`,
      color: 'var(--yellow)', colorBg: 'rgba(210,153,34,0.08)',
      content: (results?.improvements || []).map((imp: any, i: number) =>
        `${i + 1}. [${(imp.priority || 'low').toUpperCase()}] ${imp.title}\n   ${imp.description}\n   Category: ${imp.category}`
      ).join('\n\n'),
      ext: '.txt',
      available: (results?.improvements || []).length > 0,
    },
    {
      id: 'deploy', icon: '🚀', label: 'Deploy Guide',
      name: `${repoName} — Deployment Guide`,
      meta: `Markdown · ${(results?.deploymentGuide?.platforms || []).map((p: any) => p.platform).join(', ')}`,
      color: '#58a6ff', colorBg: 'rgba(88,166,255,0.08)',
      content: (results?.deploymentGuide?.platforms || []).map((guide: any) =>
        `## ${guide.platform}\n\n${(guide.steps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}\n\n### Commands\n\`\`\`bash\n${(guide.commands || []).join('\n')}\n\`\`\`\n\n${guide.notes ? `> ${guide.notes}` : ''}`
      ).join('\n\n---\n\n'),
      ext: '.md',
      available: (results?.deploymentGuide?.platforms || []).length > 0,
    },
    {
      id: 'interview', icon: '💬', label: 'Interview Qs',
      name: `${repoName} — Interview Questions`,
      meta: `Text · ${(results?.interviewQuestions || []).length} questions`,
      color: 'var(--purple)', colorBg: 'rgba(163,110,255,0.08)',
      content: (results?.interviewQuestions || []).map((q: any, i: number) =>
        `${i + 1}. [${(q.category || '').toUpperCase()}] [${(q.difficulty || '').toUpperCase()}]\n   Q: ${q.question}\n   Hint: ${q.hint || 'N/A'}`
      ).join('\n\n'),
      ext: '.txt',
      available: (results?.interviewQuestions || []).length > 0,
    },
    {
      id: 'full', icon: '📊', label: 'Full JSON',
      name: `${repoName} — Full Analysis Data`,
      meta: `JSON · Complete structured output`,
      color: '#79c0ff', colorBg: 'rgba(88,166,255,0.05)',
      content: JSON.stringify({ metadata, results }, null, 2),
      ext: '.json',
      available: !!(results),
    },
  ]
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="gh-card p-4 rounded-md">
      <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text3)' }}>{label}</div>
    </div>
  )
}

// ─── Report Row ───────────────────────────────────────────────────────────────
function ReportRow({
  report, idx, repoName, onCopy, onDownload, copying, downloading, previewId, onPreview
}: {
  report: ReturnType<typeof getReports>[0]
  idx: number
  repoName: string
  onCopy: (r: any) => void
  onDownload: (r: any) => void
  copying: string | null
  downloading: string | null
  previewId: string | null
  onPreview: (id: string | null) => void
}) {
  const isActive = previewId === report.id
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="rounded-md overflow-hidden"
      style={{ border: `1px solid ${isActive ? 'var(--green-border)' : 'var(--border)'}`, background: isActive ? 'var(--green-bg)' : 'var(--bg2)' }}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer transition-colors"
        onClick={() => onPreview(isActive ? null : report.id)}
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-md flex items-center justify-center text-base flex-shrink-0"
          style={{ background: report.colorBg, border: '1px solid var(--border)' }}>
          {report.icon}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{report.name}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{report.meta}</div>
        </div>
        {/* Status */}
        {!report.available && (
          <span className="gh-badge gh-badge-orange text-xs flex-shrink-0">No Data</span>
        )}
        {/* Actions */}
        <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            id={`btn-copy-${report.id}`}
            onClick={() => onCopy(report)}
            disabled={!report.available || copying === report.id}
            className="gh-btn gh-btn-secondary text-xs py-1 px-2 disabled:opacity-40"
          >
            {copying === report.id ? '✓' : '📋 Copy'}
          </button>
          <button
            id={`btn-download-${report.id}`}
            onClick={() => onDownload(report)}
            disabled={!report.available || downloading === report.id}
            className="gh-btn gh-btn-secondary text-xs py-1 px-2 disabled:opacity-40"
          >
            {downloading === report.id ? '...' : `⬇ ${report.ext}`}
          </button>
        </div>
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="var(--text3)"
          style={{ flexShrink: 0, transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"/>
        </svg>
      </div>

      {/* Expandable Preview */}
      <AnimatePresence>
        {isActive && report.available && report.content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg3)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text3)' }}>{repoName.split('/')[1] || repoName}{report.ext}</span>
                <button onClick={() => onCopy(report)} className="gh-btn gh-btn-secondary text-xs py-0.5 px-2">
                  {copying === report.id ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs leading-relaxed overflow-x-auto"
                style={{
                  color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 320, overflowY: 'auto', background: '#010409',
                }}>
                {report.content.slice(0, 4000)}{report.content.length > 4000 ? '\n\n... (truncated)' : ''}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN REPORTS PAGE
// ════════════════════════════════════════════════════════════════════════════
function ReportsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { analyses, currentAnalysis, setCurrentAnalysis } = useAppStore()
  const { toast, show: showToast } = useToast()

  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [allAnalyses, setAllAnalyses] = useState<AnalysisSummary[]>([])
  const [copying, setCopying] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  const loadAnalysis = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const { data } = await apiClient.get(`/api/analyze/${id}`)
      setAnalysis(data)
      setCurrentAnalysis(data)
    } catch {
      const stored = analyses.find(a => a.id === id)
      if (stored) setAnalysis(stored as any)
    } finally {
      setLoading(false)
    }
  }, [analyses, setCurrentAnalysis])

  // Load from query / store / API
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) { loadAnalysis(id); return }
    if (currentAnalysis) { setAnalysis(currentAnalysis as any); return }
    if (analyses.length > 0) { loadAnalysis(analyses[0].id); return }
    // Fetch from API
    apiClient.get('/api/analyze').then(({ data }) => {
      if (data.analyses?.length > 0) {
        setAllAnalyses(data.analyses)
        loadAnalysis(data.analyses[0].id)
      }
    }).catch(() => {})
  }, [searchParams, currentAnalysis, analyses, loadAnalysis])

  // Also fetch full list
  useEffect(() => {
    apiClient.get('/api/analyze').then(({ data }) => {
      if (data.analyses?.length > 0) setAllAnalyses(data.analyses)
    }).catch(() => {})
  }, [])

  const handleCopy = useCallback(async (report: any) => {
    if (!report.content) return
    try {
      await navigator.clipboard.writeText(report.content)
      setCopying(report.id)
      showToast(`✓ ${report.label} copied to clipboard`)
      setTimeout(() => setCopying(null), 2000)
    } catch {
      showToast('Failed to copy', 'error')
    }
  }, [showToast])

  const handleDownload = useCallback((report: any) => {
    if (!report.content) return
    setDownloading(report.id)
    const safeRepo = (analysis?.repoName || 'repo').replace('/', '-')
    downloadFile(report.content, `repomind-${safeRepo}-${report.id}${report.ext}`)
    showToast(`✓ Downloaded ${report.label}${report.ext}`)
    setTimeout(() => setDownloading(null), 1000)
  }, [analysis, showToast])

  const handleDownloadAll = useCallback(() => {
    if (!analysis) return
    const all = getReports(analysis.repoName, analysis.results, analysis.metadata)
      .filter(r => r.available)
    all.forEach((r, i) => {
      setTimeout(() => {
        const safeRepo = analysis.repoName.replace('/', '-')
        downloadFile(r.content, `repomind-${safeRepo}-${r.id}${r.ext}`)
      }, i * 300)
    })
    showToast(`✓ Downloading ${all.length} reports…`)
  }, [analysis, showToast])

  const results = analysis?.results || {}
  const metadata = analysis?.metadata || {}
  const reports = analysis ? getReports(analysis.repoName || '', results, metadata) : []
  const filteredReports = reports.filter(r =>
    !filter || r.label.toLowerCase().includes(filter.toLowerCase()) || r.name.toLowerCase().includes(filter.toLowerCase())
  )
  const availableCount = reports.filter(r => r.available).length
  const totalBullets = (results.resumeBullets || []).length
  const totalIssues = (results.security?.issues || []).length
  const totalEndpoints = (results.apiDocs || []).length

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-10 animate-shimmer rounded-md" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-shimmer rounded-md" />)}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-14 animate-shimmer rounded-md" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12, x: '-50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 z-50 px-4 py-2.5 rounded-md text-sm font-medium shadow-lg"
            style={{
              background: toast.type === 'success' ? 'var(--green-bg)' : 'rgba(248,81,73,0.12)',
              border: `1px solid ${toast.type === 'success' ? 'var(--green-border)' : 'rgba(248,81,73,0.3)'}`,
              color: toast.type === 'success' ? 'var(--green2)' : 'var(--red)',
            }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Reports & Exports</h1>
          <p className="text-sm" style={{ color: 'var(--text2)' }}>
            All generated outputs — download, copy, or preview
          </p>
        </div>
        <div className="flex gap-2">
          {/* Repo picker */}
          {allAnalyses.length > 1 && (
            <div className="relative">
              <button
                id="btn-switch-repo"
                onClick={() => setShowPicker(p => !p)}
                className="gh-btn gh-btn-secondary text-xs"
              >
                {analysis?.repoName?.split('/')[1] || 'Select Repo'} ▾
              </button>
              <AnimatePresence>
                {showPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-9 z-20 rounded-md overflow-hidden shadow-xl"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', minWidth: 240 }}
                  >
                    {allAnalyses.slice(0, 10).map(a => (
                      <div
                        key={a.id}
                        onClick={() => { loadAnalysis(a.id); setShowPicker(false) }}
                        className="px-3 py-2 text-xs cursor-pointer transition-colors"
                        style={{ color: a.id === analysis?.id ? 'var(--green)' : 'var(--text2)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg4)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="font-medium">{a.repoName}</div>
                        <div style={{ color: 'var(--text3)' }}>{new Date(a.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          {analysis && (
            <>
              <button
                id="btn-run-new"
                onClick={() => router.push('/analyze')}
                className="gh-btn gh-btn-secondary text-xs"
              >
                + New Analysis
              </button>
              <button
                id="btn-download-all"
                onClick={handleDownloadAll}
                className="gh-btn gh-btn-primary text-xs"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Zm-1-5.47L8 11.81 4.25 8.53a.749.749 0 1 0-.996 1.12l4.25 3.76a.75.75 0 0 0 .996 0l4.25-3.76a.749.749 0 1 0-.996-1.12L8.75 9.56V1.75a.75.75 0 0 0-1.5 0v7.81l-1.5-1.03Z"/>
                </svg>
                Download All ({availableCount})
              </button>
            </>
          )}
        </div>
      </div>

      {!analysis ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
            <svg width="28" height="28" viewBox="0 0 16 16" fill="var(--text3)">
              <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Zm-1-5.47L8 11.81 4.25 8.53a.749.749 0 1 0-.996 1.12l4.25 3.76a.75.75 0 0 0 .996 0l4.25-3.76a.749.749 0 1 0-.996-1.12L8.75 9.56V1.75a.75.75 0 0 0-1.5 0v7.81l-1.5-1.03Z"/>
            </svg>
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>No reports yet</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
            Run an analysis first to generate reports
          </p>
          <button id="btn-reports-analyze" onClick={() => router.push('/analyze')} className="gh-btn gh-btn-primary">
            Analyze a Repository
          </button>
        </div>
      ) : (
        <>
          {/* Repo info banner */}
          <div className="flex items-center gap-3 p-3 rounded-md mb-5"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(63,185,80,0.12)', border: '1px solid var(--green-border)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--green)">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{analysis.repoName}</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>
                Analyzed {new Date(analysis.createdAt).toLocaleString()} · {availableCount}/{reports.length} reports available
              </div>
            </div>
            <button onClick={() => router.push(`/workspace?id=${analysis.id}`)}
              className="gh-btn gh-btn-secondary text-xs flex-shrink-0">
              Open Workspace
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard value={availableCount} label="Reports Generated" color="var(--green)" />
            <StatCard value={totalBullets} label="Resume Bullets" color="var(--blue)" />
            <StatCard value={totalEndpoints} label="API Endpoints" color="var(--purple)" />
            <StatCard value={`${results.security?.score ?? '—'}/100`} label="Security Score" color={results.security?.score >= 80 ? 'var(--green)' : results.security?.score >= 60 ? 'var(--yellow)' : 'var(--red)'} />
          </div>

          {/* Filter */}
          <div className="relative mb-3">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"
              className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text3)' }}>
              <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/>
            </svg>
            <input
              id="input-filter-reports"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter reports…"
              className="w-full pl-9 pr-4 py-2 rounded-md text-sm"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--green)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Report list */}
          <div className="space-y-2">
            {filteredReports.map((report, i) => (
              <ReportRow
                key={report.id}
                report={report}
                idx={i}
                repoName={analysis.repoName}
                onCopy={handleCopy}
                onDownload={handleDownload}
                copying={copying}
                downloading={downloading}
                previewId={previewId}
                onPreview={setPreviewId}
              />
            ))}
            {filteredReports.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: 'var(--text3)' }}>
                No reports match "{filter}"
              </div>
            )}
          </div>

          {/* Quick README preview if available */}
          {results?.readme?.professional && !filter && (
            <div className="mt-6 gh-card rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
                <span className="text-xs font-semibold" style={{ color: 'var(--text2)' }}>📝 README Preview</span>
                <button id="btn-preview-copy-readme"
                  onClick={() => handleCopy(reports.find(r => r.id === 'readme')!)}
                  className="gh-btn gh-btn-secondary text-xs py-1 px-2">
                  {copying === 'readme' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs leading-relaxed overflow-x-auto"
                style={{
                  color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  maxHeight: 400, overflowY: 'auto', background: '#010409',
                }}>
                {results.readme.professional.slice(0, 3000)}
                {results.readme.professional.length > 3000 ? '\n\n... (click README row to see full content)' : ''}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-4">
        <div className="h-10 animate-shimmer rounded-md" />
        <div className="h-64 animate-shimmer rounded-md" />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  )
}
