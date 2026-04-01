import clsx from 'clsx'
import type { RiskLevel } from '@/lib/types'

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

const colorMap: Record<RiskLevel, string> = {
  critical: 'bg-red-500/20 text-red-400 ring-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  low:      'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
  unknown:  'bg-slate-500/20 text-slate-400 ring-slate-500/30',
}

const labelMap: Record<RiskLevel, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
  unknown:  'Unknown',
}

export default function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1',
        colorMap[level] ?? colorMap.unknown,
        className,
      )}
    >
      {labelMap[level] ?? level}
    </span>
  )
}
