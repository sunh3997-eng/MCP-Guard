"""MCP Tool Trust Scoring Algorithm.

Score range: 0-100
- 100: pristine, no issues
- 80+: low risk
- 60-79: medium risk
- 40-59: high risk
- <40: critical risk
"""

from .models import MCPTool, RiskLevel


def calculate_score(tool: MCPTool) -> tuple[float, RiskLevel]:
    """Calculate trust score for an MCP tool based on multiple signals."""
    score = 100.0

    # Tampering penalty: -15 per tampering event, max -60
    tampering_penalty = min(tool.tampering_count * 15, 60)
    score -= tampering_penalty

    # Low scan count penalty (less data = less trust)
    if tool.total_scans < 5:
        score -= 10
    elif tool.total_scans < 10:
        score -= 5

    # No author info penalty
    if not tool.author:
        score -= 10

    # No repo URL penalty (can't verify source)
    if not tool.repo_url:
        score -= 15

    # Clamp to 0-100
    score = max(0.0, min(100.0, score))

    # Determine risk level
    if score >= 80:
        risk_level = RiskLevel.safe if score >= 90 else RiskLevel.low
    elif score >= 60:
        risk_level = RiskLevel.medium
    elif score >= 40:
        risk_level = RiskLevel.high
    else:
        risk_level = RiskLevel.critical

    return round(score, 1), risk_level
