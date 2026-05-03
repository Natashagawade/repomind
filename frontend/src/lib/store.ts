import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Analysis {
  id: string
  repoName: string
  repoUrl?: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  createdAt: string
  completedAt?: string
  metadata?: any
  results?: any
}

export interface AnalysisStep {
  id: string
  label: string
  description: string
  status: 'pending' | 'running' | 'done' | 'error'
  message?: string
  data?: any
}

interface AppState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Current analysis (most recently viewed/completed)
  currentAnalysis: Analysis | null
  setCurrentAnalysis: (a: Analysis | null) => void

  // Analysis history (persisted, capped at 20)
  analyses: Analysis[]
  addAnalysis: (a: Analysis) => void
  updateAnalysis: (id: string, updates: Partial<Analysis>) => void
  removeAnalysis: (id: string) => void

  // Analysis steps for the live progress UI
  analysisSteps: AnalysisStep[]
  setAnalysisSteps: (steps: AnalysisStep[]) => void
  updateStep: (id: string, updates: Partial<AnalysisStep>) => void

  // Active page (for sidebar highlight)
  activePage: string
  setActivePage: (page: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      currentAnalysis: null,
      setCurrentAnalysis: (a) => set({ currentAnalysis: a }),

      analyses: [],
      addAnalysis: (a) =>
        set((s) => ({
          // Deduplicate by id, cap at 20, newest first
          analyses: [a, ...s.analyses.filter(x => x.id !== a.id)].slice(0, 20),
          currentAnalysis: a,
        })),
      updateAnalysis: (id, updates) =>
        set((s) => ({
          analyses: s.analyses.map((a) => (a.id === id ? { ...a, ...updates } : a)),
          currentAnalysis:
            s.currentAnalysis?.id === id
              ? { ...s.currentAnalysis, ...updates }
              : s.currentAnalysis,
        })),
      removeAnalysis: (id) =>
        set((s) => ({
          analyses: s.analyses.filter(a => a.id !== id),
          currentAnalysis: s.currentAnalysis?.id === id ? null : s.currentAnalysis,
        })),

      analysisSteps: [],
      setAnalysisSteps: (steps) => set({ analysisSteps: steps }),
      updateStep: (id, updates) =>
        set((s) => ({
          analysisSteps: s.analysisSteps.map((step) =>
            step.id === id ? { ...step, ...updates } : step
          ),
        })),

      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),
    }),
    {
      name: 'repomind-store-v2',
      // Persist sidebar state + full analysis history (with results for offline access)
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        currentAnalysis: s.currentAnalysis,
        analyses: s.analyses.map(a => ({
          id: a.id,
          repoName: a.repoName,
          repoUrl: a.repoUrl,
          status: a.status,
          createdAt: a.createdAt,
          completedAt: a.completedAt,
          metadata: a.metadata,
          // Persist results too (truncated to keep storage small)
          results: a.results ? {
            architecture: a.results.architecture,
            security: a.results.security,
            codeQuality: a.results.codeQuality,
            resumeBullets: a.results.resumeBullets,
            apiDocs: a.results.apiDocs,
            readme: a.results.readme,
            improvements: a.results.improvements,
            deploymentGuide: a.results.deploymentGuide,
            interviewQuestions: a.results.interviewQuestions,
            metrics: a.results.metrics,
          } : undefined,
        })),
      }),
    }
  )
)
