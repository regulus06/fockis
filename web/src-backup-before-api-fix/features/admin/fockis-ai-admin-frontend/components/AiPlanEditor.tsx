import { useEffect, useState } from "react";
import type { AiPlan } from "../types/aiAdmin.types";
import AiFeatureToggle from "./AiFeatureToggle";

interface Props {
  plan: AiPlan | null;
  onClose: () => void;
  onSave: (plan: AiPlan) => void;
}

export default function AiPlanEditor({ plan, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<AiPlan | null>(plan);

  useEffect(() => setDraft(plan), [plan]);

  if (!draft) return null;

  const setPermission = (key: keyof AiPlan["permissions"], value: boolean) =>
    setDraft({
      ...draft,
      permissions: { ...draft.permissions, [key]: value },
    });

  return (
    <div className="ai-drawer-backdrop" onMouseDown={onClose}>
      <aside className="ai-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ai-drawer-head">
          <div>
            <span className="ai-eyebrow">Subscription plan</span>
            <h2>{draft.name}</h2>
          </div>
          <button className="ai-icon-btn" onClick={onClose}>×</button>
        </div>

        <label className="ai-field">
          <span>Description</span>
          <input
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </label>

        <div className="ai-section">
          <h3>AI features</h3>
          <AiFeatureToggle label="AI Chat" checked={draft.permissions.chat} onChange={(v) => setPermission("chat", v)} />
          <AiFeatureToggle label="AI Voice" checked={draft.permissions.voice} onChange={(v) => setPermission("voice", v)} />
          <AiFeatureToggle label="AI Phone Calls" checked={draft.permissions.phoneCalls} onChange={(v) => setPermission("phoneCalls", v)} />
          <AiFeatureToggle label="Recommendations" checked={draft.permissions.recommendations} onChange={(v) => setPermission("recommendations", v)} />
          <AiFeatureToggle label="Special Ads" checked={draft.permissions.specialAds} onChange={(v) => setPermission("specialAds", v)} />
        </div>

        <div className="ai-section">
          <h3>Usage limits</h3>
          <div className="ai-field-grid">
            <label className="ai-field">
              <span>Chat messages</span>
              <input type="number" value={draft.limits.chatMessages}
                onChange={(e) => setDraft({ ...draft, limits: { ...draft.limits, chatMessages: Number(e.target.value) }})} />
            </label>
            <label className="ai-field">
              <span>Voice minutes</span>
              <input type="number" value={draft.limits.voiceMinutes}
                onChange={(e) => setDraft({ ...draft, limits: { ...draft.limits, voiceMinutes: Number(e.target.value) }})} />
            </label>
            <label className="ai-field">
              <span>Phone minutes</span>
              <input type="number" value={draft.limits.phoneMinutes}
                onChange={(e) => setDraft({ ...draft, limits: { ...draft.limits, phoneMinutes: Number(e.target.value) }})} />
            </label>
            <label className="ai-field">
              <span>Recommendations</span>
              <input type="number" value={draft.limits.recommendations}
                onChange={(e) => setDraft({ ...draft, limits: { ...draft.limits, recommendations: Number(e.target.value) }})} />
            </label>
          </div>
        </div>

        <div className="ai-drawer-actions">
          <button className="ai-btn ai-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ai-btn ai-btn-primary" onClick={() => onSave(draft)}>Save changes</button>
        </div>
      </aside>
    </div>
  );
}
