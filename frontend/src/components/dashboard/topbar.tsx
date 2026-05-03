'use client'
import { Session } from 'next-auth'
import { useRouter, usePathname } from 'next/navigation'

const PAGE_NAMES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/analyze': 'Analyze Repository',
  '/workspace': 'Workspace',
  '/github': 'GitHub Repositories',
  '/metrics': 'Metrics',
  '/reports': 'Reports',
  '/profile': 'Profile',
}

export function Topbar({ session }: { session: Session }) {
  const pathname = usePathname()
  const router = useRouter()
  const pageName = PAGE_NAMES[pathname] || 'RepoMind'

  return (
    <header className="gh-topbar flex items-center justify-between px-5 py-2.5 sticky top-0 z-10" style={{ minHeight: 57 }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <button
          onClick={() => router.push('/dashboard')}
          className="font-semibold hover:underline transition-colors"
          style={{ color: 'var(--text2)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text2)')}
        >
          RepoMind
        </button>
        <span style={{ color: 'var(--text3)' }}>/</span>
        <span className="font-medium" style={{ color: 'var(--text)' }}>{pageName}</span>
      </nav>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* GitHub Repos shortcut */}
        <button
          id="btn-topbar-github"
          onClick={() => router.push('/github')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)' }}
          onMouseEnter={e => { (e.currentTarget.style.background = 'var(--bg4)'); (e.currentTarget.style.borderColor = 'var(--border3)'); (e.currentTarget.style.color = 'var(--text)') }}
          onMouseLeave={e => { (e.currentTarget.style.background = 'var(--bg3)'); (e.currentTarget.style.borderColor = 'var(--border2)'); (e.currentTarget.style.color = 'var(--text2)') }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Repos
        </button>

        {/* New Analysis */}
        <button
          id="btn-topbar-analyze"
          onClick={() => router.push('/analyze')}
          className="gh-btn gh-btn-primary text-xs py-1.5 px-3"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"/>
          </svg>
          New Analysis
        </button>

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold cursor-pointer flex-shrink-0"
          style={{ background: 'var(--green3)', color: '#fff', border: '2px solid var(--border2)' }}
          onClick={() => router.push('/profile')}
          title={session.user?.name || 'Profile'}
        >
          {session.user?.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={session.user.image} alt="" width={28} height={28} />
            : (session.user?.name?.[0] || 'U').toUpperCase()}
        </div>
      </div>
    </header>
  )
}
