import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminErrorState, AdminLoadingState } from "../../components/AdminStates";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { moderationApi, moderationError } from "../moderationApi";
import { REASON_OPTIONS, type ModerationSettings } from "../moderationTypes";
import { ModerationTabs } from "../components/ModerationParts";

/** Report thresholds and alert settings. Editing needs moderation.settings. */
export default function ModerationSettingsPage() {
  const { can } = useAdminAccess();
  const canEdit = can([PERMISSIONS.MODERATION_SETTINGS]);

  const [settings, setSettings] = useState<ModerationSettings | null>(null);
  const [draft, setDraft] = useState<ModerationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const value = await moderationApi.settings();
      setSettings(value);
      setDraft(value);
    } catch (caught) {
      setError(moderationError(caught, "Couldn't load moderation settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;

    if (draft.highPriorityThreshold < draft.reviewThreshold) {
      setNotice({ tone: "error", message: "The high-priority threshold can't be lower than the review threshold." });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const value = await moderationApi.updateSettings(draft);
      setSettings(value);
      setDraft(value);
      setNotice({ tone: "success", message: "Settings saved." });
    } catch (caught) {
      setNotice({ tone: "error", message: moderationError(caught, "Couldn't save settings.") });
    } finally {
      setSaving(false);
    }
  }

  function setNumber(key: "reviewThreshold" | "highPriorityThreshold" | "maxReportsPerDay", value: string) {
    setDraft((current) => (current ? { ...current, [key]: Math.max(1, Math.min(1000, Number(value) || 1)) } : current));
  }

  function toggleUrgent(reason: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            urgentReasons: current.urgentReasons.includes(reason)
              ? current.urgentReasons.filter((item) => item !== reason)
              : [...current.urgentReasons, reason],
          }
        : current,
    );
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(draft);

  return (
    <div className="fk-page fkmod">
      <AdminPageHeader
        title="Moderation settings"
        description="When cases are flagged and how urgently. Thresholds only flag cases for human review — they never apply consequences."
      />

      <ModerationTabs />

      {loading && !draft && <AdminLoadingState label="Loading settings…" />}
      {error && !draft && <AdminErrorState message={error} onRetry={() => void load()} />}

      {draft && (
        <form className="fk-panel fk-card fkmod-settings" onSubmit={save}>
          {!canEdit && <p className="fkmod-notice fkmod-notice--info">You can view these settings. Changing them needs the Moderation Settings permission.</p>}

          {notice && (
            <p className={`fkmod-notice fkmod-notice--${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>
              {notice.message}
            </p>
          )}

          <div className="fkmod-settings__grid">
            <label className="fk-modal__field">
              <span>Review threshold (unique reporters)</span>
              <input type="number" min={1} max={1000} value={draft.reviewThreshold} disabled={!canEdit} onChange={(event) => setNumber("reviewThreshold", event.target.value)} />
              <small className="fk-muted">The case is flagged for moderator review.</small>
            </label>

            <label className="fk-modal__field">
              <span>High-priority threshold</span>
              <input type="number" min={1} max={1000} value={draft.highPriorityThreshold} disabled={!canEdit} onChange={(event) => setNumber("highPriorityThreshold", event.target.value)} />
              <small className="fk-muted">The case moves up the queue and moderators are alerted again.</small>
            </label>

            <label className="fk-modal__field">
              <span>Max reports per user per day</span>
              <input type="number" min={1} max={1000} value={draft.maxReportsPerDay} disabled={!canEdit} onChange={(event) => setNumber("maxReportsPerDay", event.target.value)} />
              <small className="fk-muted">Protects against report flooding.</small>
            </label>
          </div>

          <fieldset className="fkmod-consequences fkmod-consequences--grid" disabled={!canEdit}>
            <legend>Escalate immediately for these reasons</legend>
            {REASON_OPTIONS.map((option) => (
              <label key={option.value} className={draft.urgentReasons.includes(option.value) ? "is-checked" : ""}>
                <input type="checkbox" checked={draft.urgentReasons.includes(option.value)} onChange={() => toggleUrgent(option.value)} />
                <span>
                  <strong>{option.label}</strong>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="fk-modal__checkbox">
            <input
              type="checkbox"
              checked={draft.notifyOnNewCase}
              disabled={!canEdit}
              onChange={(event) => setDraft((current) => (current ? { ...current, notifyOnNewCase: event.target.checked } : current))}
            />
            <span>Notify moderators when a new case is opened (before any threshold)</span>
          </label>

          {canEdit && (
            <div className="fk-modal__actions">
              <button type="button" className="fk-btn" disabled={!dirty || saving} onClick={() => setDraft(settings)}>
                Reset
              </button>
              <button type="submit" className="fk-btn fk-btn--primary" disabled={!dirty || saving}>
                {saving ? "Saving…" : "Save settings"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
