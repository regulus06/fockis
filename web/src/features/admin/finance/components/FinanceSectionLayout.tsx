import { NavLink, Outlet, useLocation } from "react-router-dom";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";

import "../styles/FinanceAdminTheme.scss";

/* ============================================================================
   FINANCE & SUBSCRIPTIONS — SECTION LAYOUT

   Wraps every /admin/finance/* route (paths unchanged) with the shared App
   Admin Center tab bar: Overview, Payments, Subscriptions, Plans, Refunds,
   then the remaining finance tools. Each tab respects the same permission
   used by that route's guard, so nobody sees a tab that would 403.
============================================================================ */

const P = PERMISSIONS;

const TABS: { to: string; label: string; anyOf: string[] }[] = [
  { to: "/admin/finance", label: "Overview", anyOf: [P.FINANCE_VIEW] },
  { to: "/admin/finance/payments", label: "Payments", anyOf: [P.PAYMENTS_VIEW, P.FINANCE_VIEW] },
  { to: "/admin/finance/subscriptions", label: "Subscriptions", anyOf: [P.SUBSCRIPTIONS_VIEW, P.FINANCE_VIEW] },
  { to: "/admin/subscription-plans", label: "Plans", anyOf: [P.SUBSCRIPTIONS_VIEW] },
  { to: "/admin/finance/refunds", label: "Refunds", anyOf: [P.FINANCE_REFUNDS] },
  { to: "/admin/finance/transactions", label: "Transactions", anyOf: [P.FINANCE_TRANSACTIONS] },
  { to: "/admin/finance/payouts", label: "Payouts", anyOf: [P.FINANCE_PAYOUTS] },
  { to: "/admin/finance/invoices", label: "Invoices", anyOf: [P.FINANCE_VIEW] },
  { to: "/admin/finance/revenue", label: "Revenue", anyOf: [P.FINANCE_EARNINGS, P.FINANCE_VIEW] },
  { to: "/admin/finance/fees", label: "Fees", anyOf: [P.FINANCE_VIEW] },
  { to: "/admin/finance/wallets", label: "Wallets", anyOf: [P.FINANCE_VIEW] },
  { to: "/admin/finance/coins", label: "Coins", anyOf: [P.FINANCE_VIEW] },
  { to: "/admin/finance/reports", label: "Reports", anyOf: [P.FINANCE_VIEW, P.FINANCE_EARNINGS] },
];

export default function FinanceSectionLayout() {
  const { can } = useAdminAccess();
  const { pathname } = useLocation();
  const tabs = TABS.filter((tab) => can(tab.anyOf));

  return (
    <div className="fk-finance-section">
      <div className="fk-finance-section__bar">
        <span className="fk-finance-section__title">Finance &amp; Subscriptions</span>
        {tabs.length > 0 && (
          <nav className="fk-pill-tabs" aria-label="Finance sections">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.to === "/admin/finance"}
                className={({ isActive }) =>
                  `fk-pill-tab${isActive || (tab.to === "/admin/finance" && pathname === "/admin/finance/") ? " is-active" : ""}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <Outlet />
    </div>
  );
}
