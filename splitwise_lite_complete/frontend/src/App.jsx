import React, { useState, useEffect } from "react";
import { setUnauthorizedHandler } from "./api/client";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ExpensesPage from "./pages/ExpensesPage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "▦ " },
  { id: "expenses",  label: "Expenses",  icon: "💳" },
  { id: "groups",    label: "Groups",    icon: "👥" },
];

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));
  const [page, setPage] = useState("dashboard");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setAuthed(false);
    setPage("dashboard");
  };

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
  }, []);

  const handleSelectGroup = (id) => {
    setSelectedGroupId(id);
    setPage("group-detail");
  };

  if (!authed) return <AuthPage onLogin={() => setAuthed(true)} />;

  const renderPage = () => {
    if (page === "group-detail" && selectedGroupId) {
      return (
        <GroupDetailPage
          groupId={selectedGroupId}
          onBack={() => { setPage("groups"); setSelectedGroupId(null); }}
        />
      );
    }
    switch (page) {
      case "dashboard": return <DashboardPage />;
      case "expenses":  return <ExpensesPage />;
      case "groups":    return <GroupsPage onSelectGroup={handleSelectGroup} />;
      default:          return <DashboardPage />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34,
              background: "var(--accent)",
              borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 0 16px rgba(124,110,242,0.35)",
            }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>SplitWise</div>
              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Lite</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 10px" }}>
          {NAV.map(n => {
            const active = page === n.id || (page === "group-detail" && n.id === "groups");
            return (
              <button key={n.id} onClick={() => { setPage(n.id); setSelectedGroupId(null); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  marginBottom: 2,
                  background: active ? "var(--accent-dim)" : "transparent",
                  color: active ? "var(--accent-light)" : "var(--text-muted)",
                  transition: "all 0.12s",
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--surface2)"; e.currentTarget.style.color = "var(--text)"; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}}
              >
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {n.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "16px 10px", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-ghost" onClick={handleLogout}
            style={{ width: "100%", justifyContent: "center", fontSize: 13 }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        flex: 1,
        padding: "36px 40px",
        maxWidth: 900,
        overflowY: "auto",
      }}>
        {renderPage()}
      </main>
    </div>
  );
}
