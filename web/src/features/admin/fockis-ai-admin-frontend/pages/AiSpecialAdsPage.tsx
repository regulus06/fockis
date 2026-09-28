import "../styles/AiAdmin.scss";

const ads = [
  ["Back-to-School Laptop", "ACTIVE", "Products", "10,000"],
  ["Cybersecurity Training", "ACTIVE", "Education", "5,000"],
  ["Local Restaurant Promotion", "PAUSED", "Businesses", "2,000"],
];

export default function AiSpecialAdsPage() {
  return (
    <div className="ai-admin-page">
      <header className="ai-page-header"><div><span className="ai-eyebrow">Marketing integration</span><h1>Special AI Ads</h1><p>Manage promotional campaigns that may be recommended by Fockis AI.</p></div><button className="ai-btn ai-btn-primary">+ Create Special Ad</button></header>
      <section className="ai-panel">
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead><tr><th>Campaign</th><th>Status</th><th>Category</th><th>AI impression cap</th><th /></tr></thead>
            <tbody>{ads.map(([name,status,category,cap]) => <tr key={name}><td><strong>{name}</strong><small>Sponsored campaign</small></td><td><span className={`ai-mode ai-mode-${status.toLowerCase()}`}>{status}</span></td><td>{category}</td><td>{cap}</td><td><button className="ai-btn ai-btn-ghost">Manage</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
