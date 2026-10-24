import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileText, Search, UserRound } from "lucide-react";

import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminDataTable, type AdminTableColumn } from "../../components/AdminDataTable";
import { AdminErrorState } from "../../components/AdminStates";
import { moderationApi, moderationError } from "../moderationApi";
import { REASON_OPTIONS, STATUS_LABELS, type CaseFilters, type CaseList, type CaseSummary } from "../moderationTypes";
import { AppealBadge, CaseStatusBadge, ModerationTabs, PersonCell, PriorityBadge, formatRelative } from "../components/ModerationParts";

const PAGE_SIZE = 25;

const FILTER_KEYS = ["status", "targetType", "reason", "priority", "assignedTo", "appealStatus", "minReports", "from", "to", "q", "sort"] as const;

/**
 * The moderation queue (mode="queue") and the appeals list
 * (mode="appeals"). Filters live in the URL so a view can be shared and
 * survives reloads.
 */
export default function ModerationQueuePage({ mode = "queue" }: { mode?: "queue" | "appeals" }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<CaseList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(params.get("q") ?? "");

  const page = Math.max(1, Number(params.get("page")) || 1);

  const filters = useMemo<CaseFilters>(() => {
    const result: CaseFilters = { page, limit: PAGE_SIZE };
    FILTER_KEYS.forEach((key) => {
      const value = params.get(key);
      if (value) (result as Record<string, unknown>)[key] = value;
    });
    if (mode === "queue" && !result.status) result.status = "open";
    // "To" is inclusive of the whole selected day.
    if (result.to && /^\d{4}-\d{2}-\d{2}$/.test(result.to)) result.to = `${result.to}T23:59:59.999`;
    return result;
  }, [params, page, mode]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setData(mode === "appeals" ? await moderationApi.appeals(filters) : await moderationApi.cases(filters));
    } catch (caught) {
      setError(moderationError(caught, "Couldn't load cases."));
    } finally {
      setLoading(false);
    }
  }, [filters, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    setParams(next);
  }

  function clearFilters() {
    setSearch("");
    setParams(new URLSearchParams(), { replace: true });
  }

  const columns: AdminTableColumn<CaseSummary>[] = [
    {
      key: "priority",
      header: "Priority",
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: "target",
      header: "Reported",
      render: (row) => (
        <span className="fkmod-target">
          <span className="fkmod-target__icon" aria-hidden="true">
            {row.targetType === "post" ? <FileText size={15} /> : <UserRound size={15} />}
          </span>
          <span className="fkmod-target__text">
            <strong>{row.targetType === "post" ? "Post" : "Account"}</strong>
            <small>{row.preview || "—"}</small>
          </span>
        </span>
      ),
    },
    { key: "user", header: "Reported user", render: (row) => <PersonCell person={row.reportedUser} /> },
    {
      key: "reason",
      header: "Main reason",
      render: (row) => <span className="fkmod-reason">{row.topReasonLabel || "—"}</span>,
    },
    {
      key: "reports",
      header: "Reporters",
      render: (row) => (
        <span className="fkmod-count" title={`${row.totalReportCount} total reports, ${row.eligibleReporterCount} counted`}>
          {row.eligibleReporterCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className="fkmod-badges">
          <CaseStatusBadge status={row.status} />
          <AppealBadge status={row.appealStatus} />
        </span>
      ),
    },
    { key: "assigned", header: "Assigned", render: (row) => <PersonCell person={row.assignedTo} fallback="Unassigned" /> },
    { key: "latest", header: "Latest report", render: (row) => <span className="fk-muted">{formatRelative(row.latestReportAt)}</span> },
  ];

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const hasFilters = FILTER_KEYS.some((key) => params.get(key));

  const toolbar = (
    <div className="fk-filterbar">
      <div className="fk-toolbar">
        <form
          className="fk-search fk-toolbar__grow"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update("q", search.trim());
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by @username, user ID, post ID or case ID"
            aria-label="Search cases"
          />
        </form>

        <select className="fk-select" value={filters.status ?? ""} onChange={(event) => update("status", event.target.value)} aria-label="Status">
          {mode === "appeals" && <option value="">Any status</option>}
          <option value="open">Open cases</option>
          <option value="all">All cases</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select className="fk-select" value={params.get("targetType") ?? ""} onChange={(event) => update("targetType", event.target.value)} aria-label="Type">
          <option value="">Posts & accounts</option>
          <option value="post">Posts</option>
          <option value="account">Accounts</option>
        </select>

        <select className="fk-select" value={params.get("reason") ?? ""} onChange={(event) => update("reason", event.target.value)} aria-label="Reason">
          <option value="">Any reason</option>
          {REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select className="fk-select" value={params.get("priority") ?? ""} onChange={(event) => update("priority", event.target.value)} aria-label="Priority">
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="fk-toolbar">
        <select className="fk-select" value={params.get("assignedTo") ?? ""} onChange={(event) => update("assignedTo", event.target.value)} aria-label="Assignment">
          <option value="">Anyone</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
        </select>

        {mode === "queue" && (
          <select className="fk-select" value={params.get("appealStatus") ?? ""} onChange={(event) => update("appealStatus", event.target.value)} aria-label="Appeal">
            <option value="">Any appeal state</option>
            <option value="pending">Appeal pending</option>
            <option value="upheld">Appeal upheld</option>
            <option value="overturned">Appeal accepted</option>
          </select>
        )}

        <select className="fk-select" value={params.get("minReports") ?? ""} onChange={(event) => update("minReports", event.target.value)} aria-label="Minimum reporters">
          <option value="">Any number of reporters</option>
          <option value="3">3+ reporters</option>
          <option value="5">5+ reporters</option>
          <option value="10">10+ reporters</option>
        </select>

        <label className="fkmod-date">
          <span>From</span>
          <input type="date" value={params.get("from") ?? ""} onChange={(event) => update("from", event.target.value)} />
        </label>
        <label className="fkmod-date">
          <span>To</span>
          <input type="date" value={params.get("to") ?? ""} onChange={(event) => update("to", event.target.value)} />
        </label>

        <select className="fk-select" value={params.get("sort") ?? ""} onChange={(event) => update("sort", event.target.value)} aria-label="Sort">
          <option value="">{mode === "appeals" ? "Newest first" : "Highest priority first"}</option>
          <option value="priority">Highest priority first</option>
          <option value="newest">Newest reports first</option>
          <option value="oldest">Oldest first</option>
          <option value="reports">Most reporters first</option>
        </select>

        {hasFilters && (
          <button type="button" className="fk-btn fk-btn--ghost fk-btn--sm" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );

  const footer = data && data.total > 0 && (
    <div className="fkmod-pagination">
      <span className="fk-muted">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total.toLocaleString()}
      </span>
      <span className="fkmod-pagination__buttons">
        <button type="button" className="fk-btn fk-btn--ghost fk-btn--sm" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
          Previous
        </button>
        <span className="fk-muted">
          Page {page} of {totalPages}
        </span>
        <button type="button" className="fk-btn fk-btn--ghost fk-btn--sm" disabled={!data.hasMore || loading} onClick={() => goToPage(page + 1)}>
          Next
        </button>
      </span>
    </div>
  );

  return (
    <div className="fk-page fkmod">
      <AdminPageHeader
        title={mode === "appeals" ? "Appeals" : "Moderation queue"}
        description={
          mode === "appeals"
            ? "Users asking for a decision to be reviewed again. Review appeals you didn't decide yourself where possible."
            : "One case per reported post or account. Reporter counts include unique, valid reports only."
        }
      />

      <ModerationTabs />

      {error && !data ? (
        <AdminErrorState message={error} onRetry={() => void load()} />
      ) : (
        <AdminDataTable
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(row) => row.id}
          loading={loading && !data}
          emptyTitle={mode === "appeals" ? "No appeals to review" : hasFilters ? "No cases match these filters" : "The queue is clear"}
          emptyDescription={mode === "appeals" ? "New appeals will appear here." : "New reports will appear here as they arrive."}
          onRowClick={(row) => navigate(`/admin/moderation/cases/${row.id}`)}
          toolbar={toolbar}
          footer={footer || undefined}
        />
      )}
    </div>
  );
}
