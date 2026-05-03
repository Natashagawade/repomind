'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api'

interface ResumeData {
  project_summary: string
  resume_bullets: string[]
  skills_detected: string[]
  repoName?: string
}

function SkeletonLoader() {
  return (
    <div className="space-y-3">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-12 animate-shimmer rounded-md" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  )
}

function EmptyPrompt({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📄</div>
      <p className="text-sm" style={{ color: 'var(--text3)' }}>{label}</p>
    </div>
  )
}

export function ResumeGenerator({ repoUrl }: { repoUrl: string }) {
  const [data, setData] = useState<ResumeData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!repoUrl) return
    setLoading(true)
    setError('')
    setData(null)
    apiClient.get(`/api/insights/resume-generator?repoUrl=${encodeURIComponent(repoUrl)}`)
      .then(r => setData(r.data))
      .catch(e => setError(e?.response?.data?.error || 'Failed to generate resume data'))
      .finally(() => setLoading(false))
  }, [repoUrl])

  function copyAll() {
    if (!data) return
    const text = data.resume_bullets.map(b => `• ${b}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!repoUrl) return <EmptyPrompt label="Enter a GitHub repository URL above to generate ATS-friendly resume bullets." />
  if (loading) return <SkeletonLoader />
  if (error) return (
    <div className="gh-card p-4 rounded-md" style={{ borderLeft: '3px solid var(--red)' }}>
      <p className="text-sm" style={{ color: 'var(--red)' }}>⚠ {error}</p>
    </div>
  )
  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Project Summary */}
      <div className="gh-card p-4 rounded-md"
        style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(59,130,246,0.08))', border: '1px solid rgba(124,58,237,0.2)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(124,58,237,0.8)' }}>
          Project Summary
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{data.project_summary}</p>
      </div>

      {/* Skills */}
      <div className="gh-card p-4 rounded-md">
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Skills Detected</div>
        <div className="flex flex-wrap gap-2">
          {data.skills_detected.map(skill => (
            <span key={skill} className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: 'var(--blue)' }}>
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Resume Bullets */}
      <div className="gh-card rounded-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg3)' }}>
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>ATS-Optimized Resume Bullets</span>
            <span className="ml-2 text-xs" style={{ color: 'var(--text3)' }}>({data.resume_bullets.length} bullets)</span>
          </div>
          <button
            id="btn-resume-copy-all"
            onClick={copyAll}
            className="gh-btn gh-btn-secondary text-xs py-1 px-3"
          >
            {copied ? '✓ Copied!' : 'Copy All'}
          </button>
        </div>
        <div className="p-4 space-y-2">
          {data.resume_bullets.map((bullet, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-3 p-3 rounded-md group cursor-pointer transition-all"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
              onClick={() => navigator.clipboard.writeText(bullet)}
              title="Click to copy"
            >
              <span className="font-bold flex-shrink-0 mt-0.5" style={{ color: 'var(--green)' }}>•</span>
              <span className="text-sm leading-relaxed flex-1" style={{ color: 'var(--text)' }}>{bullet}</span>
              <span className="text-xs opacity-0 group-hover:opacity-60 flex-shrink-0 mt-0.5 transition-opacity" style={{ color: 'var(--text3)' }}>
                copy
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text3)' }}>
        💡 Click any bullet to copy it individually. Use "Copy All" to copy all bullets at once.
      </p>
    </div>
  )
}
