"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Stats {
  total_tools: number;
  total_alerts: number;
  critical_tools: number;
  average_score: number;
}

interface Tool {
  id: string;
  name: string;
  author: string | null;
  score: number;
  risk_level: string;
  tampering_count: number;
  last_scan: string | null;
  description: string | null;
}

const riskColor: Record<string, string> = {
  safe: "bg-guard-safe",
  low: "bg-guard-low",
  medium: "bg-guard-medium",
  high: "bg-guard-high",
  critical: "bg-guard-critical",
};

const riskBadge: Record<string, string> = {
  safe: "text-green-400 bg-green-400/10 border-green-400/30",
  low: "text-lime-400 bg-lime-400/10 border-lime-400/30",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
};

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${accent || "text-white"}`}>{value}</div>
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/v1/stats`).then((r) => r.json()).catch(() => null),
      fetch(`${API}/api/v1/tools?limit=100`).then((r) => r.json()).catch(() => []),
    ]).then(([s, t]) => {
      setStats(s);
      setTools(t);
      setLoading(false);
    });
  }, []);

  const filtered = tools.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.author || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="text-4xl">🛡️</div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            MCP-Guard
          </h1>
          <p className="text-gray-400 text-sm">MCP Security Audit Platform</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Tools" value={stats.total_tools} />
          <StatCard label="Alerts" value={stats.total_alerts} accent="text-yellow-400" />
          <StatCard label="At Risk" value={stats.critical_tools} accent="text-red-400" />
          <StatCard label="Avg Score" value={stats.average_score.toFixed(1)} accent="text-green-400" />
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search tools by name or author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
        />
      </div>

      {/* Tools Table */}
      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-400">
            {tools.length === 0
              ? "No tools scanned yet. Use POST /api/v1/scan to add tools."
              : "No tools match your search."}
          </p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="px-6 py-4">Tool</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">Tampering</th>
                <th className="px-6 py-4">Last Scan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tool) => (
                <tr
                  key={tool.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => (window.location.href = `/tools/${tool.id}`)}
                >
                  <td className="px-6 py-4 font-medium">{tool.name}</td>
                  <td className="px-6 py-4 text-gray-400">{tool.author || "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${riskColor[tool.risk_level]}`}
                          style={{ width: `${tool.score}%` }}
                        />
                      </div>
                      <span className="text-sm">{tool.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium border ${riskBadge[tool.risk_level]}`}
                    >
                      {tool.risk_level.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{tool.tampering_count}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {tool.last_scan
                      ? new Date(tool.last_scan).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
