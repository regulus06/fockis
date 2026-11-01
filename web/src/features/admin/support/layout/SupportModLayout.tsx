import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import {
  BookOpenText,
  CircleCheck,
  EyeOff,
  Flag,
  Headset,
  History,
  LayoutGrid,
  MessageSquareText,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import HelpIllustration from "../../../support/components/HelpIllustration";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import { supportAdminApi, type SupportDashboard } from "../supportAdminApi";
import "../styles/SupportMod.scss";

const P = PERMISSIONS;
const BASE = "/admin/support";

export interface SupportModContext {
  dashboard: SupportDashboard | null;
  /** Re-read the counters after an action (hide, resolve, reply…). */
  refreshCounts: () => void;
}

export function useSupportMod() {
  return useOutletContext<SupportModContext>();
}

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  anyOf: string[];
  count?: (d: SupportDashboard) => number;
  end?: boolean;
}

const NAV: NavEntry[] = [
  { to: BASE, label: "Overview", icon: LayoutGrid, anyOf: [P.SUPPORT_VIEW, P.MODERATION_VIEW], end: true },
  { to: `${BASE}/feedback`, label: "Feedback Inbox", icon: MessageSquareText, anyOf: [P.SUPPORT_VIEW], count: (d) => d.newFeedback },
  { to: `${BASE}/tickets`, label: "Support Tickets", icon: Ticket, anyOf: [P.SUPPORT_VIEW], count: (d) => d.openTickets },
  { to: `${BASE}/reports`, label: "Content Reports", icon: Flag, anyOf: [P.MODERATION_VIEW], count: (d) => d.reportedPosts },
  { to: `${BASE}/hidden-posts`, label: "Hidden Posts", icon: EyeOff, anyOf: [P.MODERATION_VIEW], count: (d) => d.hiddenPosts },
  { to: `${BASE}/history`, label: "Moderation History", icon: History, anyOf: [P.MODERATION_VIEW] },
  { to: `${BASE}/articles`, label: "Help Articles Manager", icon: BookOpenText, anyOf: [P.HELP_CONTENT_MANAGE] },
  { to: `${BASE}/live`, label: "Live Support", icon: Headset, anyOf: [P.SUPPORT_VIEW] },
];

interface StatDef {
  tone: "blue" | "purple" | "amber" | "red" | "green";
  icon: LucideIcon;
  label: string;
  sub: string;
  to: string;
  value: (d: SupportDashboard) => number;
}

const STATS: StatDef[] = [
  { tone: "blue", icon: MessageSquareText, label: "New Feedback", sub: "Awaiting review", to: `${BASE}/feedback`, value: (d) => d.newFeedback },
  { tone: "purple", icon: Ticket, label: "Open Tickets", sub: "Need attention", to: `${BASE}/tickets`, value: (d) => d.openTickets },
  { tone: "amber", icon: Flag, label: "Reported Posts", sub: "Awaiting moderation", to: `${BASE}/reports`, value: (d) => d.reportedPosts },
  { tone: "red", icon: EyeOff, label: "Hidden Posts", sub: "Currently hidden", to: `${BASE}/hidden-posts`, value: (d) => d.hiddenPosts },
  { tone: "green", icon: CircleCheck, label: "Resolved", sub: "Completed requests", to: `${BASE}/tickets?status=resolved`, value: (d) => d.resolved },
];

const DETAIL = /^\/admin\/support\/(tickets|feedback|articles|posts|live)\/[^/]+/;

export default function SupportModLayout() {
  const { can } = useAdminAccess();
  const { pathname } = useLocation();
  const [dashboard, setDashboard] = useState<SupportDashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const compact = DETAIL.test(pathname);

  const refreshCounts = useCallback(() => {
    if (!can([P.SUPPORT_VIEW])) {
      setFailed(true);
      return;
    }
    supportAdminApi
      .dashboard()
      .then((d) => {
        setDashboard(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [can]);

  useEffect(() => {
    refreshCounts();
    const timer = window.setInterval(refreshCounts, 60_000);
    return () => window.clearInterval(timer);
  }, [refreshCounts]);

  const nav = NAV.filter((item) => can(item.anyOf));

  return (
    <div className="fksm">
      <header className={`fksm-banner${compact ? " fksm-banner--compact" : ""}`}>
        <Headset className="fksm-banner__icon" size={compact ? 34 : 46} strokeWidth={2.2} aria-hidden="true" />
        <div className="fksm-banner__text">
          <h1>Support &amp; Moderation</h1>
          <p>Manage feedback, support tickets, reported content, and user posts.</p>
        </div>
        <HelpIllustration className="fksm-banner__art" />
      </header>

      {!compact && (
        <section className="fksm-stats" aria-label="Summary">
          {STATS.map((s) => (
            <Link key={s.label} to={s.to} className={`fksm-stat fksm-stat--${s.tone}`}>
              <span className="fksm-stat__icon">
                <s.icon size={28} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="fksm-stat__body">
                <strong>{dashboard ? s.value(dashboard).toLocaleString() : failed ? "—" : "…"}</strong>
                <b>{s.label}</b>
                <span className="fksm-stat__sub">{s.sub}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <div className="fksm-body">
        <nav className="fksm-subnav" aria-label="Support & Moderation">
          <ul>
            {nav.map((item) => {
              const count = dashboard && item.count ? item.count(dashboard) : 0;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
                    <item.icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                    {count > 0 && <span className="fksm-subnav__count" aria-label={`${count} waiting`}>{count > 99 ? "99+" : count}</span>}
                    {item.label === "Live Support" && dashboard && (
                      <span className={`fksm-online fksm-online--${dashboard.liveChatOnline ? "on" : "off"}`}>
                        <i aria-hidden="true" />
                        {dashboard.liveChatOnline ? "Online" : "Offline"}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="fksm-main">
          <Outlet context={{ dashboard, refreshCounts } satisfies SupportModContext} />
        </div>
      </div>
    </div>
  );
}

export const SUPPORT_MOD_BASE = BASE;
