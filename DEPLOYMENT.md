# RepoMind Deployment Guide

## Local Development (Recommended First)

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Anthropic API key
- GitHub OAuth App
- Google OAuth credentials

### 2. Run setup script
```bash
chmod +x setup.sh
./setup.sh
```

### 3. Configure environment files

**frontend/.env.local**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
GITHUB_ID=<your-github-oauth-app-id>
GITHUB_SECRET=<your-github-oauth-app-secret>
GOOGLE_ID=<your-google-client-id>
GOOGLE_SECRET=<your-google-client-secret>
NEXT_PUBLIC_API_URL=http://localhost:4000
```

**backend/.env**
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/repomind
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=<run: openssl rand -base64 32>
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=development
```

### 4. Start PostgreSQL
```bash
# Using Docker (easiest):
docker run --name repomind-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=repomind -p 5432:5432 -d postgres:16

# Or use your local PostgreSQL
```

### 5. Run migrations
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Start servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

---

## Docker Compose (Full Stack)

```bash
# Set required env vars
export ANTHROPIC_API_KEY=sk-ant-...
export JWT_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export GITHUB_ID=your-id
export GITHUB_SECRET=your-secret
export GOOGLE_ID=your-id
export GOOGLE_SECRET=your-secret

# Start everything
docker-compose up -d

# Run migrations
docker-compose exec backend npx prisma migrate deploy

# View logs
docker-compose logs -f
```

---

## Production Deployment

### Frontend → Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set root directory to `frontend`
4. Add environment variables in Vercel dashboard:
   - All variables from `frontend/.env.local.example`
   - Set `NEXT_PUBLIC_API_URL` to your backend URL
5. Deploy

### Backend → Railway

1. Create new project in [Railway](https://railway.app)
2. Connect GitHub repo
3. Set root directory to `backend`
4. Add PostgreSQL service in Railway
5. Set environment variables:
   - `DATABASE_URL` (Railway provides this automatically)
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Vercel URL)
6. Deploy

### Backend → Render

1. Create new Web Service in [Render](https://render.com)
2. Connect GitHub repo, set root to `backend`
3. Build command: `npm install && npm run build && npx prisma migrate deploy`
4. Start command: `npm start`
5. Add PostgreSQL database in Render
6. Set all environment variables

---

## OAuth App Setup

### GitHub OAuth App
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. New OAuth App:
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/api/auth/callback/github`
3. Copy Client ID and Secret

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
5. Copy Client ID and Secret

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTAUTH_URL` | ✅ | Your app URL |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char secret |
| `GITHUB_ID` | ✅ | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | ✅ | GitHub OAuth App Secret |
| `GOOGLE_ID` | ✅ | Google OAuth Client ID |
| `GOOGLE_SECRET` | ✅ | Google OAuth Secret |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `GITHUB_TOKEN` | ⬜ | Optional: raises GitHub API rate limits |
| `PORT` | ⬜ | Backend port (default: 4000) |

---

## Troubleshooting

**"Cannot connect to database"**
- Ensure PostgreSQL is running
- Check `DATABASE_URL` format: `postgresql://user:pass@host:5432/dbname`

**"GitHub OAuth not working"**
- Check callback URL matches exactly (no trailing slash)
- Ensure `NEXTAUTH_URL` matches your actual domain

**"Anthropic API error"**
- Verify `ANTHROPIC_API_KEY` starts with `sk-ant-`
- Check your Anthropic account has API access

**"Rate limit exceeded"**  
- Add `GITHUB_TOKEN` to backend `.env` for higher GitHub API limits
