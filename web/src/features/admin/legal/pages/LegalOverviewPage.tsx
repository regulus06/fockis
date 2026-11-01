import { Link } from "react-router-dom";
import { History, Settings, ShieldCheck } from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { Card, PersonCell, Pill, SmEmpty, SmLoading, ViewAll, formatDateTime } from "../../support/components/SmParts";
import { activity, activityDetails, daysLabel, shortDate } from "../components/legalFormat";
import { useLegal } from "../layout/LegalLayout";

const P = PERMISSIONS;

export default function LegalOverviewPage() {
  const { can } = useAdminAccess();
  const { dashboard } = useLegal();
  const canAudit = can([P.LEGAL_AUDIT_VIEW]);
  const policies = dashboard?.retention.policies ?? [];
  const evidencePolicy = policies.find((p) => p.recordType === "evidence_record");
  const deletionPolicy = policies.find((p) => p.recordType === "deleted_account_record");

  return (
    <div className="fksm-split fklg-split">
      <Card title="Recent Legal & Evidence Activity" action={canAudit ? <ViewAll to="/admin/legal/audit">View All Activity</ViewAll> : undefined}>
        {!dashboard ? (
          <SmLoading />
        ) : !canAudit ? (
          <SmEmpty icon={<History size={24} />} title="Activity is limited to auditors" text="Your role can see legal holds, requests and records, but not the evidence access log." />
        ) : dashboard.recent.length === 0 ? (
          <SmEmpty icon={<History size={24} />} title="No activity yet" text="Legal holds, requests, preservations, exports and record access will be listed here as they happen." />
        ) : (
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards fklg-activity">
              <thead>
                <tr>
                  <th>Activity</th>
                  <th>Details</th>
                  <th>Admin</th>
                  <th>Date &amp; Time</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recent.map((e) => {
                  const a = activity(e.action);
                  const [first, second] = activityDetails(e);
                  return (
                    <tr key={e.id}>
                      <td>
                        <span className={`fklg-act${a.tone ? ` fklg-act--${a.tone}` : ""}`}>
                          <a.icon size={18} aria-hidden="true" />
                          <b>{a.label}</b>
                        </span>
                      </td>
                      <td>
                        <span className="fksm-subject fklg-details">
                          <strong title={first}>{first}</strong>
                          {second && <span title={second}>{second}</span>}
                        </span>
                      </td>
                      <td><PersonCell person={e.actor} fallback="System" /></td>
                      <td className="fksm-date">{formatDateTime(e.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Data Retention & Compliance" icon={<ShieldCheck size={22} />} className="fklg-retention">
        {!dashboard ? (
          <SmLoading />
        ) : (
          <>
            <div className="fklg-retention__box">
              <p className="fklg-retention__status">
                <i className={dashboard.retention.active ? "is-on" : ""} aria-hidden="true" />
                Retention Policy: <Pill tone={dashboard.retention.active ? "green" : "amber"}>{dashboard.retention.active ? "Active" : "Not configured"}</Pill>
              </p>
              <ul>
                {evidencePolicy && <li>Evidence retention: {evidencePolicy.retentionDays ? `${daysLabel(evidencePolicy.retentionDays)}${evidencePolicy.enabled ? "" : " (paused)"}` : "Not set"}</li>}
                {deletionPolicy && <li>Deleted account records: {deletionPolicy.retentionDays ? `${daysLabel(deletionPolicy.retentionDays)}, then anonymized` : "Not set"}</li>}
                {typeof dashboard.retention.configured === "number" && <li>Categories configured: {dashboard.retention.configured} of {dashboard.retention.total}</li>}
                <li>Legal hold exceptions: Indefinite (until released)</li>
                <li>Next policy review: {dashboard.retention.nextReviewAt ? shortDate(dashboard.retention.nextReviewAt) : "Not scheduled"}</li>
                <li>Last retention run: {dashboard.retention.lastRunAt ? formatDateTime(dashboard.retention.lastRunAt) : "Not run yet"}</li>
              </ul>
            </div>
            <Link to="/admin/legal/retention" className="fksm-btn fksm-btn--primary fksm-btn--block fklg-retention__btn">
              <Settings size={18} /> Manage Retention Policies
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
