import AiStatusCard from "../components/AiStatusCard";
import "../styles/AiAdmin.scss";

export default function AiUsagePage() {
  return (
    <div className="ai-admin-page">
      <header className="ai-page-header"><div><span className="ai-eyebrow">Cost & limits</span><h1>Usage & Credits</h1><p>Monitor AI consumption and the limits assigned to membership plans.</p></div></header>
      <div className="ai-stat-grid">
        <AiStatusCard label="Chat messages" value="182,394" detail="This month" />
        <AiStatusCard label="Voice minutes" value="18,421" detail="This month" tone="success" />
        <AiStatusCard label="Phone minutes" value="4,820" detail="This month" tone="warning" />
        <AiStatusCard label="Recommendations" value="63,220" detail="This month" />
      </div>
      <section className="ai-panel"><h2>Usage controls</h2><p className="ai-muted">Plan limits and individual credits should be enforced server-side before creating a Vapi session.</p><div className="ai-card-grid"><div className="ai-mini-card"><strong>Chat</strong><span>Message based limits</span></div><div className="ai-mini-card"><strong>Voice</strong><span>Minute based limits</span></div><div className="ai-mini-card"><strong>Phone</strong><span>Minute based limits</span></div></div></section>
    </div>
  );
}
