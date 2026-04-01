# MCP-Guard 🛡️

**MCP 安全审计平台 — AI Agent 生态的杀毒软件**

持续监控 MCP 工具的代码/manifest 变更，异常告警 + 信誉评分。

## 架构

```
┌─────────────┐    ┌──────────────┐    ┌─────────────────┐
│  Next.js    │───▶│  FastAPI     │───▶│  PostgreSQL     │
│  Dashboard  │    │  Backend     │    │  Database       │
└─────────────┘    └──────┬───────┘    └─────────────────┘
                          │
                   ┌──────┴───────┐
                   │  Scanner     │
                   │  (GH Actions)│
                   └──────────────┘
```

## 功能

- 🔍 **MCP 工具监控** — manifest/代码 hash 变更检测与告警
- 📊 **信誉评分 API** — 基于篡改历史的工具信任评分 (0-100)
- 🖥️ **安全 Dashboard** — 公开工具安全评级、搜索、详情

## 快速启动

```bash
# 克隆项目
git clone https://github.com/sunh3997-eng/MCP-Guard.git
cd MCP-Guard

# 复制配置
cp .env.example .env

# 一键启动
docker-compose up -d

# 访问
# Dashboard: http://localhost:3000
# API: http://localhost:8000/docs
```

## API 文档

### GET /api/v1/tools
列出所有已扫描工具及其安全评级。

### GET /api/v1/tools/{tool_id}/score
获取工具信誉评分。

返回:
```json
{
  "tool_id": "example-mcp-tool",
  "score": 85,
  "risk_level": "low",
  "last_scan": "2026-04-01T08:00:00Z",
  "issues": []
}
```

### GET /api/v1/alerts
获取最近的变更告警。

### POST /api/v1/scan
手动触发扫描。

## 技术栈

- **后端**: Python 3.11+ / FastAPI / SQLAlchemy / Alembic
- **前端**: Next.js 14 / TypeScript / Tailwind CSS / Recharts
- **数据库**: PostgreSQL 15
- **扫描**: GitHub Actions + Python 脚本
- **部署**: Docker Compose

## 商业模式

| 层级 | 价格 | 功能 |
|------|------|------|
| Free | $0 | 公开工具扫描、Dashboard |
| Pro | $49/月 | 私有工具 + API 调用 + Slack 告警 |
| Enterprise | 定制 | 私有部署 + 合规报告 |

## License

MIT
