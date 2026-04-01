#!/usr/bin/env python3
"""MCP Tool Scanner — CLI for GitHub Actions.

Usage:
  python scan.py --api-url http://localhost:8000 --repos repos.txt
  python scan.py --api-url http://localhost:8000 --repo https://github.com/owner/tool
"""

import argparse
import json
import sys
import urllib.request


def scan_repo(api_url: str, repo_url: str, tool_name: str = None) -> dict:
    """Trigger a scan via the MCP-Guard API."""
    payload = {"repo_url": repo_url}
    if tool_name:
        payload["tool_name"] = tool_name

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{api_url}/api/v1/scan",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except Exception as e:
        return {"error": str(e), "repo_url": repo_url}


def main():
    parser = argparse.ArgumentParser(description="MCP-Guard Scanner CLI")
    parser.add_argument("--api-url", default="http://localhost:8000", help="MCP-Guard API URL")
    parser.add_argument("--repo", help="Single repo URL to scan")
    parser.add_argument("--repos", help="File with repo URLs (one per line)")
    args = parser.parse_args()

    repos = []
    if args.repo:
        repos.append(args.repo)
    if args.repos:
        with open(args.repos) as f:
            repos.extend(line.strip() for line in f if line.strip() and not line.startswith("#"))

    if not repos:
        print("No repos to scan. Use --repo or --repos.")
        sys.exit(1)

    results = []
    for repo_url in repos:
        print(f"Scanning {repo_url}...")
        result = scan_repo(args.api_url, repo_url)
        results.append(result)
        if "error" in result:
            print(f"  ❌ Error: {result['error']}")
        else:
            status = "⚠️ CHANGES" if result.get("changes_detected") else "✅ OK"
            print(f"  {status} — {result.get('tool_id')} (score: {result.get('details', {}).get('score', '?')})")

    # Summary
    total = len(results)
    changed = sum(1 for r in results if r.get("changes_detected"))
    errors = sum(1 for r in results if "error" in r)
    print(f"\n📊 Summary: {total} scanned, {changed} changed, {errors} errors")

    if changed > 0:
        sys.exit(2)  # Non-zero to signal changes in CI


if __name__ == "__main__":
    main()
