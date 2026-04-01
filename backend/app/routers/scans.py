import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Alert, MCPTool, ReputationScore, ScanResult
from app.schemas import ScanResultResponse, ScanSubmit
from app.scoring import compute_score

router = APIRouter(prefix="/api/v1/scans", tags=["scans"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/submit", response_model=ScanResultResponse, status_code=201)
async def submit_scan(
    payload: ScanSubmit,
    db: AsyncSession = Depends(get_db),
) -> ScanResultResponse:
    # Verify the tool exists
    tool_result = await db.execute(
        select(MCPTool).where(MCPTool.tool_id == payload.tool_id)
    )
    tool = tool_result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found. Register it first via POST /api/v1/tools")

    # Fetch the most recent previous scan
    prev_result = await db.execute(
        select(ScanResult)
        .where(ScanResult.tool_id == payload.tool_id)
        .order_by(ScanResult.scanned_at.desc())
        .limit(1)
    )
    prev_scan = prev_result.scalar_one_or_none()

    now = _utcnow()

    # Determine what changed and create alerts
    alerts_to_add: list[Alert] = []

    if prev_scan is None:
        # First scan — emit a "new_tool" alert
        alerts_to_add.append(
            Alert(
                id=uuid.uuid4(),
                tool_id=payload.tool_id,
                alert_type="new_tool",
                severity="low",
                message=f"First scan recorded for tool '{payload.tool_id}'.",
                created_at=now,
                resolved=False,
                old_hash=None,
                new_hash=payload.code_hash,
            )
        )
    else:
        if prev_scan.manifest_hash != payload.manifest_hash:
            alerts_to_add.append(
                Alert(
                    id=uuid.uuid4(),
                    tool_id=payload.tool_id,
                    alert_type="manifest_changed",
                    severity="high",
                    message=(
                        f"Manifest hash changed for tool '{payload.tool_id}'. "
                        f"Previous: {prev_scan.manifest_hash[:12]}... "
                        f"New: {payload.manifest_hash[:12]}..."
                    ),
                    created_at=now,
                    resolved=False,
                    old_hash=prev_scan.manifest_hash,
                    new_hash=payload.manifest_hash,
                )
            )

        if prev_scan.code_hash != payload.code_hash:
            alerts_to_add.append(
                Alert(
                    id=uuid.uuid4(),
                    tool_id=payload.tool_id,
                    alert_type="code_changed",
                    severity="critical",
                    message=(
                        f"Code hash changed for tool '{payload.tool_id}'. "
                        f"Previous: {prev_scan.code_hash[:12]}... "
                        f"New: {payload.code_hash[:12]}..."
                    ),
                    created_at=now,
                    resolved=False,
                    old_hash=prev_scan.code_hash,
                    new_hash=payload.code_hash,
                )
            )

    for alert in alerts_to_add:
        db.add(alert)

    # Persist the new scan record
    new_scan = ScanResult(
        id=uuid.uuid4(),
        tool_id=payload.tool_id,
        manifest_hash=payload.manifest_hash,
        code_hash=payload.code_hash,
        scanned_at=now,
        raw_manifest=payload.raw_manifest,
        file_hashes=payload.file_hashes,
    )
    db.add(new_scan)

    # -----------------------------------------------------------------------
    # Update / create ReputationScore
    # -----------------------------------------------------------------------
    rep_result = await db.execute(
        select(ReputationScore).where(ReputationScore.tool_id == payload.tool_id)
    )
    rep = rep_result.scalar_one_or_none()

    # Count total tamper events (manifest + code change alerts, unresolved or resolved)
    tamper_count_result = await db.execute(
        select(Alert).where(
            Alert.tool_id == payload.tool_id,
            Alert.alert_type.in_(["manifest_changed", "code_changed"]),
        )
    )
    existing_tamper_alerts = tamper_count_result.scalars().all()
    # Include the new alerts we're about to add
    new_tamper_alerts = [
        a for a in alerts_to_add if a.alert_type in ("manifest_changed", "code_changed")
    ]
    tamper_count = len(existing_tamper_alerts) + len(new_tamper_alerts)

    # Compute update frequency: scans per day over lifetime of the tool
    all_scans_result = await db.execute(
        select(ScanResult).where(ScanResult.tool_id == payload.tool_id)
    )
    all_scans = all_scans_result.scalars().all()
    total_scans = len(all_scans) + 1  # +1 for the new scan

    tool_age_days = max(
        (now - tool.created_at.replace(tzinfo=timezone.utc) if tool.created_at.tzinfo is None else now - tool.created_at).total_seconds() / 86400,
        1.0,
    )
    update_frequency = total_scans / tool_age_days

    community_reports = rep.community_reports if rep is not None else 0

    days_since_last_scan = 0.0  # We just scanned

    score, risk_level, issues = compute_score(
        tool_id=payload.tool_id,
        tamper_count=tamper_count,
        update_frequency=update_frequency,
        community_reports=community_reports,
        days_since_last_scan=days_since_last_scan,
    )

    if rep is None:
        rep = ReputationScore(
            id=uuid.uuid4(),
            tool_id=payload.tool_id,
            score=score,
            risk_level=risk_level,
            tamper_count=tamper_count,
            update_frequency=update_frequency,
            community_reports=community_reports,
            last_computed=now,
            issues=issues,
        )
        db.add(rep)
    else:
        rep.score = score
        rep.risk_level = risk_level
        rep.tamper_count = tamper_count
        rep.update_frequency = update_frequency
        rep.last_computed = now
        rep.issues = issues

    await db.flush()
    await db.refresh(new_scan)
    return ScanResultResponse.model_validate(new_scan)
