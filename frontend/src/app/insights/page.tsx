'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResumeGenerator } from '@/components/insights/ResumeGenerator'
import { ContributionInsights } from '@/components/insights/ContributionInsights'
import { RepoHealthScore } from '@/components/insights/RepoHealthScore'
import { ReadmeGenerator } from '@/components/insights/ReadmeGenerator'

const TABS = [
  { id: 'resume', label: '📄 Resume Generator', desc: 'ATS-friendly bullets from your repo' },
  { id: 'contributions', label: '📊 Contribution Insights', desc: 'Activity charts & contributor ranking' },
  { id: 'health', label: '🏥 Repo Health Score', desc: 'Quality evaluation with grade' },
  { id: 'readme', label: '📝 README Generator', desc: 'Auto-generate professional README' },
]

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState('resume')
  const [repoUrl, setRepoUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (inputUrl.trim()) setRepoUrl(inputUrl.trim())
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff' }}>
          ✨
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>AI Insights</h1>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            Intelligent repository analysis — resume bullets, health scores, contribution charts & README generation
          </p>
        </div>
      </div>

      {/* Repo URL Input */}
      <form onSubmit={handleAnalyze}
        className="gh-card p-4 rounded-md flex gap-3 items-end"
        style={{ border: '1px solid var(--border2)' }}>
        <div className="flex-1">
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text2)' }}>
            GitHub Repository URL
          </label>
          <input
            id="insights-repo-url"
            type="url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="w-full px-3 py-2 rounded-md text-sm font-mono outline-none transition-all"
            style={{
              background: 'var(--bg3)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--green)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
        <button
          id="btn-insights-analyze"
          type="submit"
          disabled={!inputUrl.trim()}
          className="gh-btn gh-btn-primary px-5 py-2"
          style={{ opacity: inputUrl.trim() ? 1 : 0.5 }}
        >
          Analyze ✨
        </button>
      </form>

      {/* Tab nav */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`insights-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeTab === tab.id
                ? 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(59,130,246,0.15))'
                : 'var(--bg3)',
              border: `1px solid ${activeTab === tab.id ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`,
              color: activeTab === tab.id ? 'var(--text)' : 'var(--text2)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab desc */}
      <p className="text-xs" style={{ color: 'var(--text3)' }}>
        {TABS.find(t => t.id === activeTab)?.desc}
      </p>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'resume' && <ResumeGenerator repoUrl={repoUrl} />}
          {activeTab === 'contributions' && <ContributionInsights repoUrl={repoUrl} />}
          {activeTab === 'health' && <RepoHealthScore repoUrl={repoUrl} />}
          {activeTab === 'readme' && <ReadmeGenerator repoUrl={repoUrl} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
