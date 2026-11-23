import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useOutletContext } from "react-router-dom";
import {
  BellRing,
  Building2,
  ExternalLink,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  ShieldHalf,
  Smartphone,
  Timer,
  UserCheck,
  type LucideIcon,
  LifeBuoy,
  Siren,
  UserLock,
} from "lucide-react";

import { PERMISSIONS } from "../permissions/permission.constants";
import { useAdminAccess } from "../permissions/adminAccess";
import { securityAdminApi, securityError, type PolicyView } from "./securityAdminApi";
import "../support/styles/SupportMod.scss";
import "./SecurityAdmin.scss";

const P = PERMISSIONS;
export const SECURITY_BASE = "/admin/security";

export interface SecurityContext {
  view: PolicyView | null;
  viewError: string | null;
  reloadPolicy: () => Promise<void>;
}

export function useSecurityContext() {
  return useOutletContext<SecurityContext>();
}

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  anyOf: string[];
  end?: boolean;
}

const NAV: NavEntry[] = [
  { to: SECURITY_BASE, label: "Security Overview", icon: LayoutGrid, anyOf: [P.SECURITY_VIEW], end: true },
  { to: `${SECURITY_BASE}/authentication`, label: "Authentication Policies", icon: ShieldHalf, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/password`, label: "Password Security", icon: KeyRound, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/login-protection`, label: "Login Protection", icon: LockKeyhole, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/sessions`, label: "Session Management", icon: Timer, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/two-factor`, label: "Two-Factor Authentication", icon: Smartphone, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/alerts`, label: "Login Alerts", icon: BellRing, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/account-protection`, label: "Account Protection", icon: UserCheck, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/incidents`, label: "Security Incidents", icon: Siren, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/restrictions`, label: "Sign-in Restrictions", icon: UserLock, anyOf: [P.SECURITY_VIEW] },
  { to: `${SECURITY_BASE}/recovery`, label: "Recovery Cases", icon: LifeBuoy, anyOf: [P.SECURITY_ACCOUNT_RECOVERY] },
  { to: `${SECURITY_BASE}/organizations`, label: "Organization Identity Policies", icon: Building2, anyOf: [P.SECURITY_VIEW] },
  {
    to: `${SECURITY_BASE}/audit`,
    label: "Security Audit Logs",
    icon: ScrollText,
    anyOf: [P.SECURITY_AUDIT_VIEW, P.AUDIT_VIEW],
  },
];

const RELATED: Array<{ to: string; label: string; anyOf: string[] }> = [
  { to: "/admin/roles", label: "Roles", anyOf: [P.ROLES_VIEW] },
  { to: "/admin/permissions", label: "Permissions", anyOf: [P.PERMISSIONS_VIEW] },
  { to: "/admin/audit", label: "All audit logs", anyOf: [P.AUDIT_VIEW] },
  { to: "/admin/policy-compliance", label: "Policy & Compliance", anyOf: [P.POLICY_VIEW] },
];

export default function SecurityLayout() {
  const { can } = useAdminAccess();
  const [view, setView] = useState<PolicyView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const reloadPolicy = useCallback(async () => {
    try {
      const next = await securityAdminApi.policy();
      setView(next);
      setViewError(null);
    } catch (error) {
      setViewError(securityError(error, "The security policy could not be loaded."));
    }
  }, []);

  useEffect(() => {
    void reloadPolicy();
  }, [reloadPolicy]);

  const nav = NAV.filter((item) => can(item.anyOf));
  const related = RELATED.filter((item) => can(item.anyOf));

  return (
    <div className="fksm fksec">
      <header className="fksm-banner fksm-banner--compact fksec-banner">
        <ShieldCheck className="fksm-banner__icon" size={36} strokeWidth={2.2} aria-hidden="true" />
        <div className="fksm-banner__text">
          <h1>Security &amp; Identity</h1>
          <p>Platform-wide authentication, session and account-protection policies for every Fockis account and organization-managed identity.</p>
        </div>
      </header>

      <div className="fksm-body">
        <nav className="fksm-subnav fksec-subnav" aria-label="Security & Identity">
          <ul>
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {related.length > 0 && (
            <div className="fksec-related">
              <span>Related</span>
              {related.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label} <ExternalLink size={12} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="fksm-main">
          <Outlet context={{ view, viewError, reloadPolicy } satisfies SecurityContext} />
        </div>
      </div>
    </div>
  );
}
