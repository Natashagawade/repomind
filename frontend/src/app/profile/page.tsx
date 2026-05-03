'use client'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import { Card, CardGrid } from '@/components/ui/card'
import { RadialScore } from '@/components/charts/radial-score'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useRouter } from 'next/navigation'

const BULLETS = [
  'Developed scalable REST APIs using Express.js and Node.js serving 10,000+ requests/day with 99.9% uptime',
  'Implemented secure JWT authentication workflow with refresh token rotation and httpOnly cookie storage',
  'Designed modular MVC architecture reducing code complexity by 40% and improving team onboarding time',
  'Built ML inference pipeline using FastAPI and scikit-learn processing 500+ predictions per minute',
  'Containerized full-stack application using Docker Compose reducing deployment time by 80%',
  'Integrated Stripe payment processing handling $50K+ in monthly transactions with full PCI compliance',
]

const SKILLS = [
  { label: 'JavaScript', color: 'bg-yellow-400/10 text-yellow-400' },
  { label: 'TypeScript', color: 'bg-indigo-400/10 text-indigo-400' },
  { label: 'React', color: 'bg-cyan-400/10 text-cyan-400' },
  { label: 'Node.js', color: 'bg-emerald-400/10 text-emerald-400' },
  { label: 'PostgreSQL', color: 'bg-violet-400/10 text-violet-400' },
  { label: 'Docker', color: 'bg-blue-400/10 text-blue-400' },
  { label: 'Python', color: 'bg-yellow-300/10 text-yellow-300' },
  { label: 'FastAPI', color: 'bg-teal-400/10 text-teal-400' },
  { label: 'Redis', color: 'bg-red-400/10 text-red-400' },
  { label: 'GraphQL', color: 'bg-pink-400/10 text-pink-400' },
]

export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const name = session?.user?.name || 'Developer'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h1 className="font-display font-bold text-2xl text-[var(--text)] tracking-tight mb-1">Developer Profile</h1>
        <p className="text-sm text-[var(--text2)]">Your skills, portfolio strength, and AI-powered insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Profile card */}
        <div className="lg:col-span-2">
          <Card delay={0.05}>
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-display font-bold text-xl text-white flex-shrink-0">
                {initials}
              </div>
              <div>
                <div className="font-display font-bold text-lg text-[var(--text)]">{name}</div>
                <div className="text-xs text-[var(--text2)]">Full-Stack Developer · Connected: GitHub @james-dev</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-5">
              {[
                { v: 12, label: 'Repos' },
                { v: 47, label: 'Analyses' },
                { v: 23, label: 'Exports' },
                { v: 82, label: 'Score' },
              ].map(s => (
                <div key={s.label} className="p-3 bg-[var(--bg3)] rounded-xl text-center">
                  <div className="font-display font-bold text-xl text-[var(--text)]">{s.v}</div>
                  <div className="text-[10px] text-[var(--text3)]">{s.label}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-3">Detected Skills</div>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => (
                  <span key={skill.label} className={`text-[11px] font-medium px-2.5 py-1 rounded-lg ${skill.color}`}>
                    {skill.label}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Score radial */}
        <Card color="violet" delay={0.1}>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 mb-2">Strength</div>
          <div className="font-display font-semibold text-sm text-[var(--text)] mb-4">Portfolio Score</div>
          <div className="flex justify-center mb-3">
            <RadialScore score={82} color="#a78bfa" size={120} />
          </div>
          <div className="text-xs text-[var(--text2)] text-center mb-4">Strong portfolio · Top 25% of developers</div>
          <ProgressBar label="GitHub Activity" value={91} color="#60a5fa" />
          <ProgressBar label="Documentation" value={60} color="#a78bfa" />
          <ProgressBar label="Test Coverage" value={18} color="#f87171" />
        </Card>
      </div>

      {/* Resume Bullets */}
      <Card color="emerald" delay={0.2}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-1">ATS-Ready</div>
            <div className="font-display font-semibold text-sm text-[var(--text)]">Resume Bullet Points</div>
          </div>
          <button
            onClick={() => router.push('/reports')}
            className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg hover:bg-emerald-500/20 transition-all"
          >
            Export All →
          </button>
        </div>
        <div className="space-y-2">
          {BULLETS.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className="flex gap-2.5 p-3 bg-[var(--bg3)] rounded-xl"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
              <p className="text-xs text-[var(--text2)] leading-relaxed">{b}</p>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Connected accounts */}
      <Card delay={0.35}>
        <div className="font-display font-semibold text-sm text-[var(--text)] mb-4">Connected Accounts</div>
        <div className="space-y-2">
          {[
            { icon: '🐙', name: 'GitHub', user: '@james-dev', status: 'Connected', color: 'text-emerald-400' },
            { icon: '🔵', name: 'Google', user: session?.user?.email || 'user@gmail.com', status: 'Connected', color: 'text-emerald-400' },
          ].map(acc => (
            <div key={acc.name} className="flex items-center gap-3 p-3 bg-[var(--bg3)] rounded-xl">
              <span className="text-xl">{acc.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--text)]">{acc.name}</div>
                <div className="text-[11px] text-[var(--text3)]">{acc.user}</div>
              </div>
              <span className={`text-xs font-medium ${acc.color}`}>{acc.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
