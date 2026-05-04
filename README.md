# RepoMind 🧠

> AI-powered repository intelligence platform — analyze any codebase and generate structured developer insights instantly.

![RepoMind Banner](https://img.shields.io/badge/RepoMind-AI%20SaaS-6366f1?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?style=flat-square)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat-square)

---

## Features

- 📦 **Repository Analysis** — Upload ZIP or paste GitHub URL
- 🐙 **GitHub OAuth** — Connect and browse your repositories
- 🏗 **Architecture Explainer** — Understand codebase structure instantly
- 📝 **README Generator** — 4 modes: Minimal, Professional, OSS, Recruiter
- 📋 **Resume Bullet Generator** — ATS-ready achievement bullets
- 🔐 **Security Scanner** — Detect hardcoded keys, open CORS, CVEs
- 🔌 **API Documentation** — Auto-detect and document all routes
- 🚀 **Deployment Guide** — Vercel, Docker, AWS, Render
- 💬 **Interview Questions** — Repo-specific technical questions
- 📊 **Metrics Dashboard** — Language breakdown, LOC, complexity
- 👤 **GitHub Profile Intelligence** — Portfolio strength scoring

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Framer Motion |
| Backend | Node.js, Express.js, REST API |
| Database | PostgreSQL, Prisma ORM |
| Auth | NextAuth.js, GitHub OAuth, Google OAuth, JWT |
| AI | Anthropic Claude API |
| File Handling | Multer, unzipper, tmp |
| Deployment | Vercel (FE), Railway/Render (BE) |

---

## Project Structure

```
repomind/
├── frontend/          # Next.js 14 App Router
│   ├── src/
│   │   ├── app/       # Pages & API routes
│   │   ├── components/# UI components
│   │   ├── lib/       # Utilities & API client
│   │   ├── hooks/     # Custom React hooks
│   │   └── types/     # TypeScript types
│   └── ...
├── backend/           # Express.js REST API
│   ├── src/
│   │   ├── routes/    # API route handlers
│   │   ├── services/  # Business logic engines
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── utils/
│   ├── prisma/        # Database schema
│   └── ...
└── README.md
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Anthropic API key
- GitHub OAuth App
- Google OAuth credentials

### 1. Clone & Install

```bash
git clone https://github.com/yourname/repomind.git
cd repomind

# Install frontend
cd frontend && npm install

# Install backend
cd ../backend && npm install
```

### 2. Environment Setup

**Frontend** (`frontend/.env.local`):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GITHUB_ID=your-github-oauth-id
GITHUB_SECRET=your-github-oauth-secret
GOOGLE_ID=your-google-oauth-id
GOOGLE_SECRET=your-google-oauth-secret
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/repomind
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-jwt-secret
GITHUB_TOKEN=optional-github-token
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Visit `http://localhost:3000`

---

## OAuth Setup

### GitHub OAuth App
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth App:
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID & Secret to `.env.local`

### Google OAuth
1. Go to Google Cloud Console → APIs → Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Authorized redirect: `http://localhost:3000/api/auth/callback/google`
4. Copy credentials to `.env.local`

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
```
Set all env vars in Vercel dashboard.

### Backend → Railway
```bash
# Push to GitHub, connect repo in Railway
# Set env vars in Railway dashboard
# Railway auto-detects Node.js
```

### Backend → Render
- Create new Web Service
- Build command: `npm install && npm run build`
- Start command: `npm start`

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze/zip` | Upload & analyze ZIP |
| POST | `/api/analyze/url` | Analyze GitHub URL |
| GET | `/api/analyze/:id` | Get analysis result |
| GET | `/api/reports/:id` | Get generated reports |
| POST | `/api/reports/export` | Export report |
| GET | `/api/github/repos` | List user repos |
| GET | `/api/github/insights` | Profile intelligence |
| GET | `/api/metrics/:id` | Repository metrics |
