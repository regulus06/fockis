import { useEffect, useState } from "react";

import { adminApi } from "../service/adminApi";

import type { AuditEvent } from "../types/admin.types";

import { AdminPageHeader } from "../components/AdminPageHeader";
import {
  AdminDataTable,
  type AdminTableColumn,
} from "../components/AdminDataTable";
import { AdminErrorState } from "../components/AdminStates";
import { roleLabel } from "../components/AdminRoleBadge";
import { useAdminSessionStore } from "../store/adminSessionStore";

const RISK_VARIANT: Record<string, string> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export function AuditLogsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("ALL");
  const [result, setResult] = useState("ALL");

  const switchToken = useAdminSessionStore(
    (state) => state.switchToken,
  );

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    adminApi
      .getAuditLogs()
      .then((res) => {
        if (cancelled) return;

        /*
         * Support both:
         *
         *   AuditEvent[]
         *
         * and:
         *
         *   { items: AuditEvent[]; total: number }
         */
        const items = Array.isArray(res)
          ? res
          : res.items;

        if (!Array.isArray(items)) {
          throw new Error(
            "Invalid audit log response",
          );
        }

        setEvents(items);
      })
      .catch((e: unknown) => {
        if (cancelled) return;

        setError(
          e instanceof Error
            ? e.message
            : "Failed to load audit logs",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [switchToken]);

  /*
   * Filtering is performed locally because the current
   * backend getAuditLogs() function does not accept filters.
   */
  const filteredEvents = events.filter((event) => {
    const normalizedSearch = search
      .trim()
      .toLowerCase();

    const matchesSearch =
      !normalizedSearch ||
      [
        event.actor,
        event.action,
        event.resource,
        event.target,
        event.ip,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(normalizedSearch),
        );

    const matchesRisk =
      risk === "ALL" ||
      event.risk === risk;

    const matchesResult =
      result === "ALL" ||
      event.result === result;

    return (
      matchesSearch &&
      matchesRisk &&
      matchesResult
    );
  });

  const columns: AdminTableColumn<AuditEvent>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      sortable: true,
      sortValue: (event) => event.timestamp,
      render: (event) =>
        new Date(
          event.timestamp,
        ).toLocaleString(),
    },

    {
      key: "actor",
      header: "Actor",
      render: (event) => event.actor,
    },

    {
      key: "role",
      header: "Role",
      render: (event) =>
        roleLabel(event.actorRole),
    },

    {
      key: "action",
      header: "Action",
      render: (event) =>
        event.action.replace(
          /_/g,
          " ",
        ),
    },

    {
      key: "resource",
      header: "Resource",
      render: (event) =>
        event.resource,
    },

    {
      key: "target",
      header: "Target",
      render: (event) =>
        event.target,
    },

    {
      key: "ip",
      header: "IP",
      render: (event) => (
        <span className="mono">
          {event.ip}
        </span>
      ),
    },

    {
      key: "result",
      header: "Result",
      render: (event) => (
        <span
          className={`fk-badge fk-badge--${
            event.result === "SUCCESS"
              ? "success"
              : "danger"
          }`}
        >
          {event.result}
        </span>
      ),
    },

    {
      key: "risk",
      header: "Risk",
      render: (event) => (
        <span
          className={`fk-badge fk-badge--${
            RISK_VARIANT[event.risk] ??
            "neutral"
          }`}
        >
          {event.risk}
        </span>
      ),
    },
  ];

  if (error) {
    return (
      <AdminErrorState
        message={error}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Audit Logs"
        description="A complete, read-only record of every administrative action. Nothing here can be deleted."
      />

      <AdminDataTable
        columns={columns}
        rows={filteredEvents}
        rowKey={(event) => event.id}
        loading={loading}
        emptyTitle="No audit events match these filters"
        toolbar={
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div className="fk-search">
              <span aria-hidden="true">
                🔍
              </span>

              <input
                placeholder="Search actor, action, target…"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
              />
            </div>

            <select
              className="fk-select"
              value={risk}
              onChange={(event) =>
                setRisk(
                  event.target.value,
                )
              }
            >
              {[
                "ALL",
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL",
              ].map((riskLevel) => (
                <option
                  key={riskLevel}
                  value={riskLevel}
                >
                  {riskLevel === "ALL"
                    ? "All risk levels"
                    : riskLevel}
                </option>
              ))}
            </select>

            <select
              className="fk-select"
              value={result}
              onChange={(event) =>
                setResult(
                  event.target.value,
                )
              }
            >
              {[
                "ALL",
                "SUCCESS",
                "FAILURE",
                "DENIED",
              ].map((resultValue) => (
                <option
                  key={resultValue}
                  value={resultValue}
                >
                  {resultValue === "ALL"
                    ? "All results"
                    : resultValue}
                </option>
              ))}
            </select>
          </div>
        }
        footer={
          <span>
            {filteredEvents.length} events
          </span>
        }
      />
    </div>
  );
}

export default AuditLogsPage;