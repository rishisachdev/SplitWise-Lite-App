import React, { useEffect, useState } from "react";
import { api } from "../api/client";

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color || "var(--text)" }}>
        ₹{typeof value === "number" ? value.toFixed(2) : "—"}
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading dashboard…</div>;
  if (error) return <div style={{ padding: 40 }} className="error-msg">{error}</div>;

  const activityIcon = {
    personal_expense: "💳",
    group_expense: "👥",
    settlement: "✅",
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Dashboard</h2>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <StatCard
          icon="📊"
          label="Personal spend this month"
          value={data.personal_spend_this_month}
          color="var(--accent-light)"
        />
        <StatCard
          icon="📤"
          label="You owe (across groups)"
          value={data.you_owe}
          color={data.you_owe > 0 ? "var(--red)" : "var(--text-muted)"}
        />
        <StatCard
          icon="📥"
          label="Owed to you"
          value={data.owed_to_you}
          color={data.owed_to_you > 0 ? "var(--green)" : "var(--text-muted)"}
        />
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Recent Activity</h3>
        {data.recent_activity.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No recent activity yet. Start by adding an expense!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.recent_activity.map((item, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 0",
                borderBottom: i < data.recent_activity.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontSize: 20 }}>{activityIcon[item.type] || "📌"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>{item.description}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                }}>
                  ₹{item.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
