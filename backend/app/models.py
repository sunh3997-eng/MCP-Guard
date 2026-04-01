from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from .database import Base


class RiskLevel(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    safe = "safe"


class ChangeType(str, enum.Enum):
    manifest_modified = "manifest_modified"
    code_modified = "code_modified"
    permissions_changed = "permissions_changed"
    new_version = "new_version"
    author_changed = "author_changed"


class MCPTool(Base):
    __tablename__ = "mcp_tools"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False, index=True)
    author = Column(String, nullable=True)
    repo_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    manifest_hash = Column(String, nullable=True)
    code_hash = Column(String, nullable=True)
    version = Column(String, nullable=True)
    score = Column(Float, default=100.0)
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.safe)
    total_scans = Column(Integer, default=0)
    tampering_count = Column(Integer, default=0)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_scan = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    alerts = relationship("Alert", back_populates="tool", cascade="all, delete-orphan")
    scan_history = relationship("ScanRecord", back_populates="tool", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tool_id = Column(String, ForeignKey("mcp_tools.id"), nullable=False, index=True)
    change_type = Column(SQLEnum(ChangeType), nullable=False)
    severity = Column(SQLEnum(RiskLevel), default=RiskLevel.medium)
    description = Column(Text, nullable=True)
    old_hash = Column(String, nullable=True)
    new_hash = Column(String, nullable=True)
    resolved = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    tool = relationship("MCPTool", back_populates="alerts")


class ScanRecord(Base):
    __tablename__ = "scan_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tool_id = Column(String, ForeignKey("mcp_tools.id"), nullable=False, index=True)
    manifest_hash = Column(String, nullable=True)
    code_hash = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    risk_level = Column(SQLEnum(RiskLevel), nullable=True)
    scanned_at = Column(DateTime, default=datetime.utcnow)

    tool = relationship("MCPTool", back_populates="scan_history")
