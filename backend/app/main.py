"""MCP-Guard API — MCP Security Audit Platform."""

from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func

from .database import engine, get_db, Base
from .models import MCPTool, Alert, ScanRecord, RiskLevel
from .schemas import (
    ToolScore, ToolListItem, ToolDetail, AlertItem,
    ScanRequest, ScanResult, StatsResponse,
)
from .scanner import scan_tool
from .config import settings

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MCP-Guard API",
    description="MCP Security Audit Platform — Monitor, Score, and Protect",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "mcp-guard", "timestamp": datetime.utcnow().isoformat()}


# ── Stats ───────────────────────────────────────────────

@app.get("/api/v1/stats", response_model=StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(MCPTool.id)).scalar() or 0
    alerts = db.query(func.count(Alert.id)).scalar() or 0
    critical = db.query(func.count(MCPTool.id)).filter(
        MCPTool.risk_level.in_([RiskLevel.critical, RiskLevel.high])
    ).scalar() or 0
    avg = db.query(func.avg(MCPTool.score)).scalar() or 0.0
    return StatsResponse(
        total_tools=total,
        total_alerts=alerts,
        critical_tools=critical,
        average_score=round(float(avg), 1),
    )


# ── Tools ───────────────────────────────────────────────

@app.get("/api/v1/tools", response_model=list[ToolListItem])
def list_tools(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "score",
    db: Session = Depends(get_db),
):
    q = db.query(MCPTool)
    if risk_level:
        q = q.filter(MCPTool.risk_level == risk_level)
    if search:
        q = q.filter(MCPTool.name.ilike(f"%{search}%"))
    
    if sort_by == "score":
        q = q.order_by(MCPTool.score.asc())
    elif sort_by == "name":
        q = q.order_by(MCPTool.name)
    elif sort_by == "last_scan":
        q = q.order_by(MCPTool.last_scan.desc())
    else:
        q = q.order_by(MCPTool.score.asc())

    tools = q.offset(skip).limit(limit).all()
    return [
        ToolListItem(
            id=t.id, name=t.name, author=t.author, score=t.score,
            risk_level=t.risk_level.value, tampering_count=t.tampering_count,
            last_scan=t.last_scan, description=t.description,
        )
        for t in tools
    ]


@app.get("/api/v1/tools/{tool_id}", response_model=ToolDetail)
def get_tool(tool_id: str, db: Session = Depends(get_db)):
    tool = db.query(MCPTool).filter(MCPTool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    alerts = [
        {"id": a.id, "change_type": a.change_type.value, "severity": a.severity.value,
         "description": a.description, "created_at": a.created_at.isoformat()}
        for a in tool.alerts
    ]
    scans = [
        {"id": s.id, "score": s.score, "risk_level": s.risk_level.value if s.risk_level else None,
         "scanned_at": s.scanned_at.isoformat()}
        for s in tool.scan_history[-50:]
    ]

    return ToolDetail(
        id=tool.id, name=tool.name, author=tool.author, score=tool.score,
        risk_level=tool.risk_level.value, tampering_count=tool.tampering_count,
        last_scan=tool.last_scan, description=tool.description,
        repo_url=tool.repo_url, manifest_hash=tool.manifest_hash,
        code_hash=tool.code_hash, version=tool.version,
        total_scans=tool.total_scans, first_seen=tool.first_seen,
        alerts=alerts, scan_history=scans,
    )


@app.get("/api/v1/tools/{tool_id}/score", response_model=ToolScore)
def get_tool_score(tool_id: str, db: Session = Depends(get_db)):
    tool = db.query(MCPTool).filter(MCPTool.id == tool_id).first()
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    issues = [
        {"type": a.change_type.value, "severity": a.severity.value,
         "description": a.description, "date": a.created_at.isoformat()}
        for a in tool.alerts if not a.resolved
    ]

    return ToolScore(
        tool_id=tool.id, name=tool.name, score=tool.score,
        risk_level=tool.risk_level.value, last_scan=tool.last_scan,
        issues=issues,
    )


# ── Alerts ──────────────────────────────────────────────

@app.get("/api/v1/alerts", response_model=list[AlertItem])
def list_alerts(
    skip: int = 0,
    limit: int = Query(default=50, le=200),
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Alert).join(MCPTool)
    if severity:
        q = q.filter(Alert.severity == severity)
    alerts = q.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()

    return [
        AlertItem(
            id=a.id, tool_id=a.tool_id, tool_name=a.tool.name,
            change_type=a.change_type.value, severity=a.severity.value,
            description=a.description, created_at=a.created_at,
            resolved=bool(a.resolved),
        )
        for a in alerts
    ]


# ── Scan ────────────────────────────────────────────────

@app.post("/api/v1/scan", response_model=ScanResult)
async def trigger_scan(req: ScanRequest, db: Session = Depends(get_db)):
    result = await scan_tool(
        db=db,
        repo_url=req.repo_url,
        tool_name=req.tool_name,
        github_token=settings.github_token or None,
    )
    return ScanResult(**result)
