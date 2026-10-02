import AiFeatureToggle from "../components/AiFeatureToggle";
import "../styles/AiAdmin.scss";
import { useState } from "react";

export default function AiRecommendationsPage() {
  const [enabled, setEnabled] = useState(true);
  const [sponsored, setSponsored] = useState(true);
  const [label, setLabel] = useState(true);

  return (
    <div className="ai-admin-page">
      <header className="ai-page-header"><div><span className="ai-eyebrow">Discovery & marketing</span><h1>AI Recommendations</h1><p>Control organic and sponsored recommendations generated through the assistant.</p></div></header>
      <section className="ai-panel ai-narrow">
        <AiFeatureToggle label="AI recommendations" description="Allow the assistant to recommend jobs, products, businesses and services." checked={enabled} onChange={setEnabled} />
        <AiFeatureToggle label="Sponsored recommendations" description="Allow eligible Special Ads to appear when relevant." checked={sponsored} onChange={setSponsored} />
        <AiFeatureToggle label="Sponsored disclosure" description="Keep sponsored recommendations visibly labeled." checked={label} onChange={setLabel} />
        <label className="ai-field"><span>Maximum sponsored results per answer</span><input type="number" defaultValue={1} min={0} max={5} /></label>
      </section>
    </div>
  );
}
