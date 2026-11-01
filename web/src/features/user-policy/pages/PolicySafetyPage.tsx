import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, Flag, KeyRound, LifeBuoy, ShieldCheck, ShieldOff, UserX } from "lucide-react";

import { buildFockisUploadUrl } from "../../../config/fockisConfig";
import { getMyReports } from "../../reports/services/reportsApi";
import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import { apiMessage, policyCenterApi, type BlockedUser } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, Pill } from "../components/PolicyUi";
import { fmtDate, fmtTime, useLoad } from "../components/policyUtils";

const blockedName = (u: BlockedUser) => u.name || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Fockis user";

const REPORT_STATUS: Record<string, { label: string; tone: "blue" | "green" }> = {
  received: { label: "Received", tone: "blue" },
  reviewed: { label: "Reviewed", tone: "green" },
};

function Blocked() {
  const notify = useHelpToast();
  const blocked = useLoad(() => policyCenterApi.blocked());
  const [busy, setBusy] = useState("");

  async function unblock(u: BlockedUser) {
    setBusy(u._id);
    try {
      await policyCenterApi.unblock(u._id);
      blocked.setData((blocked.data ?? []).filter((x) => x._id !== u._id));
      notify(`${blockedName(u)} was unblocked.`);
    } catch (e) {
      notify(apiMessage(e, "We couldn't unblock this person."), "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <Card title="Blocked accounts" icon={<UserX size={22} />}>
      <p className="fk-pol-intro">Blocked people can't see your profile or posts, message you or find you in search. They aren't notified.</p>
      {blocked.loading && !blocked.data ? (
        <HelpLoading />
      ) : blocked.error ? (
        <HelpError message={blocked.error} onRetry={() => void blocked.reload()} />
      ) : !blocked.data?.length ? (
        <p className="fk-pol-muted">You haven't blocked anyone. You can block someone from their profile or from a message.</p>
      ) : (
        <ul className="fk-pol-people">
          {blocked.data.map((u) => (
            <li key={u._id}>
              <span className="fk-pol-avatar">{u.profilePicture ? <img src={buildFockisUploadUrl(u.profilePicture)} alt="" /> : blockedName(u).charAt(0).toUpperCase()}</span>
              <div>
                <strong>{blockedName(u)}</strong>
                {u.username && <span>@{u.username}</span>}
              </div>
              <button type="button" className="fk-pol-btn fk-pol-btn--outline fk-pol-btn--sm" disabled={busy === u._id} onClick={() => void unblock(u)}>
                {busy === u._id ? "Unblocking…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Security() {
  const notify = useHelpToast();
  const security = useLoad(() => policyCenterApi.security());
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const result = await policyCenterApi.securityCheck();
      security.setData(result);
      notify(result.issues ? `Security check finished: ${result.issues} thing${result.issues === 1 ? "" : "s"} to review.` : "Security check finished: no issues found.", result.issues ? "info" : "success");
    } catch (e) {
      notify(apiMessage(e, "We couldn't run the check."), "error");
    } finally {
      setChecking(false);
    }
  }

  const s = security.data;
  return (
    <Card
      title="Account security"
      icon={<KeyRound size={22} />}
      action={
        <button type="button" className="fk-pol-btn fk-pol-btn--outline fk-pol-btn--sm" onClick={() => void check()} disabled={checking || !s}>
          {checking ? "Checking…" : "Run security check"}
        </button>
      }
    >
      {security.loading && !s ? (
        <HelpLoading />
      ) : security.error || !s ? (
        <HelpError message={security.error || "Unavailable"} onRetry={() => void security.reload()} />
      ) : (
        <>
          <ul className="fk-pol-checks">
            {s.recommendations.map((r) => (
              <li key={r.id} className={r.level === "good" ? "is-good" : "is-warn"}>
                {r.level === "good" ? <CircleCheck size={19} aria-hidden /> : <CircleAlert size={19} aria-hidden />}
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
          <dl className="fk-pol-dl fk-pol-dl--compact">
            <div>
              <dt>Two-factor authentication</dt>
              <dd>{s.mfaEnabled ? "On" : "Off"}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{s.lastLoginAt ? `${fmtDate(s.lastLoginAt)} ${fmtTime(s.lastLoginAt)}` : "—"}</dd>
            </div>
            <div>
              <dt>Password last changed</dt>
              <dd>{fmtDate(s.passwordChangedAt)}</dd>
            </div>
          </dl>
          <Link to="/settings/account" className="fk-pol-btn fk-pol-btn--primary">
            Change password or two-factor settings
          </Link>
        </>
      )}
    </Card>
  );
}

function MyReports() {
  const reports = useLoad(() => getMyReports(1));
  const items = (reports.data?.items ?? []).slice(0, 5);
  return (
    <Card
      title="Report content"
      icon={<Flag size={22} />}
      action={
        <Link to="/moderation" className="fk-pol-link">
          All my reports
        </Link>
      }
    >
      <p className="fk-pol-intro">Use the ••• menu on any post, comment, profile, message or Fockis Shop listing to report it. Reports are confidential — the person isn't told who reported them.</p>
      <div className="fk-pol-btnrow">
        <Link to="/help/safety" className="fk-pol-btn fk-pol-btn--outline">
          <LifeBuoy size={17} aria-hidden /> Safety help
        </Link>
        <Link to="/help/report-problem" className="fk-pol-btn fk-pol-btn--outline">
          <ShieldOff size={17} aria-hidden /> Report a problem with Fockis
        </Link>
      </div>
      <h3 className="fk-pol-subtitle">Your recent reports</h3>
      {reports.loading && !reports.data ? (
        <HelpLoading />
      ) : reports.error ? (
        <HelpError message={reports.error} onRetry={() => void reports.reload()} />
      ) : !items.length ? (
        <p className="fk-pol-muted">You haven't reported anything.</p>
      ) : (
        <ul className="fk-pol-requests">
          {items.map((r) => {
            const st = REPORT_STATUS[r.status] ?? REPORT_STATUS.received;
            return (
              <li key={r.id}>
                <div>
                  <strong>{r.reasonLabel || r.reason}</strong>
                  <span>
                    {r.targetLabel ? `${r.targetLabel} · ` : ""}
                    {fmtDate(r.createdAt)}
                  </span>
                </div>
                <Pill tone={st.tone}>{st.label}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function PolicySafetyPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="manage your safety settings">
        {() => (
          <div className="fk-pol-grid2">
            <div className="fk-pol-stack">
              <MyReports />
              <Blocked />
            </div>
            <div className="fk-pol-stack">
              <Security />
              <Card title="Need urgent help?" icon={<ShieldCheck size={22} />}>
                <p className="fk-pol-intro">If someone is in immediate danger, contact your local emergency services first. For anything involving a child's safety, report it straight away — these reports are reviewed first.</p>
              </Card>
            </div>
          </div>
        )}
      </SignedInOnly>
    </PolicyShell>
  );
}
