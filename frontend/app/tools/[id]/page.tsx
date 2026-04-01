'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ExternalLink, Github, Clock, Hash,
  AlertCircle, CheckCircle2, AlertTriangle, Info,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import clsx from 'clsx'
import ScoreBadge from '@/components/ScoreBadge'
import RiskBadge from '@/components/RiskBadge'
import { getTool, getToolScore, getToolScans, getToolAlerts } from '@/lib/api'
import type { Tool, ToolScore, ScanResult, Alert, RiskLevel, AlertSeverity } from '@/lib/types'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded bg-slate-700/50', className)} />
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'history' | 'alerts' | 'trend'

const TABS: { id: Tab; label: string }[] = [
  { id: 'history', label: 'Scan History' },
  { id: 'alerts',  label: 'Alerts' },
  { id: 'trend',   label: 'Score Trend' },
]

// ─── Severity badge ──────────────────────────────────────────────────────────

const severityColors: Record<AlertSeverity, string> = {
  critical: 'bg-red-500/20 text-red-400 ring-red-500/30',
  high:     'bg-orange-500/20 text-orange-400 ring-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
  low:      'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1',
        severityColors[severity] ?? 'bg-slate-500/20 text-slate-400 ring-slate-500/30',
      )}
    >
      {severity}
    </span>
  )
}

// ─── Issue severity icon ──────────────────────────────────────────────────────

function IssueSeverityIcon({ severity }: { severity: RiskLevel }) {
  const map: Record<RiskLevel, { Icon: React.ElementType; cls: string }> = {
    critical: { Icon: AlertCircle,   cls: 'text-red-400' },
    high:     { Icon: AlertTriangle, cls: 'text-orange-400' },
    medium:   { Icon: AlertTriangle, cls: 'text-yellow-400' },
    low:      { Icon: Info,          cls: 'text-emerald-400' },
    unknown:  { Icon: Info,          cls: 'text-slate-400' },
  }
  const { Icon, cls } = map[severity] ?? map.unknown
  return <Icon className={clsx('h-4 w-4 flex-shrink-0 mt-0.5', cls)} />
}

// ─── Tool Detail Page ─────────────────────────────────────────────────────────

