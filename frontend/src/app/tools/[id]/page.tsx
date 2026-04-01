"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ToolDetail {
  id: string;
  name: string;
  author: string | null;
  score: number;
  risk_level: string;
  tampering_count: number;
  total_scans: number;
  last_scan: string | null;
  first_seen: string | null;
  description: string | null;
  repo_url: string | null;
  manifest_hash: string | null;
  code_hash: string | null;
  alerts: Array<{
    id: number;
    change_type: string;
    severity: string;
    description: string;
    created_at: string;
  }>;
  scan_history: Array<{
    id: number;
    score: number;
    risk_level: string | null;
    scanned_at: string;
  }>;
}

const riskBadge: Record<string, string> = {
  safe: "text-green-400 bg-green-400/10 border-green-400/30",
  low: "text-lime-400 bg-lime-400/10 border-lime-400/30",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  high: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  critical: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function ToolDetailPage() {
  const params = useParams();
  const [tool, setTool] = useState<ToolDetail | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/tools/${params.id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then(setTool)
      .catch(() => setError(true));
  }, [params.id]);

  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <a href="/" className="text-blue-400 hover:underline mb-4 inline-block">← Back</a>
        <div className="text-center py-20 text-gray-400">Tool not found.</div>
      </main>
    );
  }

  if (!tool) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-gray-400">Loading...</div>
      </main>
    );
  }

  const chartData = tool.scan_history.map((s) => ({
    date: new Date(s.scanned_at).toLocaleDateString(),
    score: s.score,
  }));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <a href="/" className="text-blue-400 hover:underline mb-4 inline-block">← Back to Dashboard</a>

      {/* Header */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <p className="text-gray-400 text-sm">{tool.author || "Unknown author"}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{tool.score}</div>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${riskBadge[tool.risk_level]}`}>
              {tool.risk_level.toUpperCase()}
            </span>
          </div>
        </div>
        {tool.description && <p className="text-gray-300 mb-4">{tool.description}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Scans</span>
            <div className="font-medium">{tool.total_scans}</div>
          </div>
          <div>
            <span className="text-gray-400">Tampering Events</span>
            <div className="font-medium text-orange-400">{tool.tampering_count}</div>
          </div>
          <div>
            <span className="text-gray-400">First Seen</span>
            <div className="font-medium">{tool.first_seen ? new Date(tool.first_seen).toLocaleDateString() : "—"}</div>
          </div>
          <div>
            <span className="text-gray-400">Last Scan</span>
            <div className="font-medium">{tool.last_scan ? new Date(tool.last_scan).toLocaleDateString() : "—"}</div>
          </div>
        </div>
        {tool.repo_url && (
          <a href={tool.repo_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
            🔗 {tool.repo_url}
          </a>
        )}
      </div>

      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Score Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" fontSize={12} />
              <YAxis domain={[0, 100]} stroke="#666" fontSize={12} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: "8px" }}
              />
              <Line type="monotone" dataKey="score" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Hashes */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Current Hashes</h2>
        <div className="space-y-2 text-sm font-mono">
          <div>
            <span className="text-gray-400">Manifest: </span>
            <span className="text-gray-200">{tool.manifest_hash || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-400">Code: </span>
            <span className="text-gray-200">{tool.code_hash || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Alerts ({tool.alerts.length})</h2>
        {tool.alerts.length === 0 ? (
          <p className="text-gray-400">No alerts — this tool has a clean history.</p>
        ) : (
          <div className="space-y-3">
            {tool.alerts.map((alert) => (
              <div key={alert.id} className="border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs border ${riskBadge[alert.severity]}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm font-medium mt-1">{alert.change_type.replace(/_/g, " ")}</div>
                {alert.description && <div className="text-gray-400 text-sm mt-1">{alert.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
