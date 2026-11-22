import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, Clock3, Eye, History, Info, RotateCcw, Users } from "lucide-react";

import { Card, SmError, SmLoading, formatDateTime, useAdminQuery } from "../../support/components/SmParts";
import { useSecurityContext } from "../SecurityLayout";
import { ReauthDialog, RiskDialog, SettingRow } from "../components/SecurityControls";
import {
  SECTION_TITLES,
  formatPolicyValue,
  needsReauth,
  needsRiskConfirmation,
  securityAdminApi,
  securityError,
  type PolicyField,
  type PolicyImpact,
  type PolicyPermissions,
  type PolicyProfile,
  type PolicyRisk,
  type PolicySectionKey,
  type PolicyUpdate,
  type PolicyValues,
} from "../securityAdminApi";

interface Draft {
  accounts: PolicyValues;
  managed: PolicyValues;
}

const SECTION_INTRO: Record<PolicySectionKey, string> = {
  password: "Rules for every new password: registration, password changes, reset links and administrator resets.",
  login: "Limits that protect accounts from password guessing. Enforced by the sign-in API with atomic counters.",
  sessions: "How long signed-in sessions last and when they are ended server-side.",
  twoFactor: "Who must use an authenticator app, recovery codes, and when people must confirm it's them again.",
  alerts: "In-app security notifications sent to account owners. Messages never include codes, passwords or full IP addresses.",
  protection: "Safeguards for password resets, email changes and organization ownership.",
  auditing: "What is recorded in the security audit log and for how long.",
};

/** Settings whose change affects existing users or sessions immediately. */
const LIVE_IMPACT = new Set([
  "inactivityTimeoutMinutes",
  "maximumSessionHours",
  "adminInactivityMinutes",
  "adminMaximumSessionHours",
  "superAdminInactivityMinutes",
  "superAdminMaximumSessionHours",
  "requireTwoFactor",
  "requireTwoFactorForAdministrators",
  "passwordExpirationEnabled",
  "passwordExpirationDays",
  "loginLockoutEnabled",
]);

function changedValues(saved: PolicyValues, draft: PolicyValues): PolicyValues {
  const out: PolicyValues = {};
  for (const [key, value] of Object.entries(draft)) {
    if (saved[key] !== value) out[key] = value;
  }
  return out;
}

