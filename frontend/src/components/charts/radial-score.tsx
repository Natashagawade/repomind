'use client'
import { useEffect, useRef } from 'react'

interface RadialScoreProps {
  score: number
  color?: string
  size?: number
  label?: string
}

export function RadialScore({ score, color = '#6366f1', size = 120, label }: RadialScoreProps) {
  const radius = (size / 2) - 8
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={`${color}22`} strokeWidth="8"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
          fill="var(--text)" fontFamily="Syne,sans-serif" fontWeight="800"
          fontSize={size > 100 ? 22 : 18}>
          {score}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
          fill="var(--text3)" fontSize="10">
          /100
        </text>
      </svg>
      {label && <div className="text-[11px] text-[var(--text2)] mt-1">{label}</div>}
    </div>
  )
}
