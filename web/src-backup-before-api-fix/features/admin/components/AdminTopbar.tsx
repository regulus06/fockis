import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../styles/AdminComponents.scss";

interface AdminTopbarProps {
  onMenuClick?: () => void;
}

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/dashboard": "Dashboard",

  "/admin/users": "Users",
  "/admin/administrators": "Administrators",

  "/admin/marketplace": "Marketplace",
  "/admin/marketplace/products": "Products",
  "/admin/marketplace/sellers": "Sellers",
  "/admin/marketplace/stores": "Stores",
  "/admin/marketplace/orders": "Orders",
  "/admin/marketplace/reviews": "Marketplace Reviews",
  "/admin/marketplace/disputes": "Disputes",

  "/admin/categories": "Categories",
  "/admin/inventory": "Inventory",
  "/admin/orders": "Orders",
  "/admin/shipping": "Shipping",
  "/admin/reviews": "Reviews",

  "/admin/marketing/campaigns": "Marketing Campaigns",
  "/admin/marketing/ads": "Marketing Ads",
  "/admin/marketing/analytics": "Marketing Analytics",

  "/admin/analytics": "Analytics",

  "/admin/finance/transactions": "Transactions",
  "/admin/finance/refunds": "Refunds",
  "/admin/finance/payouts": "Payouts",
  "/admin/finance/earnings": "Earnings",
  "/admin/finance/wallet": "Wallet",
  "/admin/payments": "Payments",

  "/admin/subscriptions": "Subscriptions",
  "/admin/gifts": "Gifts",

  "/admin/live": "Live",
  "/admin/meetings": "Meetings",
  "/admin/realestate": "Real Estate",
  "/admin/documents": "Documents",
  "/admin/design": "Design Studio",
  "/admin/playlists": "Playlists",

  "/admin/moderation": "Moderation",
  "/admin/moderation/reports": "Reports",
  "/admin/moderation/cases": "Moderation Cases",

  "/admin/security": "Security Center",
  "/admin/security/events": "Security Events",
  "/admin/security/sessions": "Admin Sessions",
  "/admin/security/policies": "Security Policies",

  "/admin/audit": "Audit Logs",

  "/admin/system/settings": "System Settings",
  "/admin/system/features": "Feature Flags",
  "/admin/system/emergency": "Emergency Center",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  const parts = pathname
    .split("/")
    .filter(Boolean);

  const lastPart = parts[parts.length - 1];

  if (!lastPart) {
    return "Dashboard";
  }

  return lastPart
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

export function AdminTopbar({
  onMenuClick,
}: AdminTopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const title = getPageTitle(location.pathname);

  return (
    <header className="admin-topbar">

      {/* LEFT */}
      <div className="admin-topbar__left">

        {onMenuClick && (
          <button
            type="button"
            className="admin-topbar__menu-button"
            onClick={onMenuClick}
            aria-label="Open admin menu"
          >
            ☰
          </button>
        )}

        <div className="admin-topbar__title-area">

          <span className="admin-topbar__breadcrumb">
            Fockis Administration
          </span>

          <h1 className="admin-topbar__title">
            {title}
          </h1>

        </div>

      </div>

      {/* RIGHT */}
      <div className="admin-topbar__right">

        <button
          type="button"
          className="admin-topbar__icon-button"
          aria-label="Notifications"
          title="Notifications"
        >
          🔔
        </button>

        <button
          type="button"
          className="admin-topbar__icon-button"
          aria-label="Search"
          title="Search"
        >
          🔎
        </button>

        <div className="admin-topbar__admin">

          <div className="admin-topbar__avatar">
            A
          </div>

          <div className="admin-topbar__admin-info">
            <strong>
              Administrator
            </strong>

            <span>
              Admin
            </span>
          </div>

        </div>

        <button
          type="button"
          className="admin-topbar__home-button"
          onClick={() => navigate("/fockis-preview")}
        >
          ← Fockis
        </button>

      </div>

    </header>
  );
}

export default AdminTopbar;