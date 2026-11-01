import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BellRing, CircleCheck, Clock3, History } from "lucide-react";

import { HelpError, HelpLoading, SignedInOnly } from "../../support/components/HelpStates";
import { useHelpToast } from "../../support/hooks/useHelpToast";
import { apiMessage, policyCenterApi, type MyPolicy } from "../api/policyCenterApi";
import PolicyShell from "../components/PolicyShell";
import { Card, Pill } from "../components/PolicyUi";
import { fmtDate, fmtTime, useLoad } from "../components/policyUtils";
import { ActivityList } from "./PolicyOverviewPage";

function Pending({ items, onAccepted }: { items: MyPolicy[]; onAccepted: () => void }) {
  const notify = useHelpToast();
  const [busy, setBusy] = useState("");

  async function accept(p: MyPolicy) {
    setBusy(p.slug);
    try {
      await policyCenterApi.accept(p.slug, p.versionId);
      notify(`You accepted ${p.title} v${p.version}.`);
      onAccepted();
    } catch (e) {
      notify(apiMessage(e, "We couldn't record your acceptance."), "error");
      onAccepted();
    } finally {
      setBusy("");
    }
  }

  return (
    <Card title="Updates waiting for you" icon={<BellRing size={22} />} className="fk-pol-card--attention">
      <ul className="fk-pol-plist">
        {items.map((p) => (
          <li key={p.slug}>
            <div className="fk-pol-plist__text">
              <strong>
                {p.title} v{p.version}
              </strong>
              <span>
                Effective {fmtDate(p.effectiveDate)}
                {p.previouslyAccepted ? ` · You accepted v${p.previouslyAccepted.version} on ${fmtDate(p.previouslyAccepted.acceptedAt)}` : ""}
              </span>
            </div>
            <Link to={`/settings/policy/guidelines/${p.slug}`} className="fk-pol-btn fk-pol-btn--ghost fk-pol-btn--sm">
              Read
            </Link>
            <button type="button" className="fk-pol-btn fk-pol-btn--primary fk-pol-btn--sm" disabled={busy === p.slug} onClick={() => void accept(p)}>
              {busy === p.slug ? "Saving…" : "Accept"}
            </button>
          </li>
        ))}
      </ul>
      <p className="fk-pol-muted fk-pol-small">Accepting confirms you've read the new version. You can read any policy before accepting.</p>
    </Card>
  );
}

function HistoryContent() {
  const { hash } = useLocation();
  const policies = useLoad(() => policyCenterApi.myPolicies());
  const history = useLoad(() => policyCenterApi.history());
  const activity = useLoad(() => policyCenterApi.activity());
  const pending = (policies.data ?? []).filter((p) => p.status === "action_needed");

  useEffect(() => {
    if (hash === "#activity" && activity.data) document.getElementById("activity")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, activity.data]);

  const refresh = () => {
    void policies.reload();
    void history.reload();
    void activity.reload();
  };

  return (
    <div className="fk-pol-stack">
      {pending.length > 0 && <Pending items={pending} onAccepted={refresh} />}

      <Card title="Policy History" icon={<History size={24} />}>
        <p className="fk-pol-intro">Every policy version you've accepted, and when.</p>
        {history.loading && !history.data ? (
          <HelpLoading />
        ) : history.error ? (
          <HelpError message={history.error} onRetry={() => void history.reload()} />
        ) : !history.data?.length ? (
          <p className="fk-pol-muted">No acceptances recorded yet.</p>
        ) : (
          <div className="fk-pol-table-wrap">
            <table className="fk-pol-table">
              <thead>
                <tr>
                  <th>Policy</th>
                  <th>Version</th>
                  <th>Accepted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <Link to={`/settings/policy/guidelines/${h.slug}`}>{h.title}</Link>
                    </td>
                    <td>v{h.version}</td>
                    <td>
                      {fmtDate(h.acceptedAt)} <span className="fk-pol-muted">{fmtTime(h.acceptedAt)}</span>
                    </td>
                    <td>
                      {h.current ? (
                        <Pill tone="green">
                          <CircleCheck size={13} aria-hidden /> Current
                        </Pill>
                      ) : (
                        <Pill tone="gray">
                          <Clock3 size={13} aria-hidden /> Replaced
                        </Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div id="activity">
        <Card title="Recent Activity" icon={<Clock3 size={22} />}>
          {activity.loading && !activity.data ? <HelpLoading /> : activity.error ? <HelpError message={activity.error} onRetry={() => void activity.reload()} /> : <ActivityList items={activity.data ?? []} />}
        </Card>
      </div>
    </div>
  );
}

export default function PolicyHistoryPage() {
  return (
    <PolicyShell>
      <SignedInOnly what="see your policy history">{() => <HistoryContent />}</SignedInOnly>
    </PolicyShell>
  );
}
