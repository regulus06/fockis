import { useEffect, useState } from "react";
import { aiAdminApi, type AiConversation } from "../api/aiAdminApi";
import "../styles/AiAdmin.scss";

const demo: AiConversation[] = [
  {id:"FC-829182",userName:"John Doe",type:"chat",status:"active",startedAt:"2026-09-24T02:00:00Z",durationSeconds:420,lastMessage:"Show me the second one."},
  {id:"FC-829183",userName:"Sarah Smith",type:"voice",status:"flagged",startedAt:"2026-09-24T01:20:00Z",durationSeconds:830,lastMessage:"Find me a cybersecurity internship."},
  {id:"FC-829184",userName:"Mike Brown",type:"phone",status:"blocked",startedAt:"2026-09-23T23:20:00Z",durationSeconds:210,lastMessage:"End the call."},
];

export default function AiConversationsPage() {
  const [items, setItems] = useState(demo);
  useEffect(() => { aiAdminApi.getConversations().then(setItems).catch(() => {}); }, []);

  const setStatus = async (id: string, status: AiConversation["status"]) => {
    try {
      const saved = await aiAdminApi.updateConversation(id, { status });
      setItems((all) => all.map((x) => x.id === saved.id ? saved : x));
    } catch {
      setItems((all) => all.map((x) => x.id === id ? { ...x, status } : x));
    }
  };

  return (
    <div className="ai-admin-page">
      <header className="ai-page-header"><div><span className="ai-eyebrow">Moderation</span><h1>AI Conversations</h1><p>Review and control Fockis AI chat, voice and phone sessions.</p></div></header>
      <section className="ai-panel">
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead><tr><th>Conversation</th><th>User</th><th>Type</th><th>Status</th><th>Started</th><th>Duration</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.id}</strong><small>{item.lastMessage}</small></td>
                  <td>{item.userName}</td><td>{item.type}</td>
                  <td><span className={`ai-mode ai-mode-${item.status}`}>{item.status}</span></td>
                  <td>{new Date(item.startedAt).toLocaleString()}</td>
                  <td>{Math.floor(item.durationSeconds / 60)}m</td>
                  <td className="ai-action-row">
                    {item.status !== "blocked" && <button className="ai-btn ai-btn-danger" onClick={() => setStatus(item.id, "blocked")}>Block</button>}
                    {item.status !== "ended" && <button className="ai-btn ai-btn-ghost" onClick={() => setStatus(item.id, "ended")}>End</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
