'use client'
import { useState, useCallback } from 'react'
import { analyzeUrl, analyzeZip } from '@/lib/api'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

export type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'

export function useAnalysis() {
  const [state, setState] = useState<AnalysisState>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { addAnalysis, updateStep } = useAppStore()

  const stepIds = ['extract', 'stack', 'architecture', 'security', 'docs', 'quality']

  const simulateSteps = async (analysisPromise: Promise<any>) => {
    // Animate steps while waiting for real result
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
    const stepDurations = [600, 800, 1200, 1000, 1500, 800]

    let stepIndex = 0
    const stepInterval = setInterval(async () => {
      if (stepIndex < stepIds.length) {
        if (stepIndex > 0) updateStep(stepIds[stepIndex - 1], { status: 'done' })
        updateStep(stepIds[stepIndex], { status: 'running' })
        setProgress(Math.round(((stepIndex + 0.5) / stepIds.length) * 90))
        stepIndex++
      }
    }, 1500)

    try {
      const response = await analysisPromise
      clearInterval(stepInterval)
      stepIds.forEach(id => updateStep(id, { status: 'done' }))
      setProgress(100)
      return response.data
    } catch (err) {
      clearInterval(stepInterval)
      throw err
    }
  }

  const analyzeByUrl = useCallback(async (repoUrl: string) => {
    setState('analyzing')
    setError(null)
    setProgress(5)
    stepIds.forEach(id => updateStep(id, { status: 'pending' }))

    try {
      const data = await simulateSteps(analyzeUrl(repoUrl))
      setResult(data)
      setState('complete')
      toast.success('Analysis complete!')
      addAnalysis({
        id: data.analysisId,
        repoName: data.repoName,
        repoUrl,
        status: 'complete',
        createdAt: new Date().toISOString(),
        metadata: data.metadata,
        results: data.results,
      })
      return data
    } catch (err: any) {
      setState('error')
      setError(err.message)
      toast.error(err.message)
    }
  }, [])

  const analyzeByZip = useCallback(async (file: File) => {
    setState('uploading')
    setError(null)
    setProgress(2)

    const formData = new FormData()
    formData.append('file', file)

    try {
      setState('analyzing')
      const data = await simulateSteps(analyzeZip(formData))
      setResult(data)
      setState('complete')
      toast.success('Analysis complete!')
      addAnalysis({
        id: data.analysisId,
        repoName: data.repoName,
        status: 'complete',
        createdAt: new Date().toISOString(),
        metadata: data.metadata,
        results: data.results,
      })
      return data
    } catch (err: any) {
      setState('error')
      setError(err.message)
      toast.error(err.message)
    }
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setProgress(0)
    setResult(null)
    setError(null)
    stepIds.forEach(id => updateStep(id, { status: 'pending' }))
  }, [])

  return { state, progress, result, error, analyzeByUrl, analyzeByZip, reset }
}
