'use client'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api'

function SkeletonLoader() {
  return (
    <div className="space-y-3">
      <div className="h-10 animate-shimmer rounded-md w-2/3" />
      <div className="h-96 animate-shimmer rounded-md" />
    </div>
  )
}

// Simple Markdown renderer (no external dependency)
function MarkdownPreview({ markdown }: { markdown: string }) {
  const html = markdown
    .replace(/^### (.+)$/gm, '<h3 style="color:var(--text);font-size:1rem;font-weight:600;margin:1rem 0 0.4rem;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:var(--text);font-size:1.1rem;font-weight:700;margin:1.2rem 0 0.5rem;padding-bottom:0.3rem;border-bottom:1px solid var(--border);">$2</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:var(--text);font-size:1.4rem;font-weight:800;margin:0 0 0.5rem;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg4);padding:0.1rem 0.4rem;border-radius:4px;font-size:0.85em;color:var(--green2)">$1</code>')
    .replace(/```[\s\S]*?```/g, (m) => {
      const inner = m.replace(/^```\w*\n?/, '').replace(/```$/, '')
      return `<pre style="background:#010409;border:1px solid var(--border2);border-radius:6px;padding:1rem;overflow-x:auto;font-size:0.8rem;color:var(--green2);margin:0.8rem 0;white-space:pre-wrap;">${inner}</pre>`
    })
    .replace(/^\s*[-*] (.+)$/gm, '<li style="color:var(--text2);margin:0.2rem 0;padding-left:0.5rem;">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, m => `<ul style="list-style:disc;padding-left:1.2rem;margin:0.4rem 0;">${m}</ul>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--blue);text-decoration:underline;">$1</a>')
    .replace(/!\[.*?\]\(.*?\)/g, '') // strip image tags
    .replace(/^(---|\*\*\*|___)\s*$/gm, '<hr style="border:none;border-top:1px solid var(--border);margin:1rem 0;">')
    .replace(/\n\n/g, '</p><p style="color:var(--text2);font-size:0.875rem;line-height:1.6;margin:0.4rem 0;">')
    .replace(/\n/g, '<br>')

  return (
    <div
      style={{ color: 'var(--text2)', fontSize: '0.875rem', lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  )
}

export function ReadmeGenerator({ repoUrl }: { repoUrl: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<'rendered' | 'raw'>('rendered')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!repoUrl) return
    setLoading(true); setError(''); setData(null)
    apiClient.get(`/api/insights/readme-generator?repoUrl=${encodeURIComponent(repoUrl)}`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || 'Failed to generate README'))
      .finally(() => setLoading(false))
  }, [repoUrl])

  function handleCopy() {
    if (!data?.markdown) return
    navigator.clipboard.writeText(data.markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    if (!data?.markdown) return
    const blob = new Blob([data.markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'README.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!repoUrl) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📝</div>
      <p className="text-sm" style={{ color: 'var(--text3)' }}>Enter a GitHub repository URL above to auto-generate a professional README.</p>
    </div>
  )
  if (loading) return <SkeletonLoader />
  if (error) return <div className="gh-card p-4 rounded-md" style={{ borderLeft: '3px solid var(--red)' }}><p className="text-sm" style={{ color: 'var(--red)' }}>⚠ {error}</p></div>
  if (!data) return null

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="gh-card p-3 rounded-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>README.md</span>
          <span className="gh-badge" style={{
            background: data.generatedWith === 'ai' ? 'rgba(124,58,237,0.15)' : 'rgba(16,185,129,0.12)',
            color: data.generatedWith === 'ai' ? '#a78bfa' : 'var(--green2)',
            border: `1px solid ${data.generatedWith === 'ai' ? 'rgba(124,58,237,0.3)' : 'rgba(16,185,129,0.3)'}`,
          }}>
            {data.generatedWith === 'ai' ? '✨ AI Generated' : '⚙ Template Generated'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['rendered', 'raw'] as const).map(mode => (
              <button key={mode} onClick={() => setPreview(mode)}
                className="px-3 py-1 text-xs transition-all"
                style={{
                  background: preview === mode ? 'var(--bg4)' : 'transparent',
                  color: preview === mode ? 'var(--text)' : 'var(--text3)',
                }}>
                {mode === 'rendered' ? '👁 Preview' : '📄 Raw'}
              </button>
            ))}
          </div>
          <button id="btn-readme-copy" onClick={handleCopy} className="gh-btn gh-btn-secondary text-xs py-1 px-3">
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
          <button id="btn-readme-download" onClick={handleDownload} className="gh-btn gh-btn-primary text-xs py-1 px-3">
            ⬇ Download
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        key={preview}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="gh-card rounded-md overflow-hidden"
      >
        {preview === 'rendered' ? (
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 600 }}>
            <MarkdownPreview markdown={data.markdown} />
          </div>
        ) : (
          <pre className="p-4 text-xs leading-relaxed overflow-x-auto overflow-y-auto"
            style={{
              color: 'var(--text)',
              fontFamily: 'JetBrains Mono, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 600,
            }}>
            {data.markdown}
          </pre>
        )}
      </motion.div>

      <p className="text-xs text-center" style={{ color: 'var(--text3)' }}>
        💡 Click "Copy" to copy the Markdown, or "Download" to save as README.md
      </p>
    </div>
  )
}
