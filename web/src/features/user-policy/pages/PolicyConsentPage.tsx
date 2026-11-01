import { useState } from "react";
import { BadgeCheck, History, Lock } from "lucide-react";

import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import { apiMessage, policyCenterApi } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, Toggle } from "../components/PolicyUi";
import { CONSENT_LABELS, fmtDate, fmtTime, useLoad } from "../components/policyUtils";

const GROUPS = ["Cookies", "Communications", "Personalization"] as const;

function ConsentContent() {
  const notify = useHelpToast();
  const { data, setData, error, loading, reload } = useLoad(() => policyCenterApi.consent());
  const [saving, setSaving] = useState("");

  async function change(key: string, value: boolean) {
    if (!data) return;
    const before = data;
    setData({ ...data, choices: { ...data.choices, [key]: value } });
    setSaving(key);
    try {
      setData(await policyCenterApi.updateConsent(key, value));
      notify(`${CONSENT_LABELS[key]?.title ?? "Preference"} turned ${value ? "on" : "off"}.`);
    } catch (e) {
      setData(before);
      notify(apiMessage(e, "We couldn't save your choice."), "error");
    } finally {
      setSaving("");
    }
  }

  if (loading && !data) return <div className="fk-pol-card"><HelpLoading label="Loading your consent choices…" /></div>;
  if (error && !data) return <div className="fk-pol-card"><HelpError message={error} onRetry={() => void reload()} /></div>;
  const c = data!;
  const keys = Object.keys(c.choices);

  return (
    <div className="fk-pol-grid2">
      <div className="fk-pol-stack">
        <Card title="Manage Consent" icon={<BadgeCheck size={24} />} action={c.updatedAt ? <span className="fk-pol-muted">Saved {fmtDate(c.updatedAt)}</span> : null}>
          <p className="fk-pol-intro">These choices are optional and off unless you turn them on. You can change them at any time; changes apply from now on.</p>
          {GROUPS.map((group) => {
            const groupKeys = keys.filter((k) => CONSENT_LABELS[k]?.group === group);
            if (!groupKeys.length) return null;
            return (
              <div key={group} className="fk-pol-group">
                <h3 className="fk-pol-subtitle">{group}</h3>
                {groupKeys.map((key) => (
                  <div key={key} className="fk-pol-setting">
                    <div className="fk-pol-setting__text">
                      <strong>{CONSENT_LABELS[key]?.title ?? key}</strong>
                      <span>{CONSENT_LABELS[key]?.text}</span>
                    </div>
                    <Toggle label={CONSENT_LABELS[key]?.title ?? key} checked={Boolean(c.choices[key])} disabled={saving === key} onChange={(v) => void change(key, v)} />
                  </div>
                ))}
              </div>
            );
          })}
        </Card>
      </div>

      <div className="fk-pol-stack">
        <Card title="Essential processing" icon={<Lock size={22} />}>
          <p className="fk-pol-intro">
            Some processing is needed to run your account — signing you in, keeping it secure, delivering messages, processing Fockis Shop orders and payments, and meeting legal obligations. This isn't based on the choices on this page and can't be switched off, but it's
            explained in the Privacy Policy.
          </p>
          <p className="fk-pol-muted fk-pol-small">Consent wording version {c.consentVersion}{c.recordedVersion && c.recordedVersion !== c.consentVersion ? ` (your choices were saved under ${c.recordedVersion})` : ""}.</p>
        </Card>

        <Card title="Consent history" icon={<History size={22} />}>
          {!c.history.length ? (
            <p className="fk-pol-muted">No changes recorded yet.</p>
          ) : (
            <ul className="fk-pol-vlist">
              {c.history.map((h, i) => (
                <li key={i}>
                  <strong>
                    {Object.entries(h.changes)
                      .map(([k, v]) => `${CONSENT_LABELS[k]?.title ?? k}: ${v ? "On" : "Off"}`)
                      .join(", ")}
                  </strong>
                  <span>
                    {fmtDate(h.at)} {fmtTime(h.at)} · version {h.consentVersion}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function PolicyConsentPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="manage your consent choices">{() => <ConsentContent />}</SignedInOnly>
    </PolicyShell>
  );
}
