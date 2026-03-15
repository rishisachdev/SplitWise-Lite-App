import React, { useEffect, useState } from "react";
import { api } from "../api/client";

function CreateGroupModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [emails, setEmails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const member_emails = emails.split(",").map(e => e.trim()).filter(Boolean);
      await api.createGroup({ name, member_emails });
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
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18 }}>Create Group</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Group Name</label>
            <input className="input" placeholder="e.g. Apartment, Trip to Vegas"
              value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="label">Add Members by Email (comma-separated)</label>
            <input className="input" placeholder="alice@example.com, bob@example.com"
              value={emails} onChange={(e) => setEmails(e.target.value)} />
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              Members must already have an account. You're added automatically.
            </p>
          </div>
          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: "center" }}>
              {saving ? "Creating…" : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GroupsPage({ onSelectGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listGroups();
      setGroups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      {showModal && (
        <CreateGroupModal
          onSave={() => { setShowModal(false); load(); }}
          onClose={() => setShowModal(false)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Groups</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Group</button>
      </div>

      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--text-muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ marginBottom: 16 }}>No groups yet. Create one to start splitting bills!</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create your first group</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map(group => (
            <div key={group.id} className="card"
              style={{ cursor: "pointer", transition: "border-color 0.15s" }}
              onClick={() => onSelectGroup(group.id)}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{group.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                    {group.member_count} member{group.member_count !== 1 ? "s" : ""}
                    {" · "}
                    {group.expense_count} expense{group.expense_count !== 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {group.balance_count === 0 ? (
                    <span style={{ color: "var(--green)", fontSize: 13, fontWeight: 600 }}>✓ All settled</span>
                  ) : (
                    <span style={{ color: "var(--yellow)", fontSize: 13, fontWeight: 600 }}>
                      {group.balance_count} pending
                    </span>
                  )}
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 2 }}>→ View</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
