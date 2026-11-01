import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Headset, MessageSquare } from "lucide-react";

import { useHelpQuery } from "../hooks/useHelpQuery";
import { supportApi } from "../services/supportApi";
import type { HealthState, SupportOverview } from "../types";

const STATUS_COPY: Record<HealthState | "unreachable", { badge: string; text: string; tone: string }> = {
  operational: { badge: "All Systems Operational", text: "Fockis is running normally.", tone: "green" },
  degraded: { badge: "Degraded Performance", text: "Fockis is running slower than usual.", tone: "amber" },
  outage: { badge: "Service Disruption", text: "Some Fockis services are not responding.", tone: "red" },
  unreachable: { badge: "Can't reach Fockis", text: "We couldn't reach the Fockis servers from your device.", tone: "red" },
};

/** Live Chat Support card. "Online now" only shows when an agent has switched live chat on. */
export function LiveChatPanel({ overview, signedIn }: { overview: SupportOverview | null; signedIn: boolean }) {
  const navigate = useNavigate();
  const online = Boolean(overview?.liveChatOnline);
  return (
    <div className="fk-help-panel fk-help-chat">
      <div className="fk-help-panel__head">
        <span className="fk-help-panel__glyph"><Headset size={30} strokeWidth={1.9} /></span>
        <h2>Live Chat Support</h2>
        {signedIn && overview && (
          <span className={`fk-help-pill ${online ? "fk-help-pill--green" : "fk-help-pill--gray"}`}>
            <i aria-hidden="true" />
            {online ? "Online now" : "Offline"}
          </span>
        )}
      </div>
      <p className="fk-help-panel__text">
        {signedIn && overview && !online
          ? "Agents are away right now. Send a message and we'll reply in My Support Tickets."
          : "Chat with a Fockis support agent in real time."}
      </p>
      <button type="button" className="fk-help-btn fk-help-btn--primary fk-help-btn--block fk-help-btn--lg" onClick={() => navigate("/help/chat")}>
        <MessageSquare size={20} aria-hidden="true" /> Start Live Chat
      </button>
    </div>
  );
}

/** System Status card, from a real API + database check (GET /support/status). */
export function SystemStatusPanel() {
  const status = useHelpQuery(() => supportApi.status(), []);
  const state: HealthState | "unreachable" | null = status.loading
    ? null
    : status.data
      ? status.data.status
      : "unreachable";
  const copy = state ? STATUS_COPY[state] : null;

  return (
    <div className="fk-help-panel fk-help-status">
      <div className="fk-help-panel__head">
        <span className="fk-help-panel__glyph fk-help-panel__glyph--plain"><Activity size={30} strokeWidth={2.2} /></span>
        <h2>System Status</h2>
      </div>
      {copy ? (
        <>
          <span className={`fk-help-pill fk-help-pill--${copy.tone} fk-help-pill--lg`}>
            <i aria-hidden="true" />
            {copy.badge}
          </span>
          <p className="fk-help-panel__text">{copy.text}</p>
        </>
      ) : (
        <>
          <span className="fk-help-pill fk-help-pill--gray fk-help-pill--lg"><i aria-hidden="true" />Checking status…</span>
          <p className="fk-help-panel__text">Checking the Fockis servers.</p>
        </>
      )}
      <Link to="/help/status" className="fk-help-link">
        View Status Page <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </div>
  );
}
