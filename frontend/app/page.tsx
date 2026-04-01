'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Search, ChevronLeft, ChevronRight,
  Wrench, Bell, BarChart2, AlertTriangle, ExternalLink,
} from 'lucide-react'
import clsx from 'clsx'
import ScoreBadge from '@/components/ScoreBadge'
import RiskBadge from '@/components/RiskBadge'
import { getTools, getAlerts } from '@/lib/api'
import type { Tool, ToolListResponse } from '@/lib/types'

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse rounded bg-slate-700/50', className)} />
  )
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  loading?: boolean
}

function StatCard({ label, value, icon, color, loading }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <div className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', color)}>
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-20" />
      ) : (
        <p className="mt-3 text-3xl font-bold tabular-nums text-white">{value}</p>
      )}
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function DashboardPage() {
  const [data, setData]         = useState<ToolListResponse | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]         = useState(1)
  const [alertsToday, setAlertsToday] = useState<number | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const fetchTools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getTools({ page, page_size: PAGE_SIZE, search: debouncedSearch || undefined })
      setData(res)
    } catch (e) {
      setError((e as Error).message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { fetchTools() }, [fetchTools])

  // Fetch today's alert count
  useEffect(() => {
    getAlerts({ page: 1, page_size: 1 })
      .then((r) => setAlertsToday(r.total))
      .catch(() => setAlertsToday(0))
  }, [])

  const tools   = data?.items ?? []
  const total   = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Derived stats
  const avgScore = tools.length
    ? Math.round(tools.reduce((s, t) => s + (t.latest_score?.score ?? 0), 0) / tools.length)
    : 0
  const criticalCount = tools.filter((t) => t.latest_score?.risk_level === 'critical').length

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of all registered MCP tools and their security posture.
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Tools"
          value={total}
          icon={<Wrench className="h-5 w-5 text-brand-400" />}
          color="bg-brand-500/20"
          loading={loading}
        />
        <StatCard
          label="Alerts Today"
          value={alertsToday ?? '—'}
          icon={<Bell className="h-5 w-5 text-yellow-400" />}
          color="bg-yellow-500/20"
          loading={alertsToday === null}
        />
        <StatCard
          label="Avg Score"
          value={avgScore}
          icon={<BarChart2 className="h-5 w-5 text-emerald-400" />}
          color="bg-emerald-500/20"
          loading={loading}
        />
        <StatCard
          label="Critical Tools"
          value={criticalCount}
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          color="bg-red-500/20"
          loading={loading}
        />
      </div>

      {/* ── Tools table ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm">
        {/* Table header */}
        <div className="flex flex-col gap-3 border-b border-slate-700/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-white">Registered Tools</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search tools…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-8 text-center text-sm text-red-400">
            Failed to load tools: {error}
          </div>
        )}

        {/* Table */}
        {!error && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Tool Name</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3">Last Scan</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : tools.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-500">
                        No tools found{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}.
                      </td>
                    </tr>
                  )
                  : tools.map((tool) => (
                      <ToolRow key={tool.id} tool={tool} />
                    ))
                }
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!error && !loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-700/60 px-4 py-3">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <PaginationButton
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </PaginationButton>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-slate-500">…</span>
                  ) : (
                    <PaginationButton
                      key={p}
                      onClick={() => setPage(p as number)}
                      active={page === p}
                    >
                      {p}
                    </PaginationButton>
                  ),
                )}
              <PaginationButton
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </PaginationButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tool Row ─────────────────────────────────────────────────────────────────

function ToolRow({ tool }: { tool: Tool }) {
  const score    = tool.latest_score
  const lastScan = score?.scanned_at ? formatDate(score.scanned_at) : '—'

  return (
    <tr className="transition-colors hover:bg-slate-700/30">
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-medium text-slate-100">{tool.name}</span>
          {tool.description && (
            <span className="mt-0.5 line-clamp-1 text-xs text-slate-500">{tool.description}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300">{tool.author}</td>
      <td className="px-4 py-3">
        {score != null ? <ScoreBadge score={score.score} /> : <span className="text-slate-500">—</span>}
      </td>
      <td className="px-4 py-3">
        {score != null ? (
          <RiskBadge level={score.risk_level} />
        ) : (
          <span className="text-slate-500 text-xs">Not scanned</span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">{lastScan}</td>
      <td className="px-4 py-3">
        <Link
          href={`/tools/${tool.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-brand-500 hover:bg-brand-600 hover:text-white"
        >
          Details <ExternalLink className="h-3 w-3" />
        </Link>
      </td>
    </tr>
  )
}

// ─── Pagination Button ────────────────────────────────────────────────────────

function PaginationButton({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex h-7 min-w-[1.75rem] items-center justify-center rounded px-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
