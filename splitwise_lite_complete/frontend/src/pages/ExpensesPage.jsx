import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const CATEGORIES = [
  "Food & Dining", "Transport", "Housing", "Utilities",
  "Entertainment", "Healthcare", "Shopping", "Travel", "Other"
];

const CAT_COLORS = {
  "Food & Dining": "#f97316", "Transport": "#3b82f6", "Housing": "#8b5cf6",
  "Utilities": "#06b6d4", "Entertainment": "#ec4899", "Healthcare": "#10b981",
  "Shopping": "#f59e0b", "Travel": "#6366f1", "Other": "#6b7280"
};

function ExpenseModal({ expense, onSave, onClose }) {
  const [form, setForm] = useState(expense || {
    title: "", amount: "", category: "Food & Dining", date: new Date().toISOString().split("T")[0], notes: ""
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (expense) {
        await api.updateExpense(expense.id, payload);
      } else {
        await api.createExpense(payload);
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 480, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>{expense ? "Edit Expense" : "Add Expense"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Lunch at cafe" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="Any extra details…" value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: "center" }}>
              {saving ? "Saving…" : expense ? "Save Changes" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "add" | expense object
  const [filters, setFilters] = useState({ category: "", start: "", end: "" });
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.start) params.start = filters.start;
    if (filters.end) params.end = filters.end;
    const [exp, sum] = await Promise.all([api.getExpenses(params), api.getExpenseSummary()]);
    setExpenses(exp);
    setSummary(sum);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters]);

  const handleDelete = async (id) => {
    try {
      await api.deleteExpense(id);
      setDeleteId(null);
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      {modal && (
        <ExpenseModal
          expense={modal === "add" ? null : modal}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>My Expenses</h2>
        <button className="btn btn-primary" onClick={() => setModal("add")}>+ Add Expense</button>
      </div>

      {summary && (
        <div className="card" style={{ marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>This Month</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-light)" }}>₹{summary.total_this_month?.toFixed(2) || "0.00"}</div>
          </div>
          <div style={{ height: 40, width: 1, background: "var(--border)" }} />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(summary.by_category || {}).map(([cat, amt]) => (
              <div key={cat} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "var(--surface2)", borderRadius: 8, padding: "4px 10px"
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[cat] || "#888" }} />
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{cat}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>₹{amt.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select className="input" style={{ width: "auto", minWidth: 160 }}
          value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <input className="input" type="date" style={{ width: "auto" }}
          value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} />
        <span style={{ color: "var(--text-muted)", alignSelf: "center" }}>to</span>
        <input className="input" type="date" style={{ width: "auto" }}
          value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} />
        {(filters.category || filters.start || filters.end) && (
          <button className="btn btn-ghost" onClick={() => setFilters({ category: "", start: "", end: "" })}>Clear</button>
        )}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "20px 0" }}>Loading…</div>
      ) : expenses.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <p>No expenses yet. Add your first one!</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {expenses.map((e, i) => (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
              borderBottom: i < expenses.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: CAT_COLORS[e.category] || "#888"
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {e.category} · {e.date}
                  {e.notes && <span> · {e.notes}</span>}
                </div>
              </div>
              <div style={{ fontFamily: "DM Mono, monospace", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>
                ₹{parseFloat(e.amount).toFixed(2)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 13 }} onClick={() => setModal(e)}>Edit</button>
                {deleteId === e.id ? (
                  <>
                    <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 13 }} onClick={() => handleDelete(e.id)}>Confirm</button>
                    <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 13 }} onClick={() => setDeleteId(null)}>Cancel</button>
                  </>
                ) : (
                  <button className="btn btn-ghost" style={{ padding: "5px 10px", fontSize: 13, color: "var(--red)" }} onClick={() => setDeleteId(e.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
