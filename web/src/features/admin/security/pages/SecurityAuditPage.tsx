import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, ScrollText, Search } from "lucide-react";

import { Pager, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery } from "../../support/components/SmParts";
import { securityAdminApi, securityError } from "../securityAdminApi";
import { eventLabel, outcomeTone } from "./SecurityOverviewPage";
import PolicySectionPage from "./PolicySectionPage";

const ACTION_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "All security events" },
  { value: "auth.login", label: "Sign-ins" },
  { value: "auth.login.failed", label: "Failed sign-ins" },
  { value: "auth.login.locked", label: "Lockouts" },
  { value: "auth.password", label: "Password resets" },
  { value: "account.", label: "Account security changes" },
  { value: "session.", label: "Session revocations" },
  { value: "security.policy", label: "Platform policy changes" },
  { value: "security.organization_policy", label: "Organization policy changes" },
  { value: "admin.account", label: "Administrator recovery actions" },
];

/**
 * Security Audit Logs: security events from the shared Admin Center audit
 * collection, with filtering, search, pagination and CSV export. The
 * retention setting is edited below the log.
 */
export default function SecurityAuditPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      action: params.get("action") ?? "",
      outcome: params.get("outcome") ?? "",
      severity: params.get("severity") ?? "",
      search: params.get("search") ?? "",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      page: Number(params.get("page") ?? 1) || 1,
    }),
    [params],
  );

  const query = useMemo(() => {
    const out: Record<string, string | number> = { page: filters.page, pageSize: 25 };
    for (const [key, value] of Object.entries(filters)) {
      if (key !== "page" && value) out[key] = key === "to" ? `${value}T23:59:59.999Z` : value;
    }
    return out;
  }, [filters]);

  const events = useAdminQuery(() => securityAdminApi.events(query), [JSON.stringify(query)]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);

    try {
      const { page: _page, pageSize: _size, ...rest } = query;
      void _page;
      void _size;
      const blob = await securityAdminApi.exportEvents(rest);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fockis-security-events-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setExportError(securityError(error, "The export failed."));
    } finally {
      setExporting(false);
    }
  };

  const data = events.data;

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Security Audit Logs</h2>
          <p>Sign-ins, lockouts, password and two-factor changes, session revocations and policy changes. Records cannot be edited or deleted.</p>
        </div>
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => void exportCsv()} disabled={exporting}>
          <Download size={15} aria-hidden="true" /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </header>

      {exportError && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {exportError}
        </p>
      )}

      <div className="fksm-card">
        <form
          className="fksm-filters fksec-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setFilter("search", search.trim());
          }}
        >
          <label className="fksm-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Search action, user ID, name or IP" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search events" />
          </label>
          <select className="fksm-select" value={filters.action} onChange={(e) => setFilter("action", e.target.value)} aria-label="Event type">
            {ACTION_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select className="fksm-select" value={filters.outcome} onChange={(e) => setFilter("outcome", e.target.value)} aria-label="Outcome">
            <option value="">Any outcome</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="denied">Denied</option>
          </select>
          <select className="fksm-select" value={filters.severity} onChange={(e) => setFilter("severity", e.target.value)} aria-label="Severity">
            <option value="">Any severity</option>
            <option value="info">Info</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <label className="fksec-date">
            <span>From</span>
            <input type="date" className="fksm-input" value={filters.from} onChange={(e) => setFilter("from", e.target.value)} />
          </label>
          <label className="fksec-date">
            <span>To</span>
            <input type="date" className="fksm-input" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
          </label>
          <button type="submit" className="fksm-btn fksm-btn--secondary">
            Search
          </button>
        </form>

        {events.loading && !data ? (
          <SmLoading />
        ) : events.error ? (
          <SmError message={events.error} onRetry={() => void events.refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty icon={<ScrollText size={22} />} title="No events" text="No security events match these filters." />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table fksec-audit">
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Event</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Target</th>
                    <th scope="col">IP</th>
                    <th scope="col">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((event) => (
                    <tr key={event.id}>
                      <td className="fksec-nowrap">{formatDateTime(event.createdAt)}</td>
                      <td>
                        <strong>{eventLabel(event)}</strong>
                        <small className="fksec-code">{event.action}</small>
                      </td>
                      <td>
                        <span className={`fksm-pill fksm-pill--${outcomeTone(event.outcome, event.severity)}`}>{event.outcome ?? "—"}</span>
                        {event.severity && <small className="fksec-sev">{event.severity}</small>}
                      </td>
                      <td>{event.actorName || (event.actorId ? <code>{event.actorId.slice(-8)}</code> : "—")}</td>
                      <td>
                        {event.targetType || "—"}
                        {event.targetId && <code className="fksec-id">{event.targetId.slice(-10)}</code>}
                      </td>
                      <td>{event.ip || "—"}</td>
                      <td>
                        {Object.keys(event.metadata ?? {}).length ? (
                          <details>
                            <summary>View</summary>
                            <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager
              page={data.page}
              total={data.total}
              hasMore={data.page * data.pageSize < data.total}
              onPage={(next) => {
                const p = new URLSearchParams(params);
                p.set("page", String(next));
                setParams(p);
              }}
            />
          </>
        )}
      </div>

      <PolicySectionPage section="auditing" />
    </div>
  );
}
