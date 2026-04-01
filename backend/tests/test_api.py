"""Tests for API endpoints (using TestClient with SQLite)."""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import MCPTool, RiskLevel

# Use in-memory SQLite for tests
SQLALCHEMY_TEST_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_stats_empty():
    resp = client.get("/api/v1/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_tools"] == 0


def test_list_tools_empty():
    resp = client.get("/api/v1/tools")
    assert resp.status_code == 200
    assert resp.json() == []


def test_tool_not_found():
    resp = client.get("/api/v1/tools/nonexistent")
    assert resp.status_code == 404


def test_tool_score_not_found():
    resp = client.get("/api/v1/tools/nonexistent/score")
    assert resp.status_code == 404


def test_create_tool_via_scan():
    """Scan a known repo to create a tool entry."""
    with patch("app.scanner.fetch_file_content", return_value=b'{"name":"test"}'):
        resp = client.post("/api/v1/scan", json={
            "repo_url": "https://github.com/test/my-mcp-tool",
            "tool_name": "my-mcp-tool"
        })
    assert resp.status_code == 200
    data = resp.json()
    assert data["tool_id"] == "my-mcp-tool"
    assert data["status"] == "scanned"

    # Now verify tool exists
    resp = client.get("/api/v1/tools/my-mcp-tool")
    assert resp.status_code == 200
    assert resp.json()["name"] == "my-mcp-tool"

    # Check score endpoint
    resp = client.get("/api/v1/tools/my-mcp-tool/score")
    assert resp.status_code == 200
    assert resp.json()["score"] > 0