export default function PolicySectionPage({
  section,
  children,
}: {
  section: PolicySectionKey;
  /** Extra cards shown below the settings (e.g. locked accounts). */
  children?: ReactNode;
}) {
  const { view, viewError, reloadPolicy } = useSecurityContext();
  const [profile, setProfile] = useState<PolicyProfile>("accounts");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [risk, setRisk] = useState<{ risks: PolicyRisk[]; impact: PolicyImpact[]; body: PolicyUpdate } | null>(null);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [reauthFor, setReauthFor] = useState<PolicyUpdate | null>(null);

  const history = useAdminQuery(() => securityAdminApi.history({ scope: "platform", pageSize: 50 }), []);

  const saved: Draft | null = view ? { accounts: view.policy.accounts, managed: view.policy.managed } : null;

  const fields = useMemo<PolicyField[]>(
    () => (view ? view.fields.filter((f) => f.section === section || f.alsoShownIn?.includes(section)) : []),
    [view, section],
  );

  const hasManaged = fields.some((f) => f.profiles.includes("managed"));
  const hasAccounts = fields.some((f) => f.profiles.includes("accounts"));

  useEffect(() => {
    if (!hasAccounts && hasManaged) setProfile("managed");
  }, [hasAccounts, hasManaged]);

  // Load / refresh the draft when the saved policy changes.
  useEffect(() => {
    if (view) setDraft({ accounts: { ...view.policy.accounts }, managed: { ...view.policy.managed } });
  }, [view]);

  const sectionKeys = useMemo(() => new Set(fields.map((f) => f.key)), [fields]);

  const pending = useMemo(() => {
    if (!saved || !draft) return { accounts: {}, managed: {} } as Draft;
    const pick = (values: PolicyValues) =>
      Object.fromEntries(Object.entries(values).filter(([key]) => sectionKeys.has(key))) as PolicyValues;
    return {
      accounts: pick(changedValues(saved.accounts, draft.accounts)),
      managed: pick(changedValues(saved.managed, draft.managed)),
    };
  }, [saved, draft, sectionKeys]);

  const dirtyCount = Object.keys(pending.accounts).length + Object.keys(pending.managed).length;

  const sectionHistory = useMemo(
    () =>
      (history.data?.items ?? [])
        .map((rev) => ({ ...rev, changes: rev.changes.filter((c) => sectionKeys.has(c.field)) }))
        .filter((rev) => rev.changes.length > 0),
    [history.data, sectionKeys],
  );

  const canEdit = (p: PolicyProfile, field: PolicyField) =>
    Boolean(view) &&
    field.enforcement === "enforced" &&
    (p === "managed"
      ? view!.permissions.organizationDefaults
      : Boolean(view!.permissions[field.section as keyof PolicyPermissions]));

  const fieldMap = useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);

  const save = useCallback(
    async (body: PolicyUpdate) => {
      setBusy(true);
      setMessage(null);
      setRiskError(null);

      try {
        await securityAdminApi.update(body);
        setRisk(null);
        await reloadPolicy();
        void history.refetch();
        setMessage({ tone: "ok", text: "Security settings saved. They apply to new requests on every API instance within seconds." });
      } catch (error) {
        if (needsReauth(error)) {
          setReauthFor(body);
          return;
        }

        const risks = needsRiskConfirmation(error);

        if (risks) {
          const preview = await securityAdminApi.preview(body).catch(() => null);
          setRisk({ risks, impact: preview?.impact ?? [], body });
          return;
        }

        const status = (error as { response?: { status?: number } })?.response?.status;
        const text =
          status === 409
            ? "Someone else changed the security policy. Your unsaved changes are kept; reload to see their changes first."
            : securityError(error, "The settings could not be saved.");

        if (risk) setRiskError(text);
        else setMessage({ tone: "error", text });
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reloadPolicy, risk],
  );

  const startSave = async () => {
    if (!view || !dirtyCount) return;

    const body: PolicyUpdate = {
      expectedVersion: view.policy.version,
      ...(Object.keys(pending.accounts).length ? { accounts: pending.accounts } : {}),
      ...(Object.keys(pending.managed).length ? { managed: pending.managed } : {}),
    };

    setBusy(true);
    setMessage(null);

    try {
      const preview = await securityAdminApi.preview(body);

      if (preview.errors.length || preview.forbidden.length) {
        setMessage({
          tone: "error",
          text: [...preview.errors, ...preview.forbidden.map((f) => `No permission: ${f}`)].join(" "),
        });
        return;
      }

      if (preview.risks.length) {
        setRisk({ risks: preview.risks, impact: preview.impact, body });
        return;
      }
    } catch (error) {
      setMessage({ tone: "error", text: securityError(error, "The changes could not be checked.") });
      return;
    } finally {
      setBusy(false);
    }

    await save(body);
  };

  if (viewError && !view) return <SmError message={viewError} onRetry={() => void reloadPolicy()} />;
  if (!view || !draft || !saved) return <SmLoading label="Loading security policy…" />;

  const profileFields = fields.filter((f) => f.profiles.includes(profile));
  const delegated = new Set(view.policy.delegatedFields);
  const values = draft[profile];
  const savedValues = saved[profile];
  const lastChange = sectionHistory[0];
  const liveImpact = [...Object.keys(pending.accounts), ...Object.keys(pending.managed)].some((key) => LIVE_IMPACT.has(key));
  const editableAny = profileFields.some((f) => canEdit(profile, f));

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>{SECTION_TITLES[section]}</h2>
          <p>{SECTION_INTRO[section]}</p>
        </div>
        <dl className="fksec-meta">
          <div>
            <dt>
              <Clock3 size={14} aria-hidden="true" /> Last modified
            </dt>
            <dd>{formatDateTime(lastChange?.createdAt ?? view.policy.updatedAt)}</dd>
          </div>
          <div>
            <dt>
              <Users size={14} aria-hidden="true" /> Modified by
            </dt>
            <dd>{lastChange?.actorName || view.policy.updatedByName || "—"}</dd>
          </div>
          <div>
            <dt>Policy version</dt>
            <dd>v{view.policy.version}</dd>
          </div>
        </dl>
      </header>

      {view.policy.fallback && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          The policy could not be read from the database, so secure defaults are shown and enforced.
        </p>
      )}

      {hasManaged && hasAccounts && (
        <div className="fksec-profile" role="tablist" aria-label="Who these settings apply to">
          <button type="button" role="tab" aria-selected={profile === "accounts"} className={profile === "accounts" ? "is-active" : ""} onClick={() => setProfile("accounts")}>
            <Users size={16} aria-hidden="true" /> All Fockis accounts
            {Object.keys(pending.accounts).length > 0 && <span className="fksec-dot" aria-label="unsaved changes" />}
          </button>
          <button type="button" role="tab" aria-selected={profile === "managed"} className={profile === "managed" ? "is-active" : ""} onClick={() => setProfile("managed")}>
            <Building2 size={16} aria-hidden="true" /> Organization-managed identities
            {Object.keys(pending.managed).length > 0 && <span className="fksec-dot" aria-label="unsaved changes" />}
          </button>
        </div>
      )}

      {profile === "managed" && (
        <p className="fksm-notice fksm-notice--info">
          <Info size={15} aria-hidden="true" /> These are the Fockis baseline for users created by organizations. Organizations can only make settings marked
          <strong> Organizations may tighten</strong> stricter, never weaker. Managed users also get any stricter all-accounts setting.{" "}
          <Link to="/admin/security/organizations" className="fksm-link">
            Choose what organizations can change
          </Link>
        </p>
      )}

      {!editableAny && (
        <p className="fksm-notice fksm-notice--info">You can view these settings. Changing them needs an additional security permission.</p>
      )}

      <div className="fksec-grid">
        <Card className="fksec-settings">
          {profileFields.length === 0 ? (
            <p className="fksm-muted">No settings in this section apply to this group.</p>
          ) : (
            profileFields.map((field) => {
              const parent = field.dependsOn ? fieldMap.get(field.dependsOn) : undefined;
              const dimmed = Boolean(parent && values[parent.key] === false);

              return (
                <SettingRow
                  key={`${profile}.${field.key}`}
                  field={field}
                  value={values[field.key]}
                  saved={savedValues[field.key]}
                  editable={canEdit(profile, field)}
                  dimmed={dimmed}
                  badge={
                    profile === "managed" ? (
                      delegated.has(field.key) ? (
                        <span className="fksec-tag fksec-tag--delegated">Organizations may tighten</span>
                      ) : (
                        <span className="fksec-tag fksec-tag--locked">Locked by Fockis</span>
                      )
                    ) : null
                  }
                  onChange={(next) => setDraft((d) => (d ? { ...d, [profile]: { ...d[profile], [field.key]: next } } : d))}
                />
              );
            })
          )}
        </Card>

        <aside className="fksec-side">
          <Card title="Effective policy preview" icon={<Eye size={18} aria-hidden="true" />}>
            <p className="fksm-muted fksec-side__hint">What will be enforced after saving{dirtyCount ? " (unsaved changes highlighted)" : ""}.</p>
            <ul className="fksec-preview">
              {profileFields.map((field) => (
                <li key={field.key} className={values[field.key] !== savedValues[field.key] ? "is-changed" : ""}>
                  <span>{field.label}</span>
                  <strong>{formatPolicyValue(field, values[field.key])}</strong>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Change history" icon={<History size={18} aria-hidden="true" />}>
            {history.loading && !history.data ? (
              <SmLoading />
            ) : history.error ? (
              <SmError message={history.error} onRetry={() => void history.refetch()} />
            ) : !sectionHistory.length ? (
              <p className="fksm-muted">No changes to these settings yet. The initial values match how Fockis behaved before this policy existed.</p>
            ) : (
              <ol className="fksec-history">
                {sectionHistory.slice(0, 8).map((rev) => (
                  <li key={rev.id}>
                    <div className="fksec-history__head">
                      <strong>{rev.actorName || "Administrator"}</strong>
                      <span>{formatDateTime(rev.createdAt)}</span>
                    </div>
                    <ul>
                      {rev.changes.map((change) => {
                        const def = view.fields.find((f) => f.key === change.field);
                        return (
                          <li key={`${change.profile}.${change.field}`}>
                            {def?.label ?? change.field}
                            {change.profile === "managed" ? " (managed)" : ""}: {formatPolicyValue(def, change.from)} → <b>{formatPolicyValue(def, change.to)}</b>
                          </li>
                        );
                      })}
                    </ul>
                    {rev.reason && <p className="fksec-history__reason">“{rev.reason}”</p>}
                    {rev.highRisk && <span className="fksec-tag fksec-tag--risk">High impact</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </aside>
      </div>

      {children}

      {(dirtyCount > 0 || message) && (
        <div className="fksec-savebar" role="region" aria-label="Save changes">
          <div className="fksec-savebar__text">
            {message ? (
              <span className={`fksec-savebar__msg fksec-savebar__msg--${message.tone}`} role={message.tone === "error" ? "alert" : "status"}>
                {message.tone === "ok" && <CheckCircle2 size={16} aria-hidden="true" />} {message.text}
              </span>
            ) : (
              <span>
                <strong>{dirtyCount}</strong> unsaved change{dirtyCount === 1 ? "" : "s"}
                {liveImpact && " · applies to existing users and sessions immediately"}
              </span>
            )}
          </div>
          <div className="fksec-savebar__actions">
            {dirtyCount > 0 && (
              <>
                <button type="button" className="fksm-btn fksm-btn--secondary" disabled={busy} onClick={() => setDraft({ accounts: { ...saved.accounts }, managed: { ...saved.managed } })}>
                  <RotateCcw size={15} aria-hidden="true" /> Discard changes
                </button>
                <button type="button" className="fksm-btn fksm-btn--primary" disabled={busy} onClick={() => void startSave()}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </>
            )}
            {dirtyCount === 0 && message && (
              <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setMessage(null)}>
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      {risk && (
        <RiskDialog
          risks={risk.risks}
          impact={risk.impact}
          busy={busy}
          error={riskError}
          onCancel={() => {
            setRisk(null);
            setRiskError(null);
          }}
          onConfirm={(reason) => void save({ ...risk.body, confirmHighRisk: true, reason })}
        />
      )}

      {reauthFor && (
        <ReauthDialog
          onCancel={() => setReauthFor(null)}
          onDone={() => {
            const body = reauthFor;
            setReauthFor(null);
            void save(body);
          }}
        />
      )}
    </div>
  );
}
