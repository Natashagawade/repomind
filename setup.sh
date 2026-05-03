#!/bin/bash
set -e

echo "🧠 RepoMind Quick Start"
echo "======================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js 18+ required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required (found v$NODE_VERSION)"
  exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check for .env files
if [ ! -f "frontend/.env.local" ]; then
  echo ""
  echo "⚠️  frontend/.env.local not found"
  echo "   Copy frontend/.env.local.example to frontend/.env.local and fill in your keys"
  echo "   Then re-run this script"
  cp frontend/.env.local.example frontend/.env.local 2>/dev/null || true
  echo "   ✅ Created frontend/.env.local from example (edit it now!)"
fi

if [ ! -f "backend/.env" ]; then
  echo ""
  echo "⚠️  backend/.env not found"
  cp backend/.env.example backend/.env 2>/dev/null || true
  echo "   ✅ Created backend/.env from example (edit it now!)"
fi

echo ""
echo "📦 Installing dependencies..."
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

echo ""
echo "🗄️  Setting up database..."
cd backend
npx prisma generate
echo "   Run 'npx prisma migrate dev --name init' after configuring DATABASE_URL"
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start development:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "   Or run both: npm run dev (from root, requires concurrently)"
echo ""
echo "📖 Visit http://localhost:3000"
echo ""
echo "🐳 For Docker (with PostgreSQL):"
echo "   docker-compose up -d"
