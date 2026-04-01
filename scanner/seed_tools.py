#!/usr/bin/env python3
"""MCP-Guard Seed Script - registers all tools from tools.json to the API.

Run this once during initial setup to populate the tool registry before
running the scanner for the first time.

Usage:
    python scanner/seed_tools.py
"""

import json
import os
import sys
import logging
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("mcp-guard-seed")

TOOLS_CONFIG_PATH = Path(__file__).parent / "tools.json"
API_URL = os.environ.get("API_URL", "http://localhost:8000").rstrip("/")
REQUEST_TIMEOUT = 30.0


def register_tool(client: httpx.Client, tool: dict, api_url: str) -> bool:
    """POST a single tool definition to /api/v1/tools.

    Returns True if the tool was registered (or already exists), False on error.
    """
    tool_id = tool.get("tool_id", "<unknown>")
    url = f"{api_url}/api/v1/tools"

    headers: dict[str, str] = {"Content-Type": "application/json"}
    api_key = os.environ.get("MCP_GUARD_API_KEY", "")
    if api_key:
        headers["X-API-Key"] = api_key

    try:
        response = client.post(url, json=tool, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code == 409:
            log.info("[%s] Tool already registered (409 Conflict) — skipping.", tool_id)
            return True

        response.raise_for_status()
        result = response.json()
        log.info(
            "[%s] Registered successfully. ID: %s",
            tool_id,
            result.get("id", "N/A"),
        )
        return True

    except httpx.HTTPStatusError as exc:
        log.error(
            "[%s] API error %s: %s",
            tool_id,
            exc.response.status_code,
            exc.response.text[:200],
        )
        return False
    except httpx.RequestError as exc:
        log.error("[%s] Cannot reach API at %s: %s", tool_id, url, exc)
        return False


def main() -> int:
    log.info("MCP-Guard Seed Script")
    log.info("API URL: %s", API_URL)

    if not TOOLS_CONFIG_PATH.exists():
        log.error("tools.json not found at %s", TOOLS_CONFIG_PATH)
        return 1

    with open(TOOLS_CONFIG_PATH) as fh:
        tools: list[dict] = json.load(fh)

    if not tools:
        log.warning("tools.json is empty — nothing to register.")
        return 0

    log.info("Found %d tool(s) to register.", len(tools))

    success = 0
    failure = 0

    with httpx.Client(follow_redirects=True) as client:
        # Verify API is reachable before processing all tools
        try:
            health_url = f"{API_URL}/health"
            resp = client.get(health_url, timeout=10.0)
            resp.raise_for_status()
            log.info("API health check passed (%s).", health_url)
        except (httpx.HTTPStatusError, httpx.RequestError) as exc:
            log.error(
                "API does not appear to be running at %s: %s\n"
                "Start the backend first (e.g. docker-compose up -d backend).",
                API_URL,
                exc,
            )
            return 1

        for i, tool in enumerate(tools, start=1):
            tool_id = tool.get("tool_id", f"tool-{i}")
            log.info("[%d/%d] Registering '%s'...", i, len(tools), tool_id)
            ok = register_tool(client, tool, API_URL)
            if ok:
                success += 1
            else:
                failure += 1

    log.info("Done. %d registered, %d failed.", success, failure)
    return 0 if failure == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
