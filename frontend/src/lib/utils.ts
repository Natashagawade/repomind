import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function timeAgo(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diff = now.getTime() - then.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return then.toLocaleDateString()
}

export const MODULE_COLORS = {
  architecture: { label: 'indigo', hex: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  security: { label: 'red', hex: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  metrics: { label: 'blue', hex: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  resume: { label: 'emerald', hex: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  readme: { label: 'violet', hex: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  deployment: { label: 'orange', hex: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  api: { label: 'blue', hex: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  interview: { label: 'indigo', hex: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(data: object, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
