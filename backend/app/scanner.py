"""MCP Tool Scanner — fetches and hashes tool manifests/code."""

import hashlib
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from .models import MCPTool, Alert, ScanRecord, ChangeType, RiskLevel
from .scoring import calculate_score


async def fetch_file_content(url: str, github_token: Optional[str] = None) -> Optional[bytes]:
    """Fetch raw file content from a URL (typically GitHub raw)."""
    headers = {}
    if github_token:
        headers["Authorization"] = f"token {github_token}"
    
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.get(url, headers=headers, follow_redirects=True)
            if resp.status_code == 200:
                return resp.content
        except httpx.RequestError:
            pass
    return None


def compute_hash(content: bytes) -> str:
    """Compute SHA-256 hash of content."""
    return hashlib.sha256(content).hexdigest()


async def scan_tool(
    db: Session,
    repo_url: str,
    tool_name: Optional[str] = None,
    github_token: Optional[str] = None,
) -> dict:
    """Scan an MCP tool repository for changes.
    
    1. Fetch manifest.json and key source files
    2. Compute hashes
    3. Compare with stored hashes
    4. Generate alerts if changed
    5. Update score
    """
    # Derive raw URLs from GitHub repo
    # e.g., https://github.com/owner/repo -> raw URLs
    raw_base = repo_url.replace("github.com", "raw.githubusercontent.com")
    if raw_base.endswith("/"):
        raw_base = raw_base[:-1]
    raw_base += "/main"

    manifest_url = f"{raw_base}/manifest.json"
    package_url = f"{raw_base}/package.json"

    # Fetch manifest
    manifest_content = await fetch_file_content(manifest_url, github_token)
    manifest_hash = compute_hash(manifest_content) if manifest_content else None

    # Fetch package.json as proxy for code hash
    pkg_content = await fetch_file_content(package_url, github_token)
    code_hash = compute_hash(pkg_content) if pkg_content else None

    # Tool ID from repo URL
    tool_id = repo_url.rstrip("/").split("/")[-1].lower()
    if not tool_name:
        tool_name = tool_id

    # Check existing tool
    tool = db.query(MCPTool).filter(MCPTool.id == tool_id).first()
    changes = []

    if tool is None:
        # New tool
        tool = MCPTool(
            id=tool_id,
            name=tool_name,
            repo_url=repo_url,
            manifest_hash=manifest_hash,
            code_hash=code_hash,
            total_scans=1,
            last_scan=datetime.utcnow(),
        )
        score, risk = calculate_score(tool)
        tool.score = score
        tool.risk_level = risk
        db.add(tool)
    else:
        # Existing tool — check for changes
        tool.total_scans += 1
        tool.last_scan = datetime.utcnow()

        if manifest_hash and tool.manifest_hash and manifest_hash != tool.manifest_hash:
            alert = Alert(
                tool_id=tool.id,
                change_type=ChangeType.manifest_modified,
                severity=RiskLevel.high,
                description=f"Manifest hash changed from {tool.manifest_hash[:12]}... to {manifest_hash[:12]}...",
                old_hash=tool.manifest_hash,
                new_hash=manifest_hash,
            )
            db.add(alert)
            tool.tampering_count += 1
            tool.manifest_hash = manifest_hash
            changes.append("manifest_modified")

        if code_hash and tool.code_hash and code_hash != tool.code_hash:
            alert = Alert(
                tool_id=tool.id,
                change_type=ChangeType.code_modified,
                severity=RiskLevel.medium,
                description=f"Code hash changed from {tool.code_hash[:12]}... to {code_hash[:12]}...",
                old_hash=tool.code_hash,
                new_hash=code_hash,
            )
            db.add(alert)
            tool.tampering_count += 1
            tool.code_hash = code_hash
            changes.append("code_modified")

        # Recalculate score
        score, risk = calculate_score(tool)
        tool.score = score
        tool.risk_level = risk

    # Record scan
    record = ScanRecord(
        tool_id=tool.id,
        manifest_hash=manifest_hash,
        code_hash=code_hash,
        score=tool.score,
        risk_level=tool.risk_level,
    )
    db.add(record)
    db.commit()
    db.refresh(tool)

    return {
        "tool_id": tool.id,
        "status": "scanned",
        "changes_detected": len(changes) > 0,
        "details": {
            "changes": changes,
            "score": tool.score,
            "risk_level": tool.risk_level.value,
            "manifest_hash": manifest_hash,
            "code_hash": code_hash,
        },
    }
