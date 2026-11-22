import { Link } from "react-router-dom";
import { ArrowRight, History } from "lucide-react";

import { Card, Pager, SmError, SmLoading, formatDateTime, useAdminQuery } from "../../support/components/SmParts";
import { useSecurityContext } from "../SecurityLayout";
import {
  SECTION_ROUTES,
  SECTION_TITLES,
  formatPolicyValue,
  securityAdminApi,
  type PolicySectionKey,
} from "../securityAdminApi";
import { useState } from "react";

const ORDER: PolicySectionKey[] = ["password", "login", "sessions", "twoFactor", "alerts", "protection", "auditing"];

/**
 * One page that shows every authentication-related policy side by side for
 * all Fockis accounts and for organization-managed identities, with links to
 * the page where each section is edited and the full change history.
 */
export default function AuthenticationPoliciesPage() {
  const { view, viewError, reloadPolicy } = useSecurityContext();
  const [page, setPage] = useState(1);
  const history = useAdminQuery(() => securityAdminApi.history({ page, pageSize: 15 }), [page]);

  if (viewError && !view) return <SmError message={viewError} onRetry={() => void reloadPolicy()} />;
  if (!view) return <SmLoading label="Loading security policy…" />;

  const delegated = new Set(view.policy.delegatedFields);

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Authentication Policies</h2>
          <p>Everything Fockis enforces at sign-in and during a session, in one place. Select a section to change it.</p>
        </div>
      </header>

      {ORDER.map((section) => {
        const fields = view.fields.filter((f) => f.section === section);
        if (!fields.length) return null;

        return (
          <Card
            key={section}
            title={SECTION_TITLES[section]}
            action={
              <Link to={SECTION_ROUTES[section]} className="fksm-link">
                Edit <ArrowRight size={14} aria-hidden="true" />
              </Link>
            }
          >
            <div className="fksm-table-wrap">
              <table className="fksm-table fksec-matrix">
                <thead>
                  <tr>
                    <th scope="col">Setting</th>
                    <th scope="col">All Fockis accounts</th>
                    <th scope="col">Managed identities (baseline)</th>
                    <th scope="col">Organizations</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.key}>
                      <th scope="row">
                        {field.label}
                        {field.enforcement !== "enforced" && (
                          <small className="fksec-matrix__note">{field.enforcement === "locked" ? "Always on" : "Not available yet"}</small>
                        )}
                      </th>
                      <td>{field.profiles.includes("accounts") ? formatPolicyValue(field, view.policy.accounts[field.key]) : "—"}</td>
                      <td>{field.profiles.includes("managed") ? formatPolicyValue(field, view.policy.managed[field.key]) : "—"}</td>
                      <td>
                        {!field.profiles.includes("managed") ? (
                          "—"
                        ) : delegated.has(field.key) ? (
                          <span className="fksec-tag fksec-tag--delegated">May tighten</span>
                        ) : (
                          <span className="fksec-tag fksec-tag--locked">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}

      <Card title="All policy changes" icon={<History size={18} aria-hidden="true" />}>
        {history.loading && !history.data ? (
          <SmLoading />
        ) : history.error ? (
          <SmError message={history.error} onRetry={() => void history.refetch()} />
        ) : !history.data?.items.length ? (
          <p className="fksm-muted">No changes yet.</p>
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Scope</th>
                    <th scope="col">By</th>
                    <th scope="col">Changes</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.items.map((rev) => (
                    <tr key={rev.id}>
                      <td>{formatDateTime(rev.createdAt)}</td>
                      <td>
                        {rev.scope === "organization" ? "Organization" : `Platform v${rev.version}`}
                        {rev.highRisk && (
                          <>
                            {" "}
                            <span className="fksec-tag fksec-tag--risk">High impact</span>
                          </>
                        )}
                      </td>
                      <td>{rev.actorName || "—"}</td>
                      <td>
                        <ul className="fksec-changelist">
                          {rev.changes.map((change) => {
                            const def = view.fields.find((f) => f.key === change.field);
                            const label = def?.label ?? change.field;

                            return (
                              <li key={`${change.profile}.${change.field}`}>
                                {change.profile === "delegation"
                                  ? `${label}: ${change.to ? "delegated to organizations" : "locked by Fockis"}`
                                  : `${label}${change.profile === "managed" ? " (managed)" : ""}: ${formatPolicyValue(def, change.from)} → ${formatPolicyValue(def, change.to)}`}
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td>{rev.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={history.data.total} hasMore={page * history.data.pageSize < history.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
