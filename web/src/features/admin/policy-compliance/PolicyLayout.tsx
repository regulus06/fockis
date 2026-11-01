import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { FileCheck2, FileClock, FileText, Home, ScrollText, Settings, ShieldCheck, SlidersHorizontal, type LucideIcon } from "lucide-react";

import { useAdminAccess } from "../permissions/adminAccess";
import { PERMISSIONS } from "../permissions/permission.constants";
import { policyAdminApi, usePolicyBadge, type PolicyStats } from "./policyAdminApi";
import "../support/styles/SupportMod.scss";
import "./styles/PolicyCompliance.scss";

const P = PERMISSIONS;
export const PC_BASE = "/admin/policy-compliance";

export interface PolicyContext {
  stats: PolicyStats | null;
  statsFailed: boolean;
  refresh: () => void;
}

export function usePolicyContext() {
  return useOutletContext<PolicyContext>();
}

const TABS: { to: string; label: string; icon: LucideIcon; anyOf: string[]; end?: boolean; badge?: boolean }[] = [
  { to: PC_BASE, label: "Overview", icon: Home, anyOf: [P.POLICY_VIEW], end: true },
  { to: `${PC_BASE}/policies`, label: "Policies", icon: FileText, anyOf: [P.POLICY_VIEW] },
  { to: `${PC_BASE}/rules`, label: "Operational Rules", icon: SlidersHorizontal, anyOf: [P.POLICY_VIEW] },
  { to: `${PC_BASE}/versions`, label: "Versions", icon: ShieldCheck, anyOf: [P.POLICY_VIEW] },
  { to: `${PC_BASE}/approvals`, label: "Approvals", icon: FileClock, anyOf: [P.POLICY_VIEW], badge: true },
  { to: `${PC_BASE}/acceptances`, label: "Acceptance Records", icon: FileCheck2, anyOf: [P.POLICY_ACCEPTANCE_VIEW] },
  { to: `${PC_BASE}/audit`, label: "Audit Logs", icon: ScrollText, anyOf: [P.POLICY_AUDIT_VIEW] },
  { to: `${PC_BASE}/settings`, label: "Settings", icon: Settings, anyOf: [P.POLICY_VIEW] },
];

/** Banner art: policy document with a shield, speech cards and a gavel. */
function PolicyAdminArt() {
  return (
    <svg className="fkpc-banner__art" viewBox="0 0 420 130" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="pcDoc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3d86ff" />
          <stop offset="1" stopColor="#1a50d6" />
        </linearGradient>
        <linearGradient id="pcShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4c93ff" />
          <stop offset="1" stopColor="#1647c9" />
        </linearGradient>
        <linearGradient id="pcGavel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3c66d6" />
          <stop offset="1" stopColor="#14307e" />
        </linearGradient>
        <filter id="pcShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1d4fbf" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#pcShadow)">
        <rect x="14" y="60" width="56" height="40" rx="9" fill="#8db4ff" opacity="0.85" />
        <rect x="24" y="72" width="34" height="5" rx="2.5" fill="#fff" />
        <rect x="24" y="83" width="26" height="5" rx="2.5" fill="#fff" />
        <rect x="166" y="34" width="54" height="38" rx="9" fill="#a9c6ff" opacity="0.9" />
        <rect x="176" y="45" width="34" height="5" rx="2.5" fill="#fff" />
        <rect x="176" y="56" width="26" height="5" rx="2.5" fill="#fff" />
      </g>
      <g filter="url(#pcShadow)">
        <path d="M78 10h68l20 20v100H78z" fill="url(#pcDoc)" />
        <path d="M86 18h60l16 16v96H86z" fill="#ffffff" />
        <rect x="98" y="38" width="40" height="6" rx="3" fill="#3d7cf0" />
        <rect x="98" y="52" width="50" height="5" rx="2.5" fill="#bcd0f5" />
        <rect x="98" y="64" width="44" height="5" rx="2.5" fill="#bcd0f5" />
        <rect x="98" y="76" width="30" height="5" rx="2.5" fill="#bcd0f5" />
      </g>
      <g filter="url(#pcShadow)">
        <path d="M150 64l32 11v24c0 20-14 32-32 40-18-8-32-20-32-40V75z" fill="url(#pcShield)" stroke="#ffffff" strokeWidth="3" />
        <path d="M136 102l10 10 20-22" fill="none" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g filter="url(#pcShadow)">
        <rect x="290" y="108" width="96" height="14" rx="4" fill="url(#pcGavel)" />
        <rect x="302" y="98" width="72" height="12" rx="4" fill="#2b55c4" />
        <g transform="rotate(-38 330 58)">
          <rect x="288" y="40" width="70" height="30" rx="7" fill="url(#pcGavel)" />
          <rect x="278" y="36" width="14" height="38" rx="5" fill="#2f5fd9" />
          <rect x="354" y="36" width="14" height="38" rx="5" fill="#2f5fd9" />
          <rect x="318" y="68" width="10" height="70" rx="5" fill="#14307e" />
        </g>
      </g>
    </svg>
  );
}

export default function PolicyLayout() {
  const { can } = useAdminAccess();
  const { pathname } = useLocation();
  const [stats, setStats] = useState<PolicyStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const setBadge = usePolicyBadge((s) => s.set);
  const editor = /\/policies\/(new|[0-9a-f]{24})/.test(pathname);

  const refresh = useCallback(() => {
    policyAdminApi
      .stats()
      .then((s) => {
        setStats(s);
        setBadge(s.pendingApproval);
        setStatsFailed(false);
      })
      .catch(() => setStatsFailed(true));
  }, [setBadge]);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  return (
    <div className="fksm fkpc">
      <header className={`fksm-banner fkpc-banner${editor ? " fksm-banner--compact" : ""}`}>
        <span className="fkpc-banner__icon" aria-hidden="true">
          <svg width={editor ? 34 : 50} height={editor ? 34 : 50} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.5 4.5 5.5v6c0 5 3.3 8.6 7.5 10 4.2-1.4 7.5-5 7.5-10v-6z" />
            <path d="M8.5 9.5h7M8.5 12.5h7M8.5 15.5h4.5" />
          </svg>
        </span>
        <div className="fksm-banner__text">
          <h1>Policy &amp; Compliance Management</h1>
          <p>Create, edit, publish, and manage all Fockis policies, rules, and compliance settings.</p>
        </div>
        <PolicyAdminArt />
      </header>

      <nav className="fkpc-tabs" aria-label="Policy & Compliance">
        {TABS.filter((t) => can(t.anyOf)).map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `fkpc-tab${isActive ? " is-active" : ""}`}>
            <Icon size={18} aria-hidden />
            <span>{label}</span>
            {badge && stats?.pendingApproval ? <em aria-label={`${stats.pendingApproval} waiting`}>{stats.pendingApproval}</em> : null}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ stats, statsFailed, refresh } satisfies PolicyContext} />
    </div>
  );
}
