import { Activity, CircleAlert, CircleCheck, Database, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

import HelpShell from "../components/HelpShell";
import HelpPageHeader from "../components/HelpPageHeader";
import { HelpLoading } from "../components/HelpStates";
import { useHelpQuery } from "../hooks/useHelpQuery";
import { supportApi } from "../services/supportApi";
import type { HealthState } from "../types";
import { formatDateTime } from "../utils/helpFormat";

const STATE: Record<HealthState, { label: string; tone: string; icon: typeof CircleCheck }> = {
  operational: { label: "Operational", tone: "green", icon: CircleCheck },
  degraded: { label: "Degraded", tone: "amber", icon: TriangleAlert },
  outage: { label: "Not responding", tone: "red", icon: CircleAlert },
};

/** /help/status — live check of the Fockis API and database (GET /support/status). */
export default function SystemStatusPage() {
  const status = useHelpQuery(() => supportApi.status(), []);
  const data = status.data;
  const overall = data ? STATE[data.status] : null;

  return (
    <HelpShell>
      <div className="fk-help-page">
        <HelpPageHeader
          title="System Status"
          description="A live check of the Fockis servers from your device."
          icon={<Activity size={30} />}
          actions={
            <button type="button" className="fk-help-btn fk-help-btn--secondary" onClick={() => void status.refetch()} disabled={status.loading}>
              <RefreshCw size={16} className={status.loading ? "fk-help-spin" : undefined} /> Check again
            </button>
          }
        />

        <div className="fk-help-card">
          {status.loading && !data ? (
            <HelpLoading label="Checking the Fockis servers…" />
          ) : !data ? (
            <div className="fk-help-state fk-help-state--error">
              <span className="fk-help-state__icon"><CircleAlert size={24} /></span>
              <h3>Can't reach Fockis</h3>
              <p>Your device couldn't reach the Fockis servers. Check your internet connection, then try again.</p>
            </div>
          ) : (
            <>
              <div className="fk-help-subhead__row" style={{ marginBottom: 12 }}>
                <span className={`fk-help-pill fk-help-pill--${overall!.tone} fk-help-pill--lg`}>
                  <i aria-hidden="true" />
                  {data.status === "operational" ? "All Systems Operational" : data.status === "degraded" ? "Degraded Performance" : "Service Disruption"}
                </span>
                <span style={{ color: "var(--help-text-3)", fontSize: 13.5 }}>Checked {formatDateTime(data.checkedAt)}</span>
              </div>
              <div>
                {data.components.map((c) => {
                  const s = STATE[c.status];
                  const Icon = c.id === "database" ? Database : Server;
                  return (
                    <div key={c.id} className="fk-help-status-row">
                      <span className="fk-help-row__icon"><Icon size={18} /></span>
                      <span className="fk-help-row__main">
                        <span className="fk-help-row__title">{c.name}</span>
                        {c.latencyMs !== null && <span className="fk-help-row__sub">Responded in {c.latencyMs} ms</span>}
                      </span>
                      <span className={`fk-help-pill fk-help-pill--${s.tone}`}>
                        <s.icon size={14} /> {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p style={{ color: "var(--help-text-2)", fontSize: 14 }}>
          This page checks that the Fockis API answers and that its database responds. If a feature still isn't working while everything shows as
          operational, please <Link to="/help/report-problem" className="fk-help-link">report a problem</Link>.
        </p>
      </div>
    </HelpShell>
  );
}
