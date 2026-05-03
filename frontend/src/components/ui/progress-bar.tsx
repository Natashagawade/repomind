'use client'
interface ProgressBarProps {
  label: string
  value: number
  max?: number
  color?: string
  showValue?: boolean
  suffix?: string
}

export function ProgressBar({ label, value, max = 100, color = 'var(--indigo)', showValue = true, suffix = '%' }: ProgressBarProps) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="mb-2.5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[var(--text2)]">{label}</span>
        {showValue && (
          <span className="text-xs font-medium text-[var(--text)]">
            {suffix === '%' ? `${pct}%` : `${value}${suffix}`}
          </span>
        )}
      </div>
      <div className="h-1 bg-[var(--bg4)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
