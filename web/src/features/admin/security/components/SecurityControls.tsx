import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Lock, LockKeyhole, ShieldAlert, X } from "lucide-react";

import {
  formatPolicyValue,
  securityAdminApi,
  securityError,
  type PolicyField,
  type PolicyImpact,
  type PolicyRisk,
  type PolicyValue,
} from "../securityAdminApi";

/* ============================================================================
   TOGGLE (accessible switch)
============================================================================ */

export function Toggle({
  checked,
  disabled,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      className={`fksec-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="fksec-switch__track" aria-hidden="true">
        <span className="fksec-switch__thumb" />
      </span>
      <span className="fksec-switch__text">{checked ? "On" : "Off"}</span>
    </button>
  );
}

/* ============================================================================
   NUMBER INPUT (validated against the definition's range)
============================================================================ */

export function NumberSetting({
  field,
  value,
  disabled,
  onChange,
  labelledBy,
  describedBy,
}: {
  field: PolicyField;
  value: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const parsed = Number(text);
  const invalid =
    text.trim() === "" ||
    !Number.isInteger(parsed) ||
    (field.min !== undefined && parsed < field.min) ||
    (field.max !== undefined && parsed > field.max);

  return (
    <span className="fksec-number">
      <input
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        step={1}
        value={text}
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          setText(event.target.value);
          const next = Number(event.target.value);
          if (event.target.value.trim() !== "" && Number.isInteger(next)) onChange(next);
        }}
        onBlur={() => {
          if (invalid) setText(String(value));
        }}
      />
      {field.unit && <span className="fksec-number__unit">{field.unit}</span>}
      {invalid && (
        <span className="fksec-number__error" role="alert">
          {field.min ?? 0}–{field.max ?? "∞"}
        </span>
      )}
    </span>
  );
}

/* ============================================================================
   SETTING ROW
============================================================================ */

export function SettingRow({
  field,
  value,
  saved,
  editable,
  dimmed,
  badge,
  onChange,
}: {
  field: PolicyField;
  value: PolicyValue;
  saved: PolicyValue;
  editable: boolean;
  dimmed?: boolean;
  badge?: ReactNode;
  onChange: (next: PolicyValue) => void;
}) {
  const labelId = useId();
  const descId = useId();
  const changed = value !== saved;
  const locked = field.enforcement !== "enforced";

  return (
    <div className={`fksec-row${changed ? " is-changed" : ""}${dimmed ? " is-dimmed" : ""}`}>
      <div className="fksec-row__text">
        <div className="fksec-row__title">
          <span id={labelId}>{field.label}</span>
          {field.enforcement === "locked" && (
            <span className="fksec-tag fksec-tag--locked">
              <Lock size={12} aria-hidden="true" /> Always on
            </span>
          )}
          {field.enforcement === "unavailable" && (
            <span className="fksec-tag fksec-tag--unavailable">
              <ShieldAlert size={12} aria-hidden="true" /> Not available yet
            </span>
          )}
          {field.highRisk && field.enforcement === "enforced" && (
            <span className="fksec-tag fksec-tag--risk" title={field.riskNote}>
              <AlertTriangle size={12} aria-hidden="true" /> High impact
            </span>
          )}
          {badge}
          {changed && <span className="fksec-tag fksec-tag--changed">Unsaved</span>}
        </div>
        <p id={descId}>{field.description}</p>
        <p className="fksec-row__note">{field.enforcementNote}</p>
      </div>

      <div className="fksec-row__control">
        {field.type === "boolean" ? (
          <Toggle
            checked={value === true}
            disabled={!editable || locked}
            onChange={onChange}
            labelledBy={labelId}
            describedBy={descId}
          />
        ) : (
          <NumberSetting
            field={field}
            value={Number(value)}
            disabled={!editable || locked}
            onChange={onChange}
            labelledBy={labelId}
            describedBy={descId}
          />
        )}
        {changed && (
          <span className="fksec-row__was">was {formatPolicyValue(field, saved)}</span>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   DIALOG SHELL
============================================================================ */

export function Dialog({
  title,
  children,
  footer,
  onClose,
  busy,
  tone,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  busy?: boolean;
  tone?: "danger";
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div className="fksm-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className={`fksm-dialog fksec-dialog${tone ? ` fksec-dialog--${tone}` : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="fksm-dialog__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="fksm-icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
            <X size={18} />
          </button>
        </div>
        {children}
        <div className="fksm-dialog__foot">{footer}</div>
      </div>
    </div>
  );
}

/* ============================================================================
   REAUTHENTICATION
============================================================================ */

export function ReauthDialog({
  onDone,
  onCancel,
  reason = "Confirm it's you before changing security settings.",
}: {
  onDone: () => void;
  onCancel: () => void;
  reason?: string;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    window.setTimeout(() => input.current?.focus(), 0);
  }, []);

  const submit = async () => {
    setBusy(true);
    setError(null);

    try {
      await securityAdminApi.reauthenticate(password, code || undefined);
      setPassword("");
      setCode("");
      onDone();
    } catch (err) {
      const message = securityError(err, "Couldn't confirm your identity.");
      if (/two-factor/i.test(message)) setNeedsCode(true);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Confirm your identity"
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="fksm-btn fksm-btn--secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="fksm-btn fksm-btn--primary" onClick={() => void submit()} disabled={busy || !password}>
            {busy ? "Checking…" : "Confirm"}
          </button>
        </>
      }
    >
      <p className="fksm-dialog__text">
        <LockKeyhole size={16} aria-hidden="true" /> {reason}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (password && !busy) void submit();
        }}
      >
        <label className="fksm-field">
          <span>Your password</span>
          <input ref={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="fksm-field">
          <span>Two-factor code {needsCode ? "" : "(if two-factor is on)"}</span>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
        </label>
        <button type="submit" hidden />
      </form>
      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

/* ============================================================================
   HIGH-RISK CONFIRMATION
============================================================================ */

export function RiskDialog({
  risks,
  impact,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  risks: PolicyRisk[];
  impact: PolicyImpact[];
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const ready = reason.trim().length >= 5 && typed === "APPLY";

  return (
    <Dialog
      title="Confirm high-impact changes"
      tone="danger"
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="fksm-btn fksm-btn--secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="fksm-btn fksm-btn--danger" onClick={() => onConfirm(reason.trim())} disabled={!ready || busy}>
            {busy ? "Applying…" : "Apply changes"}
          </button>
        </>
      }
    >
      <p className="fksm-dialog__text">
        These changes apply platform-wide as soon as they are saved. Nothing is applied until you confirm.
      </p>

      <ul className="fksec-risks">
        {risks.map((risk) => {
          const estimate = impact.find((item) => item.field === risk.field && item.profile === risk.profile);

          return (
            <li key={`${risk.profile}.${risk.field}`}>
              <AlertTriangle size={16} aria-hidden="true" />
              <div>
                <strong>
                  {risk.label}{" "}
                  <small>({risk.profile === "managed" ? "organization-managed identities" : "all Fockis accounts"})</small>
                </strong>
                <span>{risk.note}</span>
                {estimate && (
                  <em>
                    {estimate.affectedAccounts === null
                      ? "Affected accounts: could not be estimated."
                      : `About ${estimate.affectedAccounts.toLocaleString()} account${estimate.affectedAccounts === 1 ? "" : "s"} affected right now.`}
                  </em>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <label className="fksm-field">
        <span>
          Reason for this change <b className="fksm-required">*</b>
        </span>
        <textarea rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <label className="fksm-field">
        <span>
          Type <strong>APPLY</strong> to confirm
        </span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>

      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

/* ============================================================================
   METRIC TILE
============================================================================ */

export function Metric({
  label,
  value,
  sub,
  tone = "blue",
  icon,
}: {
  label: string;
  value: number | string | null | undefined;
  sub?: ReactNode;
  tone?: "blue" | "purple" | "amber" | "red" | "green";
  icon: ReactNode;
}) {
  const shown =
    value === null || value === undefined
      ? "Unavailable"
      : typeof value === "number"
        ? value.toLocaleString()
        : value;

  return (
    <div className={`fksm-stat fksm-stat--${tone} fksec-metric`}>
      <span className="fksm-stat__icon">{icon}</span>
      <span className="fksm-stat__body">
        <strong className={value === null || value === undefined ? "fksec-unavailable" : ""}>{shown}</strong>
        <b>{label}</b>
        {sub && <span className="fksm-stat__sub">{sub}</span>}
      </span>
    </div>
  );
}
