import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CircleAlert,
  History,
  Info,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserX,
  Users,
} from "lucide-react";

import { Card, SmError, SmLoading, ViewAll, formatDateTime, timeAgo, useAdminQuery } from "../../support/components/SmParts";
import { Metric } from "../components/SecurityControls";
import { useSecurityContext } from "../SecurityLayout";
import { formatPolicyValue, securityAdminApi, type PolicyField, type SecurityEvent } from "../securityAdminApi";

export function eventLabel(event: Pick<SecurityEvent, "action">): string {
  const labels: Record<string, string> = {
    "auth.login.success": "Signed in",
    "auth.login.failed": "Failed sign-in",
    "auth.login.locked": "Account locked",
    "auth.login.password_verified": "Password verified (two-factor pending)",
    "auth.login.denied_disabled": "Sign-in to disabled account",
    "auth.password.expired": "Password expired",
    "auth.password_reset.requested": "Password reset requested",
    "auth.password_reset.throttled": "Password reset throttled",
    "auth.mfa.recovery_code_used": "Recovery code used",
    "auth.reauthenticated": "Reauthenticated",
    "account.password_changed": "Password changed",
    "account.password_reset": "Password reset",
    "account.admin_password_reset": "Password reset by administrator",
    "account.mfa_enabled": "Two-factor turned on",
    "account.mfa_disabled": "Two-factor turned off",
    "account.recovery_codes_regenerated": "Recovery codes replaced",
    "account.email_changed": "Email changed",
    "account.sessions_revoked": "Signed out of other sessions",
    "session.revoked": "Sessions revoked",
    "security.policy.updated": "Security policy changed",
    "security.policy.update_denied": "Policy change refused",
    "security.organization_policy.updated": "Organization policy changed",
    "security.audit.exported": "Audit log exported",
    "admin.account.unlocked": "Account unlocked by administrator",
    "admin.account.mfa_reset": "Two-factor reset by administrator",
    "admin.account.password_change_required": "Password change required by administrator",
  };

  return labels[event.action] ?? event.action;
}

export function outcomeTone(outcome: string | null, severity: string | null): "red" | "amber" | "green" | "gray" | "blue" {
  if (severity === "critical" || severity === "high") return "red";
  if (outcome === "failure" || outcome === "denied") return "amber";
  if (outcome === "success") return "green";
  return "gray";
}

