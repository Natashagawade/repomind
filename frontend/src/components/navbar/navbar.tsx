'use client'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/github',    label: 'GitHub Repos' },
  { href: '/analyze',   label: 'Analyze' },
  { href: '/workspace', label: 'Workspace' },
  { href: '/reports',   label: 'Reports' },
  { href: '/insights',  label: '✨ AI Insights' },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)

  return (
    <header className="gh-topbar sticky top-0 z-50 w-full" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="mx-auto max-w-screen-2xl px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 flex-shrink-0 group"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black text-white transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #238636, #3fb950)' }}
          >
            RM
          </div>
          <span className="font-bold text-sm hidden sm:block" style={{ color: 'var(--text)' }}>
            Repo<span style={{ color: 'var(--green)' }}>Mind</span>
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <button
                key={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => router.push(item.href)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: active ? 'var(--green-bg)' : 'transparent',
                  color: active ? 'var(--green)' : 'var(--text2)',
                  border: active ? '1px solid var(--green-border)' : '1px solid transparent',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--bg3)'
                    e.currentTarget.style.color = 'var(--text)'
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text2)'
                  }
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* New Analysis CTA */}
          <button
            id="nav-new-analysis"
            onClick={() => router.push('/analyze')}
            className="gh-btn gh-btn-primary text-xs py-1.5 px-3 hidden sm:flex"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/>
            </svg>
            New Analysis
          </button>

          {/* Avatar dropdown */}
          {session && (
            <div className="relative">
              <button
                id="nav-avatar"
                onClick={() => setAvatarOpen(o => !o)}
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--green3)', color: '#fff', border: '2px solid var(--border2)' }}
              >
                {session.user?.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={session.user.image} alt="" width={28} height={28} />
                  : (session.user?.name?.[0] || 'U').toUpperCase()}
              </button>

              {avatarOpen && (
                <div
                  className="absolute right-0 top-9 rounded-md shadow-xl py-1 z-50 min-w-[180px]"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{session.user?.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>
                      {(session as any).provider === 'github' ? '● GitHub' : '● Google'}
                    </div>
                  </div>
                  <button
                    onClick={() => { setAvatarOpen(false); router.push('/profile') }}
                    className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--bg4)]"
                    style={{ color: 'var(--text2)' }}
                  >
                    Profile Settings
                  </button>
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--bg4)]"
                    style={{ color: 'var(--red)' }}
                  >
                    Sign out
                  </button>
                </div>
              )}

              {/* Click outside overlay */}
              {avatarOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
              )}
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1 rounded-md"
            style={{ color: 'var(--text2)' }}
            onClick={() => setMenuOpen(o => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              {menuOpen
                ? <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/>
                : <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75ZM1.75 12h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5Z"/>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <nav className="flex flex-col p-2 gap-0.5">
            {NAV_ITEMS.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <button
                  key={item.href}
                  onClick={() => { router.push(item.href); setMenuOpen(false) }}
                  className="text-left px-3 py-2 rounded-md text-sm transition-colors"
                  style={{
                    background: active ? 'var(--green-bg)' : 'transparent',
                    color: active ? 'var(--green)' : 'var(--text2)',
                  }}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
