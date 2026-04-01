import type {
  Tool,
  ToolListResponse,
  ToolScore,
  ScanResult,
  ScanListResponse,
  Alert,
  AlertListResponse,
  AlertFilters,
  ToolsParams,
} from './types'

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8000'

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== 'all' && v !== '') {
      q.set(k, String(v))
    }
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

// ─── Tools ────────────────────────────────────────────────────────────────────

export async function getTools(params: ToolsParams = {}): Promise<ToolListResponse> {
  const { page = 1, page_size = 20, search } = params
  const qs = buildQuery({ page, page_size, search })
  return apiFetch<ToolListResponse>(`/api/v1/tools${qs}`)
}

export async function getTool(id: string): Promise<Tool> {
  return apiFetch<Tool>(`/api/v1/tools/${id}`)
}

export async function getToolScore(id: string): Promise<ToolScore> {
  return apiFetch<ToolScore>(`/api/v1/tools/${id}/score`)
}

export async function getToolScans(
  id: string,
  params: { page?: number; page_size?: number } = {},
): Promise<ScanListResponse> {
  const { page = 1, page_size = 20 } = params
  const qs = buildQuery({ page, page_size })
  return apiFetch<ScanListResponse>(`/api/v1/tools/${id}/scans${qs}`)
}

export async function getToolAlerts(
  id: string,
  params: AlertFilters = {},
): Promise<AlertListResponse> {
  const qs = buildQuery(params)
  return apiFetch<AlertListResponse>(`/api/v1/tools/${id}/alerts${qs}`)
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export async function getAlerts(filters: AlertFilters = {}): Promise<AlertListResponse> {
  const qs = buildQuery(filters)
  return apiFetch<AlertListResponse>(`/api/v1/alerts${qs}`)
}

export async function resolveAlert(id: string): Promise<Alert> {
  return apiFetch<Alert>(`/api/v1/alerts/${id}/resolve`, { method: 'POST' })
}
