'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, AlertCircle, ExternalLink, Filter } from 'lucide-react'
import clsx from 'clsx'
import { getAlerts, resolveAlert } from '@/lib/api'
import type { Alert, AlertSeverity, AlertListResponse } from '@/lib/types'

// ─── Severity badge ───────────────────────────────────────────────────────────

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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1',
        severityColors[severity] ?? 'bg-slate-500/20 text-slate-400 ring-slate-500/30',
      )}
    >
      {severity}
    </span>
  )
}

// ─── Filter pill button ───────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-brand-500 bg-brand-600 text-white'
          : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200',
      )}
    >
      {children}
    </button>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert
  onResolve: (id: string) => Promise<void>
  resolving: boolean
}

function AlertCard({ alert, onResolve, resolving }: AlertCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border bg-slate-800/60 p-5 backdrop-blur-sm transition-opacity',
        alert.resolved ? 'border-slate-700/30 opacity-60' : 'border-slate-700/50',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left content */}
        <div className="flex flex-col gap-2 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs font-mono text-slate-300">
              {alert.alert_type}
            </span>
            {alert.resolved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Resolved
              </span>
            )}
          </div>

          {/* Tool name */}
          {alert.tool_name && (
            <Link
              href={`/tools/${alert.tool_id}`}
              className="flex items-center gap-1 text-sm font-medium text-brand-400 hover:underline w-fit"
            >
              {alert.tool_name}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}

          {/* Message */}
          <p className="text-sm text-slate-300">{alert.message}</p>

          {/* Timestamps */}
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            <span>Created: {formatDate(alert.created_at)}</span>
            {alert.resolved_at && (
              <span>Resolved: {formatDate(alert.resolved_at)}</span>
            )}
          </div>
        </div>

        {/* Resolve button */}
        {!alert.resolved && (
          <button
            onClick={() => onResolve(alert.id)}
            disabled={resolving}
            className={clsx(
              'flex-shrink-0 rounded-lg border border-emerald-700 bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-400',
              'transition-colors hover:bg-emerald-800/50 hover:text-emerald-300',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {resolving ? 'Resolving…' : 'Mark Resolved'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded bg-slate-700/50', className)} />
}

function AlertSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-24 rounded" />
      </div>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

// ─── Alerts Page ──────────────────────────────────────────────────────────────

const SEVERITY_FILTERS: { label: string; value: AlertSeverity | 'all' }[] = [
  { label: 'All',      value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High',     value: 'high' },
  { label: 'Medium',   value: 'medium' },
  { label: 'Low',      value: 'low' },
]

const PAGE_SIZE = 20

export default function AlertsPage() {
  const [data,     setData]     = useState<AlertListResponse | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all')
  const [resolved, setResolved] = useState<boolean | 'all'>('all')
  const [page,     setPage]     = useState(1)
  const [resolving, setResolving] = useState<Set<string>>(new Set())

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAlerts({
        severity: severity === 'all' ? undefined : severity,
        resolved: resolved === 'all' ? undefined : resolved,
        page,
        page_size: PAGE_SIZE,
      })
      setData(res)
    } catch (e) {
      setError((e as Error).message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [severity, resolved, page])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const handleResolve = async (alertId: string) => {
    setResolving((prev) => new Set(prev).add(alertId))
    try {
      await resolveAlert(alertId)
      // Optimistically mark as resolved in state
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((a) =>
            a.id === alertId
              ? { ...a, resolved: true, resolved_at: new Date().toISOString() }
              : a,
          ),
        }
      })
    } catch (e) {
      console.error('Failed to resolve alert:', e)
    } finally {
      setResolving((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  const alerts     = data?.items ?? []
  const total      = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">Alerts</h1>
        <p className="text-sm text-slate-400">
          Security alerts raised by the scanner across all MCP tools.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/60 p-4">
        <Filter className="h-4 w-4 flex-shrink-0 text-slate-500" />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Severity:</span>
          {SEVERITY_FILTERS.map(({ label, value }) => (
            <FilterPill
              key={value}
              active={severity === value}
              onClick={() => { setSeverity(value); setPage(1) }}
            >
              {label}
            </FilterPill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-l border-slate-700 pl-3 ml-1">
          <span className="text-xs font-medium text-slate-400">Status:</span>
          {([
            { label: 'All',          value: 'all'  as const },
            { label: 'Unresolved',   value: false  as const },
            { label: 'Resolved',     value: true   as const },
          ] as const).map(({ label, value }) => (
            <FilterPill
              key={String(value)}
              active={resolved === value}
              onClick={() => { setResolved(value); setPage(1) }}
            >
              {label}
            </FilterPill>
          ))}
        </div>

        {total > 0 && (
          <span className="ml-auto text-xs text-slate-500">{total} alert{total !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-700/30 bg-red-900/20 p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Failed to load alerts: {error}
        </div>
      )}

      {/* Alert list */}
      {!error && (
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <AlertSkeleton key={i} />)
            : alerts.length === 0
            ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center text-slate-500">
                <Bell className="h-10 w-10" />
                <p className="text-sm">No alerts matching the current filters.</p>
              </div>
            )
            : alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={handleResolve}
                  resolving={resolving.has(alert.id)}
                />
              ))
          }
        </div>
      )}

      {/* Pagination */}
      {!error && !loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700/60 pt-4">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
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
