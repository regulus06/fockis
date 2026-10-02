import { useEffect, useState } from "react";
import { aiAdminApi } from "../api/aiAdminApi";
import type { AiUserAccess } from "../types/aiAdmin.types";
import AiUserAccessPanel from "../components/AiUserAccessPanel";
import "../styles/AiAdmin.scss";

const demoUsers: AiUserAccess[] = [
  { userId:"u1", userName:"John Doe", email:"john@example.com", plan:"Free", mode:"granted", permissions:{chat:true,voice:true,phoneCalls:false,recommendations:true,specialAds:false}, expiresAt:null, reason:"Beta tester" },
  { userId:"u2", userName:"Sarah Smith", email:"sarah@example.com", plan:"Pro", mode:"inherit", permissions:{chat:true,voice:true,phoneCalls:false,recommendations:true,specialAds:true}, expiresAt:null },
  { userId:"u3", userName:"Mike Brown", email:"mike@example.com", plan:"Premium", mode:"blocked", permissions:{chat:false,voice:false,phoneCalls:false,recommendations:false,specialAds:false}, expiresAt:null, reason:"Admin restriction" },
];

export default function AiUsersPage() {
  const [users, setUsers] = useState<AiUserAccess[]>(demoUsers);
  const [selected, setSelected] = useState<AiUserAccess | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => { aiAdminApi.getUsers().then(setUsers).catch(() => {}); }, []);

  const filtered = users.filter((u) =>
    `${u.userName} ${u.email} ${u.plan}`.toLowerCase().includes(query.toLowerCase())
  );

  const save = async (user: AiUserAccess) => {
    try {
      const saved = await aiAdminApi.updateUserAccess(user.userId, user);
      setUsers((items) => items.map((item) => item.userId === saved.userId ? saved : item));
    } catch {
      setUsers((items) => items.map((item) => item.userId === user.userId ? user : item));
    }
    setSelected(null);
  };

  return (
    <div className="ai-admin-page">
      <header className="ai-page-header">
        <div>
          <span className="ai-eyebrow">Individual overrides</span>
          <h1>User AI Access</h1>
          <p>Grant, customize or block AI features for individual users.</p>
        </div>
      </header>

      <section className="ai-toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search user, email or plan..." />
      </section>

      <section className="ai-panel">
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead><tr><th>User</th><th>Plan</th><th>Mode</th><th>Chat</th><th>Voice</th><th>Calls</th><th>Expires</th><th /></tr></thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.userId}>
                  <td><strong>{user.userName}</strong><small>{user.email}</small></td>
                  <td>{user.plan}</td>
                  <td><span className={`ai-mode ai-mode-${user.mode}`}>{user.mode}</span></td>
                  <td>{user.permissions.chat ? "ON" : "OFF"}</td>
                  <td>{user.permissions.voice ? "ON" : "OFF"}</td>
                  <td>{user.permissions.phoneCalls ? "ON" : "OFF"}</td>
                  <td>{user.expiresAt ? new Date(user.expiresAt).toLocaleDateString() : "Never"}</td>
                  <td><button className="ai-btn ai-btn-ghost" onClick={() => setSelected(user)}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AiUserAccessPanel user={selected} onClose={() => setSelected(null)} onSave={save} />
    </div>
  );
}
