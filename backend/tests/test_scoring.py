"""Tests for the scoring algorithm."""

import pytest
from unittest.mock import MagicMock
from app.scoring import calculate_score
from app.models import RiskLevel


def _make_tool(**kwargs):
    tool = MagicMock()
    tool.tampering_count = kwargs.get("tampering_count", 0)
    tool.total_scans = kwargs.get("total_scans", 20)
    tool.author = kwargs.get("author", "test-author")
    tool.repo_url = kwargs.get("repo_url", "https://github.com/test/repo")
    return tool


def test_pristine_tool():
    tool = _make_tool()
    score, risk = calculate_score(tool)
    assert score == 100.0
    assert risk == RiskLevel.safe


def test_one_tampering():
    tool = _make_tool(tampering_count=1)
    score, risk = calculate_score(tool)
    assert score == 85.0
    assert risk == RiskLevel.low


def test_many_tamperings():
    tool = _make_tool(tampering_count=5)
    score, risk = calculate_score(tool)
    assert score == 25.0
    assert risk == RiskLevel.critical


def test_no_author():
    tool = _make_tool(author=None)
    score, risk = calculate_score(tool)
    assert score == 90.0
    assert risk == RiskLevel.safe


def test_no_repo():
    tool = _make_tool(repo_url=None)
    score, risk = calculate_score(tool)
    assert score == 85.0
    assert risk == RiskLevel.low


def test_low_scan_count():
    tool = _make_tool(total_scans=3)
    score, risk = calculate_score(tool)
    assert score == 90.0
    assert risk == RiskLevel.safe


def test_worst_case():
    tool = _make_tool(tampering_count=10, total_scans=1, author=None, repo_url=None)
    score, risk = calculate_score(tool)
    assert score == 5.0
    assert risk == RiskLevel.critical