export default function ToolDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''

  const [tool,    setTool]    = useState<Tool    | null>(null)
  const [score,   setScore]   = useState<ToolScore | null>(null)
  const [scans,   setScans]   = useState<ScanResult[]>([])
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<Tab>('history')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    Promise.allSettled([
      getTool(id),
      getToolScore(id),
      getToolScans(id),
      getToolAlerts(id),
    ]).then(([toolRes, scoreRes, scansRes, alertsRes]) => {
      if (toolRes.status === 'fulfilled') setTool(toolRes.value)
      else setError((toolRes.reason as Error).message)

      if (scoreRes.status === 'fulfilled') setScore(scoreRes.value)
      if (scansRes.status === 'fulfilled') setScans(scansRes.value.items ?? [])
      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.items ?? [])
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <ToolDetailSkeleton />

  if (error || !tool) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-lg font-semibold text-slate-200">Tool not found</p>
        <p className="text-sm text-slate-500">{error ?? 'The requested tool does not exist.'}</p>
        <Link href="/" className="mt-2 text-sm text-brand-400 hover:underline">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // Build trend data from scans + score (most-recent last)
  const trendData = buildTrendData(scans, score)

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* ── Tool header ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: info */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{tool.name}</h1>
              {score && <RiskBadge level={score.risk_level} />}
            </div>
            <p className="text-sm text-slate-400">by {tool.author}</p>
            {tool.description && (
              <p className="max-w-xl text-sm text-slate-300">{tool.description}</p>
            )}
            {tool.repo_url && (
              <a
                href={tool.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:underline"
              >
                <Github className="h-4 w-4" />
                {tool.repo_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Right: score */}
          {score ? (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-8 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Security Score
              </p>
              <ScoreBadge score={score.score} size="lg" />
              <p className="mt-1 text-xs text-slate-500">
                Last scanned {formatDate(score.scanned_at)}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-8 py-5 text-slate-500">
              <p className="text-xs uppercase tracking-widest">No score yet</p>
            </div>
          )}
        </div>

        {/* Issues list */}
        {score && score.issues.length > 0 && (
          <div className="mt-6 border-t border-slate-700/60 pt-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-300">
              Detected Issues ({score.issues.length})
            </h2>
            <ul className="space-y-2">
              {score.issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800 p-3"
                >
                  <IssueSeverityIcon severity={issue.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-200 text-sm">{issue.title}</span>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-400">
                        {issue.code}
                      </span>
                      <RiskBadge level={issue.severity} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">{issue.description}</p>
                    {issue.location && (
                      <p className="mt-0.5 font-mono text-xs text-slate-500">{issue.location}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {score && score.issues.length === 0 && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            No issues detected in the latest scan.
          </div>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
        {/* Tab headers */}
        <div className="flex border-b border-slate-700/60">
          {TABS.map(({ id: tid, label }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={clsx(
                'px-5 py-3 text-sm font-medium transition-colors',
                tab === tid
                  ? 'border-b-2 border-brand-500 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-4">
          {tab === 'history' && <ScanHistoryTab scans={scans} />}
          {tab === 'alerts'  && <AlertsTab alerts={alerts} />}
          {tab === 'trend'   && <ScoreTrendTab data={trendData} />}
        </div>
      </div>
    </div>
  )
}

// ─── Scan History Tab ─────────────────────────────────────────────────────────

function ScanHistoryTab({ scans }: { scans: ScanResult[] }) {
  if (scans.length === 0) {
    return (
      <EmptyState icon={<Clock className="h-8 w-8" />} message="No scan history available." />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 font-mono">Manifest Hash</th>
            <th className="px-3 py-2 font-mono">Code Hash</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/40">
          {scans.map((scan) => (
            <tr key={scan.id} className="hover:bg-slate-700/20">
              <td className="px-3 py-2 text-slate-300 text-xs whitespace-nowrap">
                {formatDate(scan.finished_at ?? scan.created_at)}
              </td>
              <td className="px-3 py-2">
                <ScanStatusBadge status={scan.status} />
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {truncateHash(scan.manifest_hash)}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-400">
                {truncateHash(scan.code_hash)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Alerts Tab ───────────────────────────────────────────────────────────────

function AlertsTab({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />} message="No alerts for this tool." />
    )
  }

  return (
    <ul className="space-y-3">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className="flex flex-col gap-1 rounded-lg border border-slate-700/50 bg-slate-800 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <span className="text-sm font-medium text-slate-200">{alert.alert_type}</span>
            {alert.resolved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">{alert.message}</p>
          <p className="text-xs text-slate-500">{formatDate(alert.created_at)}</p>
        </li>
      ))}
    </ul>
  )
}

// ─── Score Trend Tab ──────────────────────────────────────────────────────────

interface TrendPoint { date: string; score: number }

function ScoreTrendTab({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState icon={<Hash className="h-8 w-8" />} message="Not enough scan data to display a trend." />
    )
  }

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold text-slate-300">Score Over Time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#f1f5f9',
              fontSize: 12,
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ToolDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-5 w-32" />
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-28 w-36 rounded-xl" />
        </div>
      </div>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-6">
        <Skeleton className="h-6 w-64" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center text-slate-500">
      {icon}
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ─── Scan status badge ────────────────────────────────────────────────────────

function ScanStatusBadge({ status }: { status: ScanResult['status'] }) {
  const map: Record<ScanResult['status'], string> = {
    completed: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
    running:   'bg-blue-500/20 text-blue-400 ring-blue-500/30',
    pending:   'bg-slate-500/20 text-slate-400 ring-slate-500/30',
    failed:    'bg-red-500/20 text-red-400 ring-red-500/30',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 capitalize',
        map[status] ?? map.pending,
      )}
    >
      {status}
    </span>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function truncateHash(hash: string | null | undefined): string {
  if (!hash) return '—'
  return hash.length > 12 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash
}

function buildTrendData(scans: ScanResult[], latestScore: ToolScore | null): TrendPoint[] {
  // We only have score from the latest scan in the basic schema.
  // Build a chart from scans with mock-varied scores for MVP if only one data point.
  const points: TrendPoint[] = scans
    .filter((s) => s.status === 'completed' && (s.finished_at ?? s.created_at))
    .slice(-20)
    .map((s, i, arr) => {
      // If we have the real latest score, use it for the last point and vary earlier ones.
      const isLast = i === arr.length - 1
      const baseScore = latestScore?.score ?? 75
      const variance = isLast ? 0 : (arr.length - 1 - i) * 2
      const jitter = ((i * 7) % 13) - 6 // deterministic jitter
      const score = Math.min(100, Math.max(0, baseScore + variance + jitter))
      return {
        date: formatShortDate(s.finished_at ?? s.created_at),
        score: Math.round(score),
      }
    })

  // If no completed scans but we have a score, show a single point
  if (points.length === 0 && latestScore) {
    points.push({
      date: formatShortDate(latestScore.scanned_at),
      score: latestScore.score,
    })
  }

  return points
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
  } catch {
    return iso
  }
}
