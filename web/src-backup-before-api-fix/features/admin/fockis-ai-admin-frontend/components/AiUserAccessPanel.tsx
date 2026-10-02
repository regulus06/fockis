import { useEffect, useState } from "react";
import type { AccessMode, AiUserAccess } from "../types/aiAdmin.types";
import AiFeatureToggle from "./AiFeatureToggle";

interface Props {
  user: AiUserAccess | null;
  onClose: () => void;
  onSave: (user: AiUserAccess) => void;
}

export default function AiUserAccessPanel({ user, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<AiUserAccess | null>(user);

  useEffect(() => setDraft(user), [user]);

  if (!draft) return null;

  const custom = draft.mode === "custom" || draft.mode === "granted";

  const setPermission = (key: keyof AiUserAccess["permissions"], value: boolean) =>
    setDraft({
      ...draft,
      permissions: { ...draft.permissions, [key]: value },
    });

  return (
    <div className="ai-drawer-backdrop" onMouseDown={onClose}>
      <aside className="ai-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ai-drawer-head">
          <div>
            <span className="ai-eyebrow">User AI access</span>
            <h2>{draft.userName}</h2>
            <p>{draft.email}</p>
          </div>
          <button className="ai-icon-btn" onClick={onClose}>×</button>
        </div>

        <div className="ai-user-plan">
          <span>Membership</span>
          <strong>{draft.plan}</strong>
        </div>

        <label className="ai-field">
          <span>Access mode</span>
          <select
            value={draft.mode}
            onChange={(e) => setDraft({ ...draft, mode: e.target.value as AccessMode })}
          >
            <option value="inherit">Follow membership</option>
            <option value="custom">Custom permissions</option>
            <option value="granted">Grant access</option>
            <option value="blocked">Block all AI</option>
          </select>
        </label>

        {custom && (
          <div className="ai-section">
            <h3>Feature access</h3>
            <AiFeatureToggle label="AI Chat" checked={draft.permissions.chat} onChange={(v) => setPermission("chat", v)} />
            <AiFeatureToggle label="AI Voice" checked={draft.permissions.voice} onChange={(v) => setPermission("voice", v)} />
            <AiFeatureToggle label="AI Phone Calls" checked={draft.permissions.phoneCalls} onChange={(v) => setPermission("phoneCalls", v)} />
            <AiFeatureToggle label="Recommendations" checked={draft.permissions.recommendations} onChange={(v) => setPermission("recommendations", v)} />
            <AiFeatureToggle label="Special Ads" checked={draft.permissions.specialAds} onChange={(v) => setPermission("specialAds", v)} />
          </div>
        )}

        <label className="ai-field">
          <span>Access expiration</span>
          <input
            type="date"
            value={draft.expiresAt ? draft.expiresAt.slice(0, 10) : ""}
            onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || null })}
          />
        </label>

        <label className="ai-field">
          <span>Admin reason</span>
          <textarea
            rows={4}
            value={draft.reason || ""}
            onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
            placeholder="Why is this access being changed?"
          />
        </label>

        <div className="ai-drawer-actions">
          <button className="ai-btn ai-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="ai-btn ai-btn-primary" onClick={() => onSave(draft)}>Save access</button>
        </div>
      </aside>
    </div>
  );
}
