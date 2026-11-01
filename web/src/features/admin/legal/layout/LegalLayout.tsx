import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import {
  BriefcaseBusiness,
  Clock3,
  Database,
  Download,
  FileText,
  Layers,
  LayoutGrid,
  Lock,
  MonitorCheck,
  Scale,
  ShieldCheck,
  UserX,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import LegalIllustration from "../components/LegalIllustration";
import { legalAdminApi, type LegalDashboard } from "../legalAdminApi";
import "../../support/styles/SupportMod.scss";
import "../styles/Legal.scss";

const P = PERMISSIONS;
export const LEGAL_BASE = "/admin/legal";

export interface LegalContext {
  dashboard: LegalDashboard | null;
  refreshCounts: () => void;
}

export function useLegal() {
  return useOutletContext<LegalContext>();
}

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  anyOf: string[];
  end?: boolean;
}

const NAV: NavEntry[] = [
  { to: LEGAL_BASE, label: "Overview", icon: LayoutGrid, anyOf: [P.LEGAL_VIEW], end: true },
  { to: `${LEGAL_BASE}/evidence`, label: "Evidence Archive", icon: Database, anyOf: [P.LEGAL_VIEW] },
  { to: `${LEGAL_BASE}/deletions`, label: "Deleted Account Records", icon: UsersRound, anyOf: [P.LEGAL_DELETIONS_VIEW] },
  { to: `${LEGAL_BASE}/requests`, label: "Legal Requests", icon: FileText, anyOf: [P.LEGAL_VIEW] },
  { to: `${LEGAL_BASE}/holds`, label: "Legal Holds", icon: Lock, anyOf: [P.LEGAL_VIEW] },
  { to: `${LEGAL_BASE}/exports`, label: "Evidence Export", icon: Download, anyOf: [P.LEGAL_VIEW] },
  { to: `${LEGAL_BASE}/audit`, label: "Access Audit Logs", icon: Clock3, anyOf: [P.LEGAL_AUDIT_VIEW] },
  { to: `${LEGAL_BASE}/retention`, label: "Retention Policies", icon: Layers, anyOf: [P.LEGAL_VIEW] },
];

const DETAIL = /^\/admin\/legal\/(evidence|requests|holds)\/[^/]+/;

export default function LegalLayout() {
  const { can } = useAdminAccess();
  const { pathname } = useLocation();
  const [dashboard, setDashboard] = useState<LegalDashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const compact = DETAIL.test(pathname);

  const refreshCounts = useCallback(() => {
    legalAdminApi
      .dashboard()
      .then((d) => {
        setDashboard(d);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const value = (n: number | undefined) => (dashboard && n !== undefined ? n.toLocaleString() : failed ? "—" : "…");
  const stats = [
    { tone: "blue", icon: MonitorCheck, value: value(dashboard?.preservedRecords), label: "Preserved Records", sub: "Under retention", to: `${LEGAL_BASE}/evidence` },
    { tone: "red", icon: Lock, value: value(dashboard?.activeHolds), label: "Legal Holds", sub: dashboard?.holdsDueForReview ? `${dashboard.holdsDueForReview} due for review` : "Active", to: `${LEGAL_BASE}/holds` },
    { tone: "amber", icon: BriefcaseBusiness, value: value(dashboard?.openRequests), label: "Legal Requests", sub: dashboard?.overdueRequests ? `${dashboard.overdueRequests} overdue` : "In progress", to: `${LEGAL_BASE}/requests` },
    { tone: "purple", icon: UserX, value: value(dashboard?.deletionRecords), label: "Deleted Account Records", sub: "Available for review", to: `${LEGAL_BASE}/deletions` },
    {
      tone: dashboard && !dashboard.audit.intact ? "red" : "green",
      icon: ShieldCheck,
      value: dashboard ? (dashboard.audit.intact ? "100%" : "Failed") : failed ? "—" : "…",
      label: "Audit Integrity",
      sub: dashboard ? (dashboard.audit.intact ? "All actions logged" : "Log chain broken — review") : "All actions logged",
      to: `${LEGAL_BASE}/audit`,
    },
  ];

  return (
    <div className="fksm fklg">
      <header className={`fksm-banner fklg-banner${compact ? " fksm-banner--compact" : ""}`}>
        <Scale className="fksm-banner__icon" size={compact ? 34 : 46} strokeWidth={2.1} aria-hidden="true" />
        <div className="fksm-banner__text">
          <h1>Legal &amp; Evidence Management</h1>
          <p>Preserve, review, and manage user records, deleted accounts, legal requests, and evidence retention.</p>
        </div>
        <LegalIllustration className="fksm-banner__art" />
      </header>

      {!compact && (
        <section className="fksm-stats" aria-label="Summary">
          {stats.map((s) => (
            <Link key={s.label} to={s.to} className={`fksm-stat fksm-stat--${s.tone}`}>
              <span className="fksm-stat__icon">
                <s.icon size={28} strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="fksm-stat__body">
                <strong>{s.value}</strong>
                <b>{s.label}</b>
                <span className="fksm-stat__sub">{s.sub}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      <div className="fksm-body">
        <nav className="fksm-subnav" aria-label="Legal & Evidence">
          <ul>
            {NAV.filter((n) => can(n.anyOf)).map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="fksm-main">
          <Outlet context={{ dashboard, refreshCounts } satisfies LegalContext} />
        </div>
      </div>
    </div>
  );
}
