'use client'
import { signIn, getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const TerminalLine = ({ text, delay = 0, color = 'var(--green)' }: { text: string; delay?: number; color?: string }) => (
  <motion.div
    initial={{ opacity: 0, x: -4 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.2 }}
    className="flex gap-2 text-xs font-mono leading-5"
  >
    <span style={{ color: 'var(--green)' }}>$</span>
    <span style={{ color }}>{text}</span>
  </motion.div>
)

export default function LoginPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    getSession().then(s => { if (s) router.replace('/dashboard') })
  }, [router])

  const handleSignIn = async (provider: 'github' | 'google') => {
    setLoading(provider)
    await signIn(provider, { callbackUrl: '/dashboard' })
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel — terminal */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-16 relative overflow-hidden"
        style={{ background: '#010409', borderRight: '1px solid var(--border)' }}>
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(63,185,80,0.1) 2px, rgba(63,185,80,0.1) 4px)' }} />

        <div className="relative z-10 max-w-md">
          {/* Repo badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-xs font-mono"
            style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green2)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse-green" style={{ background: 'var(--green)' }} />
            repomind/core — v2.0 · live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold mb-2 leading-tight"
            style={{ color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}
          >
            AI-powered<br />
            <span style={{ color: 'var(--green)' }}>Repository</span> Intelligence
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm mb-10 leading-relaxed"
            style={{ color: 'var(--text2)' }}
          >
            Connect your GitHub, select a repo, and get deep AI analysis — architecture, security, code quality, README generation, and more. In real time.
          </motion.p>

          {/* Terminal */}
          <div className="terminal">
            <div className="terminal-header">
              <div className="terminal-dot" style={{ background: '#ff5f57' }} />
              <div className="terminal-dot" style={{ background: '#febc2e' }} />
              <div className="terminal-dot" style={{ background: '#28c840' }} />
              <span className="ml-2 text-xs" style={{ color: 'var(--text3)' }}>repomind — analysis</span>
            </div>
            <div className="p-4 space-y-1" style={{ color: 'var(--text2)' }}>
              <TerminalLine text="repomind init --repo my-project" delay={0.4} />
              <TerminalLine text="↳ Cloning repository..." delay={0.6} color="var(--text4)" />
              <TerminalLine text="↳ Parsing 847 files, 92,450 lines" delay={0.9} color="var(--text4)" />
              <TerminalLine text="↳ Running AI analysis engine..." delay={1.2} color="var(--blue)" />
              <TerminalLine text="↳ Architecture mapped ✓" delay={1.5} color="var(--green2)" />
              <TerminalLine text="↳ Security scan complete ✓" delay={1.7} color="var(--green2)" />
              <TerminalLine text="↳ README generated ✓" delay={1.9} color="var(--green2)" />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.1 }}
                className="flex gap-2 text-xs font-mono"
              >
                <span style={{ color: 'var(--green)' }}>$</span>
                <span style={{ color: 'var(--text)' }}>Analysis complete in 24.3s</span>
                <span className="animate-blink" style={{ color: 'var(--green)' }}>▌</span>
              </motion.div>
            </div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.3 }}
            className="flex gap-6 mt-8"
          >
            {[
              { value: '50k+', label: 'Repos Analyzed' },
              { value: '2.1M', label: 'Files Processed' },
              { value: '<30s', label: 'Avg Analysis Time' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{s.value}</div>
                <div className="text-xs" style={{ color: 'var(--text3)' }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel — sign in */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-md flex items-center justify-center text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg, var(--green3), var(--green))' }}>
              RM
            </div>
            <div>
              <div className="font-bold text-lg" style={{ color: 'var(--text)' }}>RepoMind</div>
              <div className="text-xs" style={{ color: 'var(--text2)' }}>AI Repository Intelligence</div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Sign in</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text2)' }}>
            Connect with GitHub for full repo access, or sign in with Google and connect GitHub afterward.
          </p>

          {/* Buttons */}
          <div className="space-y-3 mb-6">
            {/* GitHub — primary */}
            <button
              id="btn-signin-github"
              onClick={() => handleSignIn('github')}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--green3)', color: '#fff', border: '1px solid rgba(240,246,252,0.1)' }}
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#2ea043') }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'var(--green3)') }}
            >
              {loading === 'github' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              )}
              {loading === 'github' ? 'Signing in…' : 'Continue with GitHub'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--border2)' }} />
              <span className="text-xs" style={{ color: 'var(--text3)' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border2)' }} />
            </div>

            {/* Google */}
            <button
              id="btn-signin-google"
              onClick={() => handleSignIn('google')}
              disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-md text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text)' }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget.style.background = 'var(--bg4)'); (e.currentTarget.style.borderColor = 'var(--border3)') }}}
              onMouseLeave={e => { (e.currentTarget.style.background = 'var(--bg3)'); (e.currentTarget.style.borderColor = 'var(--border2)') }}
            >
              {loading === 'google' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading === 'google' ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>

          {/* Info box */}
          <div className="rounded-md p-3 text-xs leading-relaxed" style={{ background: 'var(--blue-bg)', border: '1px solid rgba(88,166,255,0.3)', color: 'var(--blue)' }}>
            💡 After signing in with Google, you can connect your GitHub account to access your repositories.
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--text3)' }}>
            By signing in you agree to our Terms of Service. GitHub access is read-only.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
