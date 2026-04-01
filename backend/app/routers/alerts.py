import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Alert
from app.schemas import AlertResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get("/", response_model=list[AlertResponse])
async def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: low|medium|high|critical"),
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    tool_id: Optional[str] = Query(None, description="Filter by tool_id"),
    db: AsyncSession = Depends(get_db),
) -> list[AlertResponse]:
    stmt = select(Alert).order_by(Alert.created_at.desc())

    if severity is not None:
        stmt = stmt.where(Alert.severity == severity)
    if resolved is not None:
        stmt = stmt.where(Alert.resolved == resolved)
    if tool_id is not None:
        stmt = stmt.where(Alert.tool_id == tool_id)

    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return [AlertResponse.model_validate(a) for a in alerts]


@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> AlertResponse:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved = True
    await db.flush()
    await db.refresh(alert)
    return AlertResponse.model_validate(alert)
