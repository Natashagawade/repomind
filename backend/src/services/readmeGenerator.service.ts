/**
 * readmeGenerator.service.ts
 * AI-assisted README generator using repo analysis.
 * Falls back to structured heuristic template.
 */
import axios from 'axios'
import {
  fetchRepoMeta, fetchReadme, fetchLanguages,
  fetchContents, fetchTags, fetchContributors,
} from './repoAnalyzer.service'
import { logger } from '../utils/logger'

// ─── OpenAI optional client ───────────────────────────────────────────────────
let openaiClient: any = null
try {
  const OpenAI = require('openai')
  const key = process.env.OPENAI_API_KEY
  if (key && key !== 'your-openai-api-key-here') {
    openaiClient = new OpenAI.default({ apiKey: key })
  }
} catch { /* ignore */ }

async function askAI(system: string, user: string, maxTokens = 2000): Promise<string | null> {
  if (!openaiClient) return null
  try {
    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: maxTokens,
      temperature: 0.4,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    })
    return res.choices[0]?.message?.content || null
  } catch (e: any) {
    logger.warn('AI call failed in readmeGenerator:', e?.message)
    return null
  }
}

// ─── Detect frameworks from package.json ──────────────────────────────────────
async function detectFrameworksFromContents(
  contents: any[], owner: string, repo: string
): Promise<string[]> {
  const frameworks: string[] = []
  try {
    const hasPkg = contents.some((f: any) => f.name === 'package.json')
    if (!hasPkg) return frameworks
    const pkgRaw = await axios.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/package.json`,
      { timeout: 8000 }
    ).then(r => r.data).catch(() => null)
    if (!pkgRaw) return frameworks
    const deps = Object.keys({ ...(pkgRaw.dependencies || {}), ...(pkgRaw.devDependencies || {}) })
    const map: [string, string][] = [
      ['next', 'Next.js'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'],
      ['@angular/core', 'Angular'], ['express', 'Express'], ['fastify', 'Fastify'],
      ['@nestjs/core', 'NestJS'], ['hono', 'Hono'], ['prisma', 'Prisma'],
      ['typeorm', 'TypeORM'], ['mongoose', 'Mongoose'], ['drizzle-orm', 'Drizzle'],
      ['tailwindcss', 'Tailwind CSS'], ['vite', 'Vite'], ['turbo', 'Turborepo'],
    ]
    for (const [pkg, name] of map) {
      if (deps.some(d => d === pkg || d.startsWith(pkg + '/'))) frameworks.push(name)
    }
  } catch { /* ignore */ }
  return [...new Set(frameworks)]
}

// ─── Build folder structure string ───────────────────────────────────────────
function buildFolderStructure(contents: any[]): string {
  const dirs = contents.filter((f: any) => f.type === 'dir').map((f: any) => f.name)
  const files = contents.filter((f: any) => f.type === 'file').map((f: any) => f.name)
  const lines = [
    `├── ${files.slice(0, 6).join('\n├── ')}`,
    ...dirs.slice(0, 8).map(d => `├── ${d}/`),
    `└── ...`,
  ]
  return lines.join('\n')
}

// ─── Heuristic README template ────────────────────────────────────────────────
function buildHeuristicReadme(
  meta: any,
  languages: Record<string, number>,
  contents: any[],
  frameworks: string[],
  releases: any[],
  contributors: any[]
): string {
  const name = meta.name || 'Project'
  const desc = meta.description || 'A modern software project.'
  const langs = Object.keys(languages).slice(0, 5)
  const primaryLang = langs[0] || 'JavaScript'
  const hasDocker = contents.some((f: any) => f.name === 'Dockerfile')
  const hasEnvExample = contents.some((f: any) => f.name === '.env.example' || f.name === '.env.sample')
  const hasTests = contents.some((f: any) => ['test', 'tests', '__tests__', 'spec'].includes(f.name))
  const latestRelease = releases[0]?.tag_name || null
  const license = meta.license?.name || null
  const folderStr = buildFolderStructure(contents)

  const isNode = langs.includes('TypeScript') || langs.includes('JavaScript')
  const isPy = langs.includes('Python')

  const installCmd = isNode ? 'npm install' : isPy ? 'pip install -r requirements.txt' : 'make install'
  const devCmd = isNode
    ? (frameworks.includes('Next.js') ? 'npm run dev' : frameworks.includes('Vite') ? 'npm run dev' : 'npm start')
    : isPy ? 'python main.py' : './start.sh'

  const badgeLang = primaryLang.replace('#', 'Sharp').replace('+', 'plus')
  const badgeColor = primaryLang === 'TypeScript' ? '3178c6' : primaryLang === 'Python' ? '3572A5' : 'green'

  const techBadges = [
    `![Language](https://img.shields.io/badge/${encodeURIComponent(primaryLang)}-${badgeColor}?style=flat-square)`,
    frameworks[0] ? `![Framework](https://img.shields.io/badge/${encodeURIComponent(frameworks[0])}-764ABC?style=flat-square)` : '',
    license ? `![License](https://img.shields.io/badge/license-${encodeURIComponent(license)}-blue?style=flat-square)` : '',
    latestRelease ? `![Release](https://img.shields.io/badge/release-${encodeURIComponent(latestRelease)}-green?style=flat-square)` : '',
    `![Stars](https://img.shields.io/github/stars/${meta.full_name}?style=flat-square)`,
  ].filter(Boolean).join(' ')

  const techTable = [
    '| Category | Technology |',
    '|---|---|',
    langs.map(l => `| Language | ${l} |`).join('\n'),
    frameworks.map(f => `| Framework | ${f} |`).join('\n'),
    hasDocker ? '| Deployment | Docker |' : '',
    hasTests ? '| Testing | Automated Tests |' : '',
  ].filter(Boolean).join('\n')

  const contribSection = contributors.slice(0, 5).map((c: any) =>
    `- [@${c.author?.login || 'contributor'}](https://github.com/${c.author?.login})`
  ).join('\n') || '- See [contributors](../../graphs/contributors)'

  return `# ${name}

> ${desc}

${techBadges}

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

${desc}

${meta.homepage ? `**Live Demo:** [${meta.homepage}](${meta.homepage})` : ''}
${meta.stargazers_count > 0 ? `**⭐ Stars:** ${meta.stargazers_count}  **🍴 Forks:** ${meta.forks_count}` : ''}

## 🛠️ Tech Stack

${techTable}

## 🏗️ Architecture

This project follows a ${
    frameworks.includes('Next.js') ? 'full-stack Next.js architecture with API routes and React components' :
    frameworks.some(f => ['Express', 'Fastify', 'NestJS'].includes(f)) && frameworks.some(f => ['React', 'Vue', 'Angular'].includes(f)) ?
      'monorepo structure with separate frontend and backend services' :
    frameworks.some(f => ['React', 'Vue', 'Angular'].includes(f)) ?
      'SPA (Single Page Application) architecture with a separate backend API' :
      `${primaryLang}-based service architecture`
  } pattern.

## 🚀 Getting Started

### Prerequisites

${isNode ? `- **Node.js** 18+ ([Download](https://nodejs.org/))\n- **npm** or **yarn**` :
  isPy ? `- **Python** 3.10+ ([Download](https://python.org/))\n- **pip**` :
  '- See documentation for required runtime'}
${hasDocker ? '- **Docker** (optional, for containerized setup)' : ''}

### Installation

\`\`\`bash
# 1. Clone the repository
git clone https://github.com/${meta.full_name}.git
cd ${name}

# 2. Install dependencies
${installCmd}
\`\`\`

${hasEnvExample ? `### Environment Setup

\`\`\`bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
\`\`\`

> ⚠️ **Important:** Fill in all required environment variables before running the application.` : ''}

### Running Locally

\`\`\`bash
${devCmd}
\`\`\`

${hasDocker ? `### Docker Setup

\`\`\`bash
# Build the Docker image
docker build -t ${name.toLowerCase()} .

# Run with Docker Compose (if available)
docker-compose up

# Or run the container directly
docker run -p 3000:3000 ${name.toLowerCase()}
\`\`\`` : ''}

${hasTests ? `## 🧪 Testing

\`\`\`bash
npm test
# or
npm run test:coverage
\`\`\`` : ''}

## 📁 Project Structure

\`\`\`
${name}/
${folderStr}
\`\`\`

## 📖 Usage

After starting the application:

1. Open your browser and navigate to \`http://localhost:3000\`
2. Follow the on-screen instructions
3. Refer to the [documentation](./docs) for advanced usage

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/your-feature-name\`
3. Commit your changes: \`git commit -m "feat: add your feature"\`
4. Push to the branch: \`git push origin feature/your-feature-name\`
5. Open a Pull Request

### Contributors

${contribSection}

## 📄 License

${license ? `This project is licensed under the **${license}** — see the [LICENSE](./LICENSE) file for details.` : 'Please check the repository for license information.'}

---

<p align="center">Made with ❤️ by the ${name} team | <a href="https://github.com/${meta.full_name}">GitHub</a></p>
`
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generateReadmeContent(
  owner: string,
  repo: string,
  token?: string
): Promise<{ markdown: string; generatedWith: 'ai' | 'heuristic' }> {
  const [meta, languages, contents, releases, contributors] = await Promise.all([
    fetchRepoMeta(owner, repo, token),
    fetchLanguages(owner, repo, token),
    fetchContents(owner, repo, '', token),
    fetchTags(owner, repo, token),
    fetchContributors(owner, repo, token),
  ])

  const frameworks = await detectFrameworksFromContents(contents, owner, repo)
  const existingReadme = await fetchReadme(owner, repo, token)

  // Try AI
  if (openaiClient) {
    const langStr = Object.entries(languages).map(([l, b]) => `${l}:${b}`).join(', ')
    const prompt = `Repository: ${meta.full_name}
Description: ${meta.description || 'N/A'}
Stars: ${meta.stargazers_count}, Forks: ${meta.forks_count}
License: ${meta.license?.name || 'none'}
Default Branch: ${meta.default_branch}
Languages: ${langStr}
Frameworks: ${frameworks.join(', ') || 'none detected'}
Releases: ${releases.length}
Contributors: ${contributors.length}
Top-level files/dirs: ${contents.map((f: any) => f.name).join(', ')}
Existing README snippet:\n${existingReadme.slice(0, 800)}

Generate a comprehensive, professional README.md. Include these sections:
1. Project title with badges
2. Description / Overview
3. Tech Stack (table format)
4. Architecture overview
5. Getting Started (prerequisites + installation + env setup)
6. Usage instructions
7. Project Structure
8. Contributing guide
9. License

Return ONLY the raw Markdown content, no explanation.`

    const aiResult = await askAI(
      'You are an expert technical writer. Generate a professional, well-structured README.md in GitHub Markdown format. Use emojis for section headers. Include code blocks, badges, and tables. Return ONLY the Markdown, no other text.',
      prompt,
      2000
    )

    if (aiResult && aiResult.length > 200) {
      return { markdown: aiResult, generatedWith: 'ai' }
    }
  }

  // Fallback heuristic
  const markdown = buildHeuristicReadme(meta, languages, contents, frameworks, releases, contributors)
  return { markdown, generatedWith: 'heuristic' }
}
