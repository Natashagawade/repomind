import axios from 'axios'
import { getSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 120000,
})

apiClient.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed'
    return Promise.reject(new Error(msg))
  }
)

// Analysis API
export const analyzeZip = (formData: FormData) =>
  apiClient.post('/api/analyze/zip', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => console.log('Upload progress:', e.loaded, '/', e.total),
  })

export const analyzeUrl = (repoUrl: string) =>
  apiClient.post('/api/analyze/url', { repoUrl })

export const getAnalysis = (id: string) =>
  apiClient.get(`/api/analyze/${id}`)

export const listAnalyses = () =>
  apiClient.get('/api/analyze')

// Reports API
export const getReports = (analysisId: string) =>
  apiClient.get(`/api/reports/${analysisId}`)

export const exportReport = (analysisId: string, type: string, format: string) =>
  apiClient.post('/api/reports/export', { analysisId, type, format })

// GitHub API
export const getGithubRepos = () =>
  apiClient.get('/api/github/repos')

export const getGithubInsights = () =>
  apiClient.get('/api/github/insights')

export const analyzeGithubRepo = (owner: string, repo: string) =>
  apiClient.post('/api/github/analyze', { owner, repo })

// Metrics API
export const getMetrics = (analysisId: string) =>
  apiClient.get(`/api/metrics/${analysisId}`)

export const getGlobalMetrics = () =>
  apiClient.get('/api/metrics')
