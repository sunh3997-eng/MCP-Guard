// ─── Tool ────────────────────────────────────────────────────────────────────

export interface Tool {
  id: string
  name: string
  author: string
  repo_url: string | null
  description: string | null
  created_at: string
  updated_at: string
  latest_score: ToolScore | null
}

export interface ToolListResponse {
  items: Tool[]
  total: number
  page: number
  page_size: number
}

// ─── Score ───────────────────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown'

export interface ScoreIssue {
  code: string
  title: string
  description: string
  severity: RiskLevel
  location?: string
}

export interface ToolScore {
  id: string
  tool_id: string
  score: number
  risk_level: RiskLevel
  issues: ScoreIssue[]
  manifest_hash: string | null
  code_hash: string | null
  scanned_at: string
}

// ─── Scan ────────────────────────────────────────────────────────────────────

export interface ScanResult {
  id: string
  tool_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  manifest_hash: string | null
  code_hash: string | null
  error_message: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface ScanListResponse {
  items: ScanResult[]
  total: number
}

// ─── Alert ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Alert {
  id: string
  tool_id: string
  tool_name?: string
  alert_type: string
  severity: AlertSeverity
  message: string
  resolved: boolean
  resolved_at: string | null
  created_at: string
}

export interface AlertListResponse {
  items: Alert[]
  total: number
  page: number
  page_size: number
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  page_size?: number
}

export interface AlertFilters extends PaginationParams {
  severity?: AlertSeverity | 'all'
  resolved?: boolean | 'all'
  tool_id?: string
}

export interface ToolsParams extends PaginationParams {
  search?: string
}
