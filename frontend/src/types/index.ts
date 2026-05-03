export interface Analysis {
  id: string
  repoName: string
  repoUrl?: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  createdAt: string
  completedAt?: string
  metadata: RepoMetadata
  results?: AnalysisResults
}

export interface RepoMetadata {
  fileCount: number
  totalLines: number
  languages: LanguageBreakdown[]
  frameworks: string[]
  dependencies: string[]
  folderDepth: number
  apiRouteCount: number
  hasDockerfile: boolean
  hasTests: boolean
  hasReadme: boolean
}

export interface LanguageBreakdown {
  language: string
  percentage: number
  lines: number
  color: string
}

export interface AnalysisResults {
  architecture: ArchitectureExplanation
  techStack: TechStack
  readme: ReadmeOutput
  resumeBullets: string[]
  apiDocs: ApiEndpoint[]
  security: SecurityReport
  codeQuality: CodeQualityReport
  improvements: Improvement[]
  deploymentGuide: DeploymentGuide
  interviewQuestions: InterviewQuestion[]
  metrics: MetricsData
}

export interface ArchitectureExplanation {
  summary: string
  folderStructure: string
  componentRelationships: string
  backendFrontendSeparation: string
  authFlowDetection: string
  databaseSummary: string
}

export interface TechStack {
  languages: string[]
  frameworks: string[]
  databases: string[]
  libraries: string[]
  deploymentConfigs: string[]
}

export interface ReadmeOutput {
  minimal: string
  professional: string
  opensource: string
  recruiter: string
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  params?: string[]
  requestBody?: string
  response?: string
  example?: string
}

export interface SecurityIssue {
  severity: 'high' | 'medium' | 'low'
  type: string
  description: string
  file?: string
  line?: number
  recommendation: string
}

export interface SecurityReport {
  issues: SecurityIssue[]
  score: number
  summary: string
}

export interface CodeQualityReport {
  maintainabilityScore: number
  readabilityScore: number
  modularityScore: number
  issues: string[]
  largeFiles: string[]
  duplicateLogic: string[]
}

export interface Improvement {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: string
}

export interface DeploymentStep {
  platform: 'vercel' | 'docker' | 'aws' | 'render'
  steps: string[]
  envVars: string[]
  commands: string[]
}

export interface DeploymentGuide {
  platforms: DeploymentStep[]
}

export interface InterviewQuestion {
  category: 'architecture' | 'security' | 'database' | 'scaling' | 'general'
  question: string
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface MetricsData {
  languageBreakdown: LanguageBreakdown[]
  linesOfCode: number
  dependencyCount: number
  apiRouteCount: number
  folderComplexity: number
  fileCount: number
}

export interface GithubRepo {
  id: number
  name: string
  fullName: string
  description?: string
  language?: string
  stars: number
  forks: number
  updatedAt: string
  isPrivate: boolean
  url: string
  topics: string[]
}

export interface GithubInsights {
  profileStrengthScore: number
  portfolioReadinessScore: number
  topLanguages: { language: string; percentage: number }[]
  topProjects: GithubRepo[]
  commitActivity: { day: string; count: number }[]
  skillProfile: string[]
  suggestions: string[]
  missingProjects: string[]
}

export interface AnalysisStep {
  id: string
  label: string
  description: string
  status: 'pending' | 'running' | 'done' | 'error'
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    provider?: string
  }
}
