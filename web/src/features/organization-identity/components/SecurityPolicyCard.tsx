import { useEffect, useId, useState } from "react";

import type {
  SecurityGovernanceField,
  SecurityPolicy,
} from "../types/organizationIdentity.types";

import "../styles/OrganizationSecurityPolicy.scss";

// ============================================================================
// ORGANIZATION SECURITY POLICY
//
// Fockis governs security from the platform Admin Center. This card shows the
// policy enforced for this organization's managed users:
//
// - Settings Fockis delegates can be made STRICTER than the Fockis baseline.
// - Every other setting is read-only and marked "Locked by Fockis".
//
// Field labels, descriptions and ranges come from the API (policy.governance),
// and the API validates every change, so nothing here can weaken the policy.
// ============================================================================

interface Props {
  policy: SecurityPolicy;

  onChange: (
    patch: Partial<SecurityPolicy>,
  ) => void;

  saving?: boolean;
}

const SECTIONS: Array<{ key: string; eyebrow: string; title: string; description: string }> = [
  { key: "password", eyebrow: "Password security", title: "Password protection", description: "Password strength, reuse, expiration and administrator resets." },
  { key: "login", eyebrow: "Login protection", title: "Login lockout", description: "Protect accounts against repeated password attempts." },
  { key: "sessions", eyebrow: "Session security", title: "Sessions and inactivity", description: "How long signed-in sessions of managed users stay active." },
  { key: "twoFactor", eyebrow: "Authentication", title: "Two-factor authentication", description: "An additional sign-in step for managed users." },
  { key: "alerts", eyebrow: "Notifications", title: "Login alerts", description: "Security notifications sent to managed users." },
  { key: "protection", eyebrow: "Account protection", title: "Organization safeguards", description: "Protect important accounts and prevent unauthorized changes." },
  { key: "auditing", eyebrow: "Compliance", title: "Security auditing", description: "Security events recorded for this organization." },
];

const UNITS: Record<string, string> = {
  sec: "sec",
  min: "min",
  hrs: "hrs",
  days: "days",
  chars: "chars",
  passwords: "passwords",
  attempts: "attempts",
  lockouts: "lockouts",
};

/** Allowed range for a delegated number: never weaker than the baseline. */
function allowedRange(field: SecurityGovernanceField, baseline: number) {
  let min = field.min ?? 0;
  let max = field.max ?? Number.MAX_SAFE_INTEGER;

  if (field.strictness === "higher_stricter") min = Math.max(min, baseline);
  if (field.strictness === "lower_stricter") max = Math.min(max, baseline);
  if (field.strictness === "lower_stricter_zero_off" && baseline > 0) {
    min = Math.max(min, 1);
    max = Math.min(max, baseline);
  }

  return { min, max };
}

function describeValue(field: SecurityGovernanceField, value: unknown): string {
  if (field.type === "boolean") return value ? "On" : "Off";

  const n = Number(value);

  if (n === 0 && ["inactivityTimeoutMinutes", "maximumSessionHours"].includes(field.key)) return "No limit";
  if (n === 0 && field.key === "rememberMeDays") return "Disabled";

  return `${n}${field.unit ? ` ${UNITS[field.unit] ?? field.unit}` : ""}`;
}

