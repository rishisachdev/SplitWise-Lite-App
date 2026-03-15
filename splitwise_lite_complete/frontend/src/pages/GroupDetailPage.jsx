import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

function AddExpenseModal({ group, onSave, onClose }) {
  const [form, setForm] = useState({ title: "", total_amount: "", split_type: "equal", paid_by: "" });
  const [splits, setSplits] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (group.members.length > 0) {
      setForm(f => ({ ...f, paid_by: String(group.members[0].id) }));
      setSplits(group.members.map(m => ({ user_id: m.id, amount: "" })));
    }
  }, [group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        total_amount: parseFloat(form.total_amount),
        split_type: form.split_type,
        paid_by: parseInt(form.paid_by),
      };
      if (form.split_type === "exact") {
        payload.splits = splits
          .filter(s => s.amount !== "" && parseFloat(s.amount) > 0)
          .map(s => ({ user_id: s.user_id, amount: parseFloat(s.amount) }));
      }
      await api.addGroupExpense(group.id, payload);
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20, overflowY: "auto",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 500, padding: 28, margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Add Group Expense</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Dinner, Airbnb" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Total Amount (₹)</label>
              <input className="input" type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Paid By</label>
              <select className="input" value={form.paid_by} onChange={(e) => setForm({ ...form, paid_by: e.target.value })}>
                {group.members.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.email}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Split Type</label>
            <div style={{ display: "flex", gap: 10 }}>
              {["equal", "exact"].map(t => (
                <button type="button" key={t} onClick={() => setForm({ ...form, split_type: t })}
                  style={{
                    flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
                    border: form.split_type === t ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: form.split_type === t ? "var(--accent-dim)" : "transparent",
                    color: form.split_type === t ? "var(--accent-light)" : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}>
                  {t === "equal" ? "⚖️ Equal Split" : "✏️ Exact Amounts"}
                </button>
              ))}
            </div>
          </div>

          {form.split_type === "exact" && (
            <div style={{ marginBottom: 16 }}>
              <label className="label">Amounts per member</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {splits.map((s, i) => {
                  const member = group.members.find(m => m.id === s.user_id);
                  return (
                    <div key={s.user_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 140, fontSize: 14, color: "var(--text-muted)", flexShrink: 0 }}>
                        {member?.name || member?.email}
                      </span>
                      <input className="input" type="number" step="0.01" min="0" placeholder="0.00"
                        value={s.amount}
                        onChange={(e) => {
                          const updated = [...splits];
                          updated[i] = { ...s, amount: e.target.value };
                          setSplits(updated);
                        }} />
                    </div>
                  );
                })}
                {form.total_amount && (
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                    Entered: ${splits.reduce((a, s) => a + (parseFloat(s.amount) || 0), 0).toFixed(2)} / ${parseFloat(form.total_amount || 0).toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: "center" }}>
              {saving ? "Saving…" : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettleModal({ group, balances, currentUserId, onSave, onClose }) {
  const myDebts = balances.filter(b => b.from_user === currentUserId);
  const [selected, setSelected] = useState(myDebts[0] || null);
  const [amount, setAmount] = useState(myDebts[0] ? myDebts[0].amount.toFixed(2) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setSaving(true);
    try {
      await api.settleUp(group.id, { paid_to: selected.to_user, amount: parseFloat(amount) });
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getMemberName = (id) => {
    const m = group.members.find(m => m.id === id);
    return m?.name || m?.email || `User ${id}`;
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: 20,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card" style={{ width: "100%", maxWidth: 420, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Settle Up</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        {myDebts.length === 0 ? (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <p>You don't owe anyone in this group!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">You're paying</label>
              {myDebts.map(b => (
                <div key={b.to_user}
                  onClick={() => { setSelected(b); setAmount(b.amount.toFixed(2)); }}
                  style={{
                    padding: "12px 14px", borderRadius: 8, cursor: "pointer",
                    border: selected?.to_user === b.to_user ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: selected?.to_user === b.to_user ? "var(--accent-dim)" : "var(--surface2)",
                    marginBottom: 8, transition: "all 0.15s",
                  }}>
                  <span style={{ fontWeight: 600 }}>{getMemberName(b.to_user)}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}> — you owe ₹{b.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {selected && (
              <div style={{ marginBottom: 20 }}>
                <label className="label">Amount ($)</label>
                <input className="input" type="number" step="0.01" min="0.01"
                  max={selected.amount} value={amount}
                  onChange={(e) => setAmount(e.target.value)} required />
              </div>
            )}
            {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !selected} style={{ flex: 1, justifyContent: "center" }}>
                {saving ? "Recording…" : "Record Payment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function GroupDetailPage({ groupId, onBack }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "expense" | "settle"
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserId(parseInt(payload.sub));
      } catch (e) {}
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const g = await api.getGroup(groupId);
      setGroup(g);
      const ids = JSON.parse(localStorage.getItem("group_ids") || "[]");
      if (!ids.includes(groupId)) {
        localStorage.setItem("group_ids", JSON.stringify([...ids, groupId]));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const getMemberName = (id) => {
    const m = group?.members.find(m => m.id === id);
    return m?.name || m?.email || `User ${id}`;
  };

  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading group…</div>;
  if (!group) return <div style={{ padding: 40 }} className="error-msg">Group not found.</div>;

  const myBalances = group.balances.filter(b => b.from_user === currentUserId || b.to_user === currentUserId);

  return (
    <div>
      {modal === "expense" && (
        <AddExpenseModal group={group} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      )}
      {modal === "settle" && (
        <SettleModal group={group} balances={group.balances} currentUserId={currentUserId}
          onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ padding: "7px 14px" }}>← Back</button>
        <h2 style={{ fontSize: 22, fontWeight: 700, flex: 1 }}>{group.name}</h2>
        <button className="btn btn-ghost" onClick={() => setModal("settle")}>💸 Settle Up</button>
        <button className="btn btn-primary" onClick={() => setModal("expense")}>+ Add Expense</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Members</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {group.members.map(m => (
            <span key={m.id} style={{
              background: m.id === currentUserId ? "var(--accent-dim)" : "var(--surface2)",
              color: m.id === currentUserId ? "var(--accent-light)" : "var(--text-muted)",
              borderRadius: 20, padding: "4px 12px", fontSize: 13, fontWeight: 600,
            }}>
              {m.name || m.email}{m.id === currentUserId ? " (you)" : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Balances</div>
        {group.balances.length === 0 ? (
          <p style={{ color: "var(--green)", fontWeight: 600 }}>✓ All settled up!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {group.balances.map((b, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", background: "var(--surface2)", borderRadius: 8,
              }}>
                <span style={{ fontWeight: 600, color: b.from_user === currentUserId ? "var(--red)" : "var(--text)" }}>
                  {getMemberName(b.from_user)}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 13 }}>owes</span>
                <span style={{ fontWeight: 600, color: b.to_user === currentUserId ? "var(--green)" : "var(--text)" }}>
                  {getMemberName(b.to_user)}
                </span>
                <span style={{ marginLeft: "auto", fontFamily: "DM Mono, monospace", fontWeight: 700, color: "var(--yellow)" }}>
                  ₹{b.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Expenses ({group.expenses.length})
        </div>
        {group.expenses.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
            No expenses yet. Add one to get started!
          </div>
        ) : (
          group.expenses.map((exp, i) => (
            <div key={exp.id} style={{
              padding: "14px 20px",
              borderBottom: i < group.expenses.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{exp.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                    Paid by <strong style={{ color: "var(--text)" }}>{exp.paid_by_name}</strong>
                    · <span style={{ textTransform: "capitalize" }}>{exp.split_type} split</span>
                    · {new Date(exp.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontFamily: "DM Mono, monospace", fontWeight: 700, fontSize: 16 }}>
                  ₹{exp.total_amount.toFixed(2)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {exp.splits.map(s => {
                  const isMe = s.user_id === currentUserId;
                  return (
                    <span key={s.user_id} style={{
                      fontSize: 12, padding: "2px 10px", borderRadius: 20,
                      background: isMe ? "rgba(248,113,113,0.12)" : "var(--surface2)",
                      color: isMe ? "var(--red)" : "var(--text-muted)",
                      fontWeight: isMe ? 700 : 400,
                    }}>
                      {getMemberName(s.user_id)}: ₹{s.amount_owed.toFixed(2)}
                    </span>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