export default function SecurityOverviewPage() {
  const { view } = useSecurityContext();
  const { data, loading, error, refetch } = useAdminQuery(() => securityAdminApi.overview(), []);

  if (loading && !data) return <SmLoading label="Loading security overview…" />;
  if (error && !data) return <SmError message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const fieldByKey = new Map<string, PolicyField>((view?.fields ?? []).map((f) => [f.key, f]));
  const fmt = (key: string, value: unknown) => formatPolicyValue(fieldByKey.get(key), value);

  const mfaRate =
    data.mfa.activeAccounts && data.mfa.enrolledAccounts !== null
      ? `${Math.round((data.mfa.enrolledAccounts / data.mfa.activeAccounts) * 100)}% of active accounts`
      : undefined;

  const a = data.policy.accounts;

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Security Overview</h2>
          <p>Live figures from the database. Anything that cannot be measured is shown as unavailable.</p>
        </div>
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void refetch()} disabled={loading}>
          <RefreshCw size={15} aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {data.alerts.length > 0 && (
        <section className="fksec-alerts" aria-label="Needs attention">
          {data.alerts.map((alert) => (
            <div key={alert.title} className={`fksec-alert fksec-alert--${alert.level}`}>
              {alert.level === "info" ? <Info size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
              <div>
                <strong>{alert.title}</strong>
                <span>{alert.detail}</span>
              </div>
              {alert.link && (
                <Link to={alert.link} className="fksm-link">
                  Review
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="fksm-stats fksec-metrics" aria-label="Summary">
        <Metric tone="red" icon={<CircleAlert size={26} aria-hidden="true" />} label="Failed sign-ins (24h)" value={data.authentication.failedLast24h} sub={data.authentication.failedLast7d !== null ? `${data.authentication.failedLast7d.toLocaleString()} in 7 days` : undefined} />
        <Metric tone="amber" icon={<LockKeyhole size={26} aria-hidden="true" />} label="Locked accounts" value={data.accounts.lockedNow} sub={data.authentication.lockoutsLast7d !== null ? `${data.authentication.lockoutsLast7d.toLocaleString()} lockouts in 7 days` : undefined} />
        <Metric tone="purple" icon={<UserX size={26} aria-hidden="true" />} label="Suspicious sign-ins (7d)" value={data.authentication.suspiciousLast7d} sub="New device + network, or after failures" />
        <Metric tone="green" icon={<Smartphone size={26} aria-hidden="true" />} label="Accounts with two-factor" value={data.mfa.enrolledAccounts} sub={mfaRate} />
        <Metric tone="blue" icon={<Users size={26} aria-hidden="true" />} label="Active in last 15 min" value={data.accounts.activeLast15Minutes} sub="Accounts with recent API activity" />
      </section>

      <div className="fksec-overview-grid">
        <Card title="Policy status" icon={<ShieldCheck size={18} aria-hidden="true" />} action={<ViewAll to="/admin/security/authentication">All policies</ViewAll>}>
          <ul className="fksec-status">
            <li>
              <span>Minimum password length</span>
              <strong>{fmt("minimumPasswordLength", a.minimumPasswordLength)}</strong>
            </li>
            <li>
              <span>Login lockout</span>
              <strong>{a.loginLockoutEnabled ? `After ${fmt("maxFailedLoginAttempts", a.maxFailedLoginAttempts)}` : "Off"}</strong>
            </li>
            <li>
              <span>Two-factor for administrators</span>
              <strong className={a.requireTwoFactorForAdministrators ? "" : "fksec-bad"}>{a.requireTwoFactorForAdministrators ? "Required" : "Not required"}</strong>
            </li>
            <li>
              <span>Two-factor for everyone</span>
              <strong>{a.requireTwoFactor ? "Required" : "Optional"}</strong>
            </li>
            <li>
              <span>User inactivity timeout</span>
              <strong>{fmt("inactivityTimeoutMinutes", a.inactivityTimeoutMinutes)}</strong>
            </li>
            <li>
              <span>Admin Center inactivity timeout</span>
              <strong>{fmt("adminInactivityMinutes", a.adminInactivityMinutes)}</strong>
            </li>
          </ul>
          <p className="fksm-muted fksec-small">
            Version v{data.policy.version} · updated {formatDateTime(data.policy.updatedAt)}
            {data.policy.updatedByName ? ` by ${data.policy.updatedByName}` : ""}
          </p>
        </Card>

        <Card title="Two-factor enforcement" icon={<Smartphone size={18} aria-hidden="true" />} action={<ViewAll to="/admin/security/two-factor">Settings</ViewAll>}>
          <ul className="fksec-status">
            <li>
              <span>Administrators</span>
              <strong>{data.mfa.administrators ?? "Unavailable"}</strong>
            </li>
            <li>
              <span>Administrators without two-factor</span>
              <strong className={data.mfa.administratorsWithoutMfa ? "fksec-warn" : ""}>{data.mfa.administratorsWithoutMfa ?? "Unavailable"}</strong>
            </li>
            <li>
              <span>Accounts enrolled</span>
              <strong>
                {data.mfa.enrolledAccounts ?? "Unavailable"}
                {data.mfa.activeAccounts !== null ? ` of ${data.mfa.activeAccounts.toLocaleString()}` : ""}
              </strong>
            </li>
          </ul>
          <p className="fksm-muted fksec-small">Users who are required to use two-factor enroll during their next sign-in.</p>
        </Card>

        <Card title="Organization identities" icon={<Building2 size={18} aria-hidden="true" />} action={<ViewAll to="/admin/security/organizations">Policies</ViewAll>}>
          <ul className="fksec-status">
            <li>
              <span>Managed identities</span>
              <strong>{data.organizations.managedIdentities ?? "Unavailable"}</strong>
            </li>
            <li>
              <span>Organizations with a security policy</span>
              <strong>{data.organizations.organizationsWithPolicy ?? "Unavailable"}</strong>
            </li>
            <li>
              <span>Organizations requiring two-factor</span>
              <strong>{data.organizations.organizationsRequiringMfa ?? "Unavailable"}</strong>
            </li>
            <li>
              <span>Settings organizations may tighten</span>
              <strong>{data.policy.delegatedCount}</strong>
            </li>
          </ul>
        </Card>

        <Card title="Locked accounts" icon={<LockKeyhole size={18} aria-hidden="true" />} action={<ViewAll to="/admin/security/login-protection#locked">Manage</ViewAll>}>
          {!data.accounts.locked.length ? (
            <p className="fksm-muted">No accounts are locked right now.</p>
          ) : (
            <ul className="fksec-status">
              {data.accounts.locked.map((user) => (
                <li key={user.id}>
                  <span>@{user.username || user.id.slice(-6)}</span>
                  <strong>until {formatDateTime(user.lockedUntil)}</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent security events" icon={<KeyRound size={18} aria-hidden="true" />} action={<ViewAll to="/admin/security/audit">Audit log</ViewAll>} className="fksec-span-2">
          {!data.recentEvents ? (
            <p className="fksm-muted">Security events are unavailable.</p>
          ) : !data.recentEvents.length ? (
            <p className="fksm-muted">No security events recorded yet. Events appear here after sign-ins and policy changes.</p>
          ) : (
            <ul className="fksec-events">
              {data.recentEvents.map((event) => (
                <li key={event.id}>
                  <span className={`fksm-pill fksm-pill--${outcomeTone(event.outcome, event.severity)}`}>{event.outcome ?? "event"}</span>
                  <span className="fksec-events__what">
                    <strong>{eventLabel(event)}</strong>
                    <small>{event.actorName || event.targetType || ""}</small>
                  </span>
                  <time dateTime={event.createdAt ?? undefined}>{timeAgo(event.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent policy changes" icon={<History size={18} aria-hidden="true" />} className="fksec-span-2">
          {!data.recentPolicyChanges ? (
            <p className="fksm-muted">Change history is unavailable.</p>
          ) : !data.recentPolicyChanges.length ? (
            <p className="fksm-muted">No policy changes yet.</p>
          ) : (
            <ul className="fksec-events">
              {data.recentPolicyChanges.map((rev) => (
                <li key={rev.id}>
                  <span className={`fksm-pill fksm-pill--${rev.highRisk ? "red" : "blue"}`}>{rev.scope === "organization" ? "Organization" : `v${rev.version}`}</span>
                  <span className="fksec-events__what">
                    <strong>
                      {rev.changes.length} setting{rev.changes.length === 1 ? "" : "s"} changed
                    </strong>
                    <small>
                      {rev.changes
                        .slice(0, 3)
                        .map((c) => fieldByKey.get(c.field)?.label ?? c.field)
                        .join(", ")}
                      {rev.changes.length > 3 ? "…" : ""} · {rev.actorName || "Administrator"}
                    </small>
                  </span>
                  <time dateTime={rev.createdAt ?? undefined}>{timeAgo(rev.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