function NumberControl({
  field,
  value,
  range,
  disabled,
  labelledBy,
  onCommit,
}: {
  field: SecurityGovernanceField;
  value: number;
  range: { min: number; max: number };
  disabled: boolean;
  labelledBy: string;
  onCommit: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const parsed = Number(text);
  const invalid = text.trim() === "" || !Number.isInteger(parsed) || parsed < range.min || parsed > range.max;

  const commit = () => {
    if (invalid) {
      setText(String(value));
      return;
    }

    if (parsed !== value) onCommit(parsed);
  };

  return (
    <span className="oisec-number">
      <input
        type="number"
        inputMode="numeric"
        step={1}
        min={range.min}
        max={range.max === Number.MAX_SAFE_INTEGER ? undefined : range.max}
        value={text}
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
      />
      {field.unit && <span className="oisec-number__unit">{UNITS[field.unit] ?? field.unit}</span>}
      {invalid && !disabled && (
        <span className="oisec-number__hint" role="alert">
          Allowed: {range.min}–{range.max === Number.MAX_SAFE_INTEGER ? "∞" : range.max}
        </span>
      )}
    </span>
  );
}

function SettingRow({
  field,
  policy,
  editable,
  baseline,
  overridden,
  saving,
  onChange,
}: {
  field: SecurityGovernanceField;
  policy: Record<string, unknown>;
  editable: boolean;
  baseline: boolean | number | undefined;
  overridden: boolean;
  saving: boolean;
  onChange: (patch: Partial<SecurityPolicy>) => void;
}) {
  const labelId = useId();
  const value = policy[field.key];

  // Booleans where the baseline is already "on" cannot be turned off.
  const booleanLocked =
    field.type === "boolean" && field.strictness === "true_stricter" && baseline === true;

  const canChange = editable && !booleanLocked && field.enforcement === "enforced";

  let status: { tone: string; text: string };

  if (field.enforcement === "unavailable") status = { tone: "unavailable", text: "Not available yet" };
  else if (field.enforcement === "locked") status = { tone: "locked", text: "Always on · set by Fockis" };
  else if (!editable) status = { tone: "locked", text: "Locked by Fockis" };
  else if (booleanLocked) status = { tone: "locked", text: "Required by Fockis" };
  else if (overridden) status = { tone: "custom", text: `Stricter than Fockis (${describeValue(field, baseline)})` };
  else status = { tone: "open", text: "You can make this stricter" };

  const parentOff =
    field.dependsOn !== undefined && policy[field.dependsOn] === false;

  return (
    <div className={`oisec-row${parentOff ? " is-dimmed" : ""}`}>
      <div className="oisec-row__text">
        <div className="oisec-row__title">
          <span id={labelId}>{field.label}</span>
          <span className={`oisec-badge oisec-badge--${status.tone}`}>{status.text}</span>
        </div>
        <p>{field.description}</p>
      </div>

      <div className="oisec-row__control">
        {field.type === "boolean" ? (
          <button
            type="button"
            role="switch"
            aria-checked={value === true}
            aria-labelledby={labelId}
            disabled={!canChange || saving}
            className={`oisec-switch${value === true ? " is-on" : ""}`}
            onClick={() => onChange({ [field.key]: !(value === true) } as Partial<SecurityPolicy>)}
          >
            <span className="oisec-switch__track" aria-hidden="true">
              <span className="oisec-switch__thumb" />
            </span>
            <span className="oisec-switch__label">{value === true ? "ON" : "OFF"}</span>
          </button>
        ) : (
          <NumberControl
            field={field}
            value={Number(value)}
            range={allowedRange(field, Number(baseline ?? 0))}
            disabled={!canChange || saving}
            labelledBy={labelId}
            onCommit={(next) => onChange({ [field.key]: next } as Partial<SecurityPolicy>)}
          />
        )}
      </div>
    </div>
  );
}

export default function SecurityPolicyCard({
  policy,
  onChange,
  saving = false,
}: Props) {
  const governance = policy.governance;

  if (!governance) {
    return (
      <section className="oisec">
        <p className="oisec-empty">
          Security settings are managed by Fockis. Reload the page to see the settings that apply to your organization.
        </p>
      </section>
    );
  }

  const delegated = new Set(governance.delegatedFields);
  const overridden = new Set(governance.overriddenFields);
  const values = policy as unknown as Record<string, unknown>;

  // Settings the organization can actually change (booleans that Fockis
  // already requires cannot be turned off, so they are not counted).
  const delegatedCount = governance.fields.filter(
    (field) =>
      delegated.has(field.key) &&
      field.enforcement === "enforced" &&
      !(
        field.type === "boolean" &&
        field.strictness === "true_stricter" &&
        governance.platformBaseline[field.key] === true
      ),
  ).length;

  return (
    <section className="oisec" aria-labelledby="oisec-title">
      <header className="oisec-header">
        <div>
          <span className="oisec-eyebrow">Protection</span>
          <h2 id="oisec-title">Security policies</h2>
          <p>
            These settings apply to your organization-managed users. Fockis sets the minimum security for every organization;
            you can make the {delegatedCount} settings marked <strong>You can make this stricter</strong> stronger, but never weaker.
          </p>
        </div>
        <div className="oisec-summary" aria-label="Summary">
          <span>
            <strong>{delegatedCount}</strong> adjustable
          </span>
          <span>
            <strong>{governance.overriddenFields.length}</strong> tightened
          </span>
          <span>
            <strong>{governance.lockedFields.length}</strong> locked by Fockis
          </span>
        </div>
      </header>

      {saving && (
        <p className="oisec-saving" role="status">
          Saving…
        </p>
      )}

      {SECTIONS.map((section) => {
        const fields = governance.fields.filter((field) => field.section === section.key);
        if (!fields.length) return null;

        return (
          <div key={section.key} className="oisec-section">
            <div className="oisec-section__head">
              <span className="oisec-eyebrow">{section.eyebrow}</span>
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>

            <div className="oisec-section__rows">
              {fields.map((field) => (
                <SettingRow
                  key={field.key}
                  field={field}
                  policy={values}
                  editable={delegated.has(field.key)}
                  baseline={governance.platformBaseline[field.key]}
                  overridden={overridden.has(field.key)}
                  saving={saving}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
