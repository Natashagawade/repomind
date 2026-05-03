import fs from 'fs'
import path from 'path'
import unzipper from 'unzipper'
import { promisify } from 'util'
import { logger } from '../utils/logger'

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '__pycache__',
  '.pytest_cache', 'venv', '.venv', 'env', '.env', 'vendor',
  'coverage', '.coverage', 'target', 'out', '.cache',
])

const IGNORE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.webp',
  '.mp4', '.mp3', '.wav', '.zip', '.tar', '.gz', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.lock', '.sum',
])

const LANG_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript', '.mjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++', '.cc': 'C++', '.cxx': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.html': 'HTML',
  '.css': 'CSS', '.scss': 'CSS', '.sass': 'CSS',
  '.sql': 'SQL',
  '.sh': 'Shell', '.bash': 'Shell',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.dockerfile': 'Docker',
}

const FRAMEWORK_INDICATORS: Record<string, string[]> = {
  'React': ['react', 'react-dom'],
  'Next.js': ['next'],
  'Vue.js': ['vue'],
  'Angular': ['@angular/core'],
  'Express': ['express'],
  'FastAPI': ['fastapi'],
  'Django': ['django'],
  'Flask': ['flask'],
  'NestJS': ['@nestjs/core'],
  'Prisma': ['@prisma/client', 'prisma'],
  'TypeORM': ['typeorm'],
  'Sequelize': ['sequelize'],
  'Redux': ['redux', '@reduxjs/toolkit'],
  'TailwindCSS': ['tailwindcss'],
  'Docker': ['dockerfile'],
}

export interface FileTree {
  name: string
  type: 'file' | 'dir'
  path: string
  depth: number
  children?: FileTree[]
  lines?: number
  language?: string
}

export interface ParsedRepo {
  files: ParsedFile[]
  fileTree: FileTree[]
  languages: Record<string, number>
  frameworks: string[]
  dependencies: string[]
  totalLines: number
  fileCount: number
  maxDepth: number
  hasDockerfile: boolean
  hasTests: boolean
  hasReadme: boolean
  packageJson?: any
  requirementsTxt?: string
}

export interface ParsedFile {
  path: string
  name: string
  extension: string
  language: string
  lines: number
  content: string
  size: number
}

export class ParserService {
  async extractZip(zipPath: string, targetDir: string): Promise<void> {
    await fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: targetDir }))
      .promise()
    logger.info(`Extracted ZIP to ${targetDir}`)
  }

  async parseDirectory(dirPath: string): Promise<ParsedRepo> {
    const files: ParsedFile[] = []
    const languages: Record<string, number> = {}
    let totalLines = 0
    let maxDepth = 0
    let hasDockerfile = false
    let hasTests = false
    let hasReadme = false
    let packageJson: any = null
    let requirementsTxt: string | undefined

    const walkDir = (currentPath: string, depth: number) => {
      if (depth > maxDepth) maxDepth = depth
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name)) continue

        const fullPath = path.join(currentPath, entry.name)
        const relativePath = path.relative(dirPath, fullPath)

        if (entry.isDirectory()) {
          if (entry.name.toLowerCase().includes('test') || entry.name.toLowerCase().includes('spec')) {
            hasTests = true
          }
          walkDir(fullPath, depth + 1)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (IGNORE_EXTENSIONS.has(ext)) continue

          const nameLower = entry.name.toLowerCase()
          if (nameLower === 'dockerfile') hasDockerfile = true
          if (nameLower === 'readme.md' || nameLower === 'readme') hasReadme = true
          if (nameLower.includes('test') || nameLower.includes('spec')) hasTests = true

          try {
            const stat = fs.statSync(fullPath)
            if (stat.size > 1024 * 1024) continue // Skip files > 1MB

            const content = fs.readFileSync(fullPath, 'utf-8')
            const lines = content.split('\n').length
            const language = LANG_MAP[ext] || 'Other'

            totalLines += lines
            languages[language] = (languages[language] || 0) + lines

            if (nameLower === 'package.json') {
              try { packageJson = JSON.parse(content) } catch {}
            }
            if (nameLower === 'requirements.txt') {
              requirementsTxt = content
            }

            files.push({
              path: relativePath,
              name: entry.name,
              extension: ext,
              language,
              lines,
              content: content.slice(0, 8000), // Limit content size
              size: stat.size,
            })
          } catch {
            // Skip unreadable files
          }
        }
      }
    }

    walkDir(dirPath, 0)

    const dependencies = this.extractDependencies(packageJson, requirementsTxt)
    const frameworks = this.detectFrameworks(dependencies, files)
    const fileTree = this.buildFileTree(dirPath, dirPath, 0)

    return {
      files,
      fileTree,
      languages,
      frameworks,
      dependencies,
      totalLines,
      fileCount: files.length,
      maxDepth,
      hasDockerfile,
      hasTests,
      hasReadme,
      packageJson,
      requirementsTxt,
    }
  }

  private extractDependencies(packageJson: any, requirementsTxt?: string): string[] {
    const deps: string[] = []

    if (packageJson) {
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      }
      deps.push(...Object.keys(allDeps))
    }

    if (requirementsTxt) {
      const pyDeps = requirementsTxt
        .split('\n')
        .map(l => l.split('==')[0].split('>=')[0].trim())
        .filter(l => l && !l.startsWith('#'))
      deps.push(...pyDeps)
    }

    return deps
  }

  private detectFrameworks(deps: string[], files: ParsedFile[]): string[] {
    const detected: string[] = []
    const depSet = new Set(deps.map(d => d.toLowerCase()))
    const fileNames = new Set(files.map(f => f.name.toLowerCase()))

    for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
      for (const indicator of indicators) {
        if (indicator === 'dockerfile' && fileNames.has('dockerfile')) {
          if (!detected.includes(framework)) detected.push(framework)
          break
        }
        if (depSet.has(indicator.toLowerCase())) {
          if (!detected.includes(framework)) detected.push(framework)
          break
        }
      }
    }

    return detected
  }

  private buildFileTree(basePath: string, currentPath: string, depth: number): FileTree[] {
    if (depth > 4) return [] // Limit tree depth for display

    const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    const result: FileTree[] = []

    for (const entry of entries) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const fullPath = path.join(currentPath, entry.name)
      const relativePath = path.relative(basePath, fullPath)

      if (entry.isDirectory()) {
        result.push({
          name: entry.name,
          type: 'dir',
          path: relativePath,
          depth,
          children: this.buildFileTree(basePath, fullPath, depth + 1),
        })
      } else {
        const ext = path.extname(entry.name).toLowerCase()
        result.push({
          name: entry.name,
          type: 'file',
          path: relativePath,
          depth,
          language: LANG_MAP[ext],
        })
      }
    }

    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  cleanupDir(dirPath: string): void {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true })
      logger.info(`Cleaned up temp dir: ${dirPath}`)
    } catch (err) {
      logger.warn(`Failed to cleanup ${dirPath}:`, err)
    }
  }
}

export const parserService = new ParserService()
