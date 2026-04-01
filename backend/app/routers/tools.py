import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Alert, MCPTool, ReputationScore, ScanResult
from app.schemas import (
    MCPToolCreate,
    MCPToolResponse,
    AlertResponse,
    PaginatedTools,
    ReputationScoreResponse,
    ScanResultResponse,
    ToolDetailResponse,
)

router = APIRouter(prefix="/api/v1/tools", tags=["tools"])


@router.get("/", response_model=PaginatedTools)
async def list_tools(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedTools:
    offset = (page - 1) * per_page

    total_result = await db.execute(select(func.count()).select_from(MCPTool))
    total = total_result.scalar_one()

    tools_result = await db.execute(
        select(MCPTool).order_by(MCPTool.created_at.desc()).offset(offset).limit(per_page)
    )
    tools = tools_result.scalars().all()

    return PaginatedTools(
        items=[MCPToolResponse.model_validate(t) for t in tools],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("/", response_model=MCPToolResponse, status_code=201)
async def create_tool(
    payload: MCPToolCreate,
    db: AsyncSession = Depends(get_db),
) -> MCPToolResponse:
    existing = await db.execute(
        select(MCPTool).where(MCPTool.tool_id == payload.tool_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Tool with this tool_id already exists")

    tool = MCPTool(
        id=uuid.uuid4(),
        tool_id=payload.tool_id,
        name=payload.name,
        description=payload.description,
        repo_url=payload.repo_url,
        author=payload.author,
    )
    db.add(tool)
    await db.flush()
    await db.refresh(tool)
    return MCPToolResponse.model_validate(tool)


@router.get("/{tool_id}", response_model=ToolDetailResponse)
async def get_tool(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
) -> ToolDetailResponse:
    result = await db.execute(
        select(MCPTool)
        .where(MCPTool.tool_id == tool_id)
        .options(
            selectinload(MCPTool.reputation_score),
            selectinload(MCPTool.alerts),
            selectinload(MCPTool.scan_results),
        )
    )
    tool = result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")

    recent_alerts = sorted(tool.alerts, key=lambda a: a.created_at, reverse=True)[:10]
    recent_scans = sorted(tool.scan_results, key=lambda s: s.scanned_at, reverse=True)[:10]

    score_response: Optional[ReputationScoreResponse] = None
    if tool.reputation_score is not None:
        rep = tool.reputation_score
        last_scan_dt = recent_scans[0].scanned_at if recent_scans else None
        score_response = ReputationScoreResponse(
            tool_id=rep.tool_id,
            score=rep.score,
            risk_level=rep.risk_level,
            last_scan=last_scan_dt,
            issues=rep.issues or [],
        )

    return ToolDetailResponse(
        tool=MCPToolResponse.model_validate(tool),
        score=score_response,
        recent_alerts=[AlertResponse.model_validate(a) for a in recent_alerts],
        recent_scans=[ScanResultResponse.model_validate(s) for s in recent_scans],
    )


@router.get("/{tool_id}/score", response_model=ReputationScoreResponse)
async def get_tool_score(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
) -> ReputationScoreResponse:
    # Verify tool exists
    tool_result = await db.execute(select(MCPTool).where(MCPTool.tool_id == tool_id))
    tool = tool_result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")

    rep_result = await db.execute(
        select(ReputationScore).where(ReputationScore.tool_id == tool_id)
    )
    rep = rep_result.scalar_one_or_none()

    # Fetch most recent scan for last_scan timestamp
    scan_result = await db.execute(
        select(ScanResult)
        .where(ScanResult.tool_id == tool_id)
        .order_by(ScanResult.scanned_at.desc())
        .limit(1)
    )
    last_scan = scan_result.scalar_one_or_none()

    if rep is None:
        return ReputationScoreResponse(
            tool_id=tool_id,
            score=100,
            risk_level="safe",
            last_scan=last_scan.scanned_at if last_scan else None,
            issues=[],
        )

    return ReputationScoreResponse(
        tool_id=rep.tool_id,
        score=rep.score,
        risk_level=rep.risk_level,
        last_scan=last_scan.scanned_at if last_scan else None,
        issues=rep.issues or [],
    )


@router.get("/{tool_id}/alerts", response_model=list[AlertResponse])
async def get_tool_alerts(
    tool_id: str,
    resolved: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    tool_result = await db.execute(select(MCPTool).where(MCPTool.tool_id == tool_id))
    if tool_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Tool not found")

    stmt = select(Alert).where(Alert.tool_id == tool_id).order_by(Alert.created_at.desc())
    if resolved is not None:
        stmt = stmt.where(Alert.resolved == resolved)

    alerts_result = await db.execute(stmt)
    alerts = alerts_result.scalars().all()
    return [AlertResponse.model_validate(a) for a in alerts]


@router.get("/{tool_id}/scans", response_model=list[ScanResultResponse])
async def get_tool_scans(
    tool_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[ScanResultResponse]:
    tool_result = await db.execute(select(MCPTool).where(MCPTool.tool_id == tool_id))
    if tool_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Tool not found")

    scans_result = await db.execute(
        select(ScanResult)
        .where(ScanResult.tool_id == tool_id)
        .order_by(ScanResult.scanned_at.desc())
    )
    scans = scans_result.scalars().all()
    return [ScanResultResponse.model_validate(s) for s in scans]
