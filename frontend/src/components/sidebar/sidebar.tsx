'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useAppStore } from '@/lib/store'

const NAV_ITEMS = [
  {
    href: '/dashboard', label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 0h13A1.5 1.5 0 0 1 16 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0zm6 6H2v8h5.5V6zm7-4H8.5v3H14V2zM8.5 8v6H14V8H8.5zM2 2v2.5h5.5V2H2z"/>
      </svg>
    ),
  },
  {
    href: '/github', label: 'GitHub Repos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
      </svg>
    ),
  },
  {
    href: '/analyze', label: 'Analyze Repo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.5 1a4.501 4.501 0 0 1 .216 8.99l3.147 3.146a.5.5 0 0 1-.707.708l-3.147-3.147A4.5 4.5 0 1 1 11.5 1zm-7 6a.5.5 0 0 0 0 1H6v1.5a.5.5 0 0 0 1 0V8h1.5a.5.5 0 0 0 0-1H7V5.5a.5.5 0 0 0-1 0V7H4.5z"/>
      </svg>
    ),
  },
  {
    href: '/workspace', label: 'Workspace',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.75 0A1.75 1.75 0 0 0 0 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0 0 16 14.25V1.75A1.75 1.75 0 0 0 14.25 0H1.75ZM1.5 1.75a.25.25 0 0 1 .25-.25h12.5a.25.25 0 0 1 .25.25V14.25a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25V1.75Zm8.56 3a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm-3 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm-3 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm2 5.5a.75.75 0 0 0 0 1.5h4.25a.75.75 0 0 0 0-1.5H6.06Z"/>
      </svg>
    ),
  },
  {
    href: '/reports', label: 'Reports',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 1.75A.75.75 0 0 1 2.75 1h7.586a.75.75 0 0 1 .53.22l2.914 2.914a.75.75 0 0 1 .22.53V14.25a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1-.75-.75V1.75Zm1.5.75v11h9V5h-2.25A.75.75 0 0 1 9.5 4.25V2H3.5Zm7.5.56 1.19 1.19H11V3.31Zm-5.5 4.44a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h3.5a.75.75 0 0 0 0-1.5H6.25Z"/>
      </svg>
    ),
  },
  {
    href: '/insights', label: 'AI Insights',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z"/>
      </svg>
    ),
  },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppStore()
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const isGoogleUser = session?.provider === 'google'

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="gh-sidebar relative flex flex-col flex-shrink-0 overflow-hidden"
      style={{ minHeight: '100vh' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-16 z-20 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors"
        style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)' }}
      >
        {sidebarCollapsed ? '▶' : '◀'}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2.5 p-4" style={{ borderBottom: '1px solid var(--border)', minHeight: 57 }}>
        <div className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--green3), var(--green2))' }}>
          RM
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              className="whitespace-nowrap"
            >
              <div className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                Repo<span style={{ color: 'var(--green)' }}>Mind</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'JetBrains Mono, monospace' }}>
                v2.0.0
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* GitHub connect prompt (Google users only) */}
      <AnimatePresence>
        {!sidebarCollapsed && isGoogleUser && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-2 mt-3 rounded-md p-2.5 text-xs cursor-pointer"
            style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}
            onClick={() => router.push('/github')}
          >
            <div className="font-medium mb-0.5" style={{ color: 'var(--green2)' }}>
              🔗 Connect GitHub
            </div>
            <div style={{ color: 'var(--text2)' }}>Link GitHub for repo analysis</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto mt-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <button
              key={item.href}
              id={`nav-${item.href.replace('/', '')}`}
              onClick={() => router.push(item.href)}
              className={`gh-nav-item w-full text-left ${active ? 'active' : ''} ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-medium whitespace-nowrap flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!sidebarCollapsed && active && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)', flexShrink: 0 }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2" style={{ borderTop: '1px solid var(--border)' }}>
        {/* User avatar */}
        {!sidebarCollapsed && session && (
          <div className="flex items-center gap-2 p-2 rounded-md mb-1" style={{ background: 'var(--bg3)' }}>
            <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'var(--green3)', color: '#fff' }}>
              {session.user?.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={session.user.image} alt="" width={24} height={24} />
                : (session.user?.name?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{session.user?.name}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text3)' }}>
                {session.provider === 'github' ? '● GitHub' : '● Google'}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className={`gh-nav-item w-full text-left ${sidebarCollapsed ? 'justify-center' : ''}`}
          style={{ color: 'var(--red)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2.75C2 1.784 2.784 1 3.75 1h5.5a.75.75 0 0 1 0 1.5h-5.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h5.5a.75.75 0 0 1 0 1.5h-5.5A1.75 1.75 0 0 1 2 13.25V2.75Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .75.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.75l1.97-1.97H6.75a.75.75 0 0 1 0-1.5h5.69Z"/>
          </svg>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs font-medium whitespace-nowrap">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
