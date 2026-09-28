import { useEffect, useState } from "react";
import { aiAdminApi } from "../api/aiAdminApi";
import AiFeatureToggle from "../components/AiFeatureToggle";
import "../styles/AiAdmin.scss";

const initial = {
  searchProducts:true, searchJobs:true, searchBusinesses:true, searchServices:true,
  saveProducts:true, applyToJobs:false, purchaseProducts:false, sendMessages:false,
  createAppointments:true, showSpecialAds:true,
};

export default function AiToolsPage() {
  const [tools, setTools] = useState(initial);
  useEffect(() => { aiAdminApi.getTools().then(setTools).catch(() => {}); }, []);

  const update = (key: keyof typeof initial, value: boolean) => {
    const next = { ...tools, [key]: value };
    setTools(next);
    aiAdminApi.updateTools(next).catch(() => {});
  };

  const groups = [
    ["Discovery", [["searchProducts","Search products"],["searchJobs","Search jobs"],["searchBusinesses","Search businesses"],["searchServices","Search services"]]],
    ["Actions", [["saveProducts","Save products"],["applyToJobs","Apply to jobs"],["purchaseProducts","Purchase products"],["sendMessages","Send messages"],["createAppointments","Create appointments"]]],
    ["Marketing", [["showSpecialAds","Show Special Ads"]]],
  ] as const;

  return (
    <div className="ai-admin-page">
      <header className="ai-page-header"><div><span className="ai-eyebrow">Vapi capabilities</span><h1>AI Tools</h1><p>Control the actions the assistant is allowed to perform.</p></div></header>
      <div className="ai-card-grid">
        {groups.map(([title, items]) => (
          <section className="ai-panel" key={title}>
            <h2>{title}</h2>
            {items.map(([key, label]) => (
              <AiFeatureToggle key={key} label={label} checked={tools[key]} onChange={(v) => update(key, v)} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
