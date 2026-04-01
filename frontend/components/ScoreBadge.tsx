import clsx from 'clsx'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function scoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30'
  if (score >= 40) return 'bg-orange-500/20 text-orange-400 ring-orange-500/30'
  return 'bg-red-500/20 text-red-400 ring-red-500/30'
}

const sizeMap = {
  sm: 'text-xs px-2 py-0.5 ring-1',
  md: 'text-sm px-2.5 py-1 ring-1',
  lg: 'text-3xl font-bold px-5 py-3 ring-2',
}

export default function ScoreBadge({ score, size = 'md', className }: ScoreBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full font-semibold tabular-nums',
        scoreColor(score),
        sizeMap[size],
        className,
      )}
    >
      {score.toFixed(0)}
    </span>
  )
}
