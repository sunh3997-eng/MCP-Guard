from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ToolScore(BaseModel):
    tool_id: str
    name: str
    score: float
    risk_level: str
    last_scan: Optional[datetime] = None
    issues: list[dict] = []


class ToolListItem(BaseModel):
    id: str
    name: str
    author: Optional[str] = None
    score: float
    risk_level: str
    tampering_count: int
    last_scan: Optional[datetime] = None
    description: Optional[str] = None


class ToolDetail(ToolListItem):
    repo_url: Optional[str] = None
    manifest_hash: Optional[str] = None
    code_hash: Optional[str] = None
    version: Optional[str] = None
    total_scans: int
    first_seen: Optional[datetime] = None
    alerts: list[dict] = []
    scan_history: list[dict] = []


class AlertItem(BaseModel):
    id: int
    tool_id: str
    tool_name: str
    change_type: str
    severity: str
    description: Optional[str] = None
    created_at: datetime
    resolved: bool = False


class ScanRequest(BaseModel):
    repo_url: str
    tool_name: Optional[str] = None


class ScanResult(BaseModel):
    tool_id: str
    status: str
    changes_detected: bool
    details: dict = {}


class StatsResponse(BaseModel):
    total_tools: int
    total_alerts: int
    critical_tools: int
    average_score: float
