import { useState } from "react";
import AiFeatureToggle from "../components/AiFeatureToggle";
import "../styles/AiAdmin.scss";

export default function AiSettingsPage() {
  const [chat, setChat] = useState(true);
  const [voice, setVoice] = useState(true);
  const [calls, setCalls] = useState(true);
  const [moderation, setModeration] = useState(true);

  return (
    <div className="ai-admin-page">
      <header className="ai-page-header"><div><span className="ai-eyebrow">Global controls</span><h1>AI Settings</h1><p>Global defaults for Fockis AI and Vapi services.</p></div></header>
      <section className="ai-panel ai-narrow">
        <h2>Services</h2>
        <AiFeatureToggle label="Chat" checked={chat} onChange={setChat} />
        <AiFeatureToggle label="Voice" checked={voice} onChange={setVoice} />
        <AiFeatureToggle label="Phone calls" checked={calls} onChange={setCalls} />
        <AiFeatureToggle label="Moderation" checked={moderation} onChange={setModeration} />
        <label className="ai-field"><span>Maximum conversation duration (minutes)</span><input type="number" defaultValue={30} min={1} /></label>
        <label className="ai-field"><span>Default assistant</span><select defaultValue="fockis"><option value="fockis">Fockis Assistant</option><option value="support">Fockis Support</option><option value="marketplace">Marketplace Assistant</option><option value="jobs">Jobs Assistant</option></select></label>
        <button className="ai-btn ai-btn-primary">Save settings</button>
      </section>
    </div>
  );
}
