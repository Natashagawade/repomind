'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type ColorVariant = 'indigo' | 'red' | 'blue' | 'emerald' | 'violet' | 'orange' | 'default'

const glowMap: Record<ColorVariant, string> = {
  indigo: 'hover:border-indigo-500/30 hover:shadow-[0_0_32px_rgba(99,102,241,0.08)]',
  red: 'hover:border-red-400/30 hover:shadow-[0_0_32px_rgba(248,113,113,0.08)]',
  blue: 'hover:border-blue-400/30 hover:shadow-[0_0_32px_rgba(96,165,250,0.08)]',
  emerald: 'hover:border-emerald-400/30 hover:shadow-[0_0_32px_rgba(52,211,153,0.08)]',
  violet: 'hover:border-violet-400/30 hover:shadow-[0_0_32px_rgba(167,139,250,0.08)]',
  orange: 'hover:border-orange-400/30 hover:shadow-[0_0_32px_rgba(251,146,60,0.08)]',
  default: 'hover:border-white/10',
}

const accentBgMap: Record<ColorVariant, string> = {
  indigo: 'bg-indigo-500/15',
  red: 'bg-red-400/15',
  blue: 'bg-blue-400/15',
  emerald: 'bg-emerald-400/15',
  violet: 'bg-violet-400/15',
  orange: 'bg-orange-400/15',
  default: 'bg-white/10',
}

const labelColorMap: Record<ColorVariant, string> = {
  indigo: 'text-indigo-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  emerald: 'text-emerald-400',
  violet: 'text-violet-400',
  orange: 'text-orange-400',
  default: 'text-[var(--text3)]',
}

interface CardProps {
  children: React.ReactNode
  color?: ColorVariant
  label?: string
  title?: string
  icon?: string
  className?: string
  onClick?: () => void
  delay?: number
  noPadding?: boolean
}

export function Card({ children, color = 'default', label, title, icon, className, onClick, delay = 0, noPadding }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={onClick ? { y: -1 } : {}}
      onClick={onClick}
      className={cn(
        'bg-[var(--card)] border border-white/[0.06] rounded-2xl transition-all duration-200',
        glowMap[color],
        onClick && 'cursor-pointer',
        !noPadding && 'p-5',
        className
      )}
    >
      {(label || title || icon) && (
        <div className="mb-3">
          {label && (
            <div className={cn('text-[10px] font-semibold uppercase tracking-widest mb-2', labelColorMap[color])}>
              {label}
            </div>
          )}
          {icon && (
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-base mb-3', accentBgMap[color])}>
              {icon}
            </div>
          )}
          {title && (
            <div className="font-display font-semibold text-sm text-[var(--text)] tracking-tight">
              {title}
            </div>
          )}
        </div>
      )}
      {children}
    </motion.div>
  )
}

export function CardGrid({ children, cols = 3, className }: { children: React.ReactNode, cols?: number, className?: string }) {
  const colsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }
  return (
    <div className={cn('grid gap-3', colsMap[cols] || 'grid-cols-3', className)}>
      {children}
    </div>
  )
}
