import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'RepoMind — AI Repository Intelligence',
  description: 'Analyze any codebase and generate structured developer insights with AI.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg2)',
                color: 'var(--text)',
                border: '1px solid var(--border2)',
                borderRadius: '10px',
                fontSize: '13px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
