import React, { useState } from "react";
import { NavLink } from "react-router-dom";

import "../styles/AdminSidebar.scss";

interface AdminSidebarProps {
  onNavigate?: () => void;
}

interface AdminMenuItem {
  name: string;
  icon: string;
  path: string;
}

/* ============================================================================
   MAIN
============================================================================ */

const mainMenu: AdminMenuItem[] = [
  {
    name: "Dashboard",
    icon: "📊",
    path: "/admin/dashboard",
  },
  {
    name: "Users",
    icon: "👥",
    path: "/admin/users",
  },
  {
    name: "Administrators",
    icon: "🛡️",
    path: "/admin/administrators",
  },
];

/* ============================================================================
   MARKETPLACE
============================================================================ */

const marketplaceMenu: AdminMenuItem[] = [
  {
    name: "Marketplace",
    icon: "🛍️",
    path: "/admin/marketplace/stores",
  },
  {
    name: "Products",
    icon: "📦",
    path: "/admin/marketplace/products",
  },
  {
    name: "Categories",
    icon: "🗂️",
    path: "/admin/categories",
  },
  {
    name: "Inventory",
    icon: "🏬",
    path: "/admin/inventory",
  },
  {
    name: "Orders",
    icon: "🛒",
    path: "/admin/marketplace/orders",
  },
  {
    name: "Shipping",
    icon: "🚚",
    path: "/admin/shipping",
  },
  {
    name: "Sellers",
    icon: "🏪",
    path: "/admin/marketplace/sellers",
  },
  {
    name: "Reviews",
    icon: "⭐",
    path: "/admin/marketplace/reviews",
  },
];

/* ============================================================================
   BUSINESS
============================================================================ */

const businessMenu: AdminMenuItem[] = [
  {
    name: "Business",
    icon: "🏢",
    path: "/admin/business",
  },
  {
    name: "Finance",
    icon: "💰",
    path: "/admin/finance/transactions",
  },
  {
    name: "Subscriptions",
    icon: "💎",
    path: "/admin/subscriptions",
  },
  {
    name: "Gifts",
    icon: "🎁",
    path: "/admin/gifts",
  },
];

/* ============================================================================
   MARKETING
============================================================================ */

const marketingMenu: AdminMenuItem[] = [
  /* ------------------------------------------------------------------------
     EXISTING MARKETING ADMIN
  ------------------------------------------------------------------------ */

  {
    name: "Marketing Admin",
    icon: "🎯",
    path: "/admin/marketing-admin",
  },
  {
    name: "Campaigns",
    icon: "📢",
    path: "/admin/marketing-admin/campaigns",
  },
  {
    name: "Ads",
    icon: "📣",
    path: "/admin/marketing-admin/ads",
  },
  {
    name: "Pending Review",
    icon: "⏳",
    path: "/admin/marketing-admin/pending-review",
  },
  {
    name: "Analytics",
    icon: "📈",
    path: "/admin/marketing-admin/analytics",
  },
  {
    name: "Advertisers",
    icon: "👤",
    path: "/admin/marketing-admin/advertisers",
  },
  {
    name: "Workflow & Settings",
    icon: "⚙️",
    path: "/admin/marketing-admin/workflow",
  },
  {
    name: "Marketing Audit",
    icon: "📋",
    path: "/admin/marketing-admin/audit",
  },

  /* ------------------------------------------------------------------------
     FOCKIS MARKETING
  ------------------------------------------------------------------------ */

  {
    name: "Fockis Marketing",
    icon: "📣",
    path: "/marketing",
  },
  {
    name: "Marketing Campaigns",
    icon: "✉️",
    path: "/marketing/campaigns",
  },
  {
    name: "Marketing Credits",
    icon: "🪙",
    path: "/marketing/credits",
  },
];

/* ============================================================================
   FOCKIS AI / VAPI
============================================================================ */

const aiMenu: AdminMenuItem[] = [
  {
    name: "AI & Vapi",
    icon: "🤖",
    path: "/admin/ai",
  },
];

/* ============================================================================
   MUSIC
============================================================================ */

const musicMenu: AdminMenuItem[] = [
  {
    name: "Music Rules",
    icon: "🎵",
    path: "/admin/music/rules",
  },
  {
    name: "Creator Applications",
    icon: "🎤",
    path: "/admin/music/producers",
  },
];

/* ============================================================================
   TRAVEL
============================================================================ */

const travelMenu: AdminMenuItem[] = [
  {
    name: "Travel Admin",
    icon: "✈️",
    path: "/admin/travel",
  },
  {
    name: "Travel Users",
    icon: "👥",
    path: "/admin/travel/users",
  },
  {
    name: "Travel Partners",
    icon: "🤝",
    path: "/admin/travel/partners",
  },
  {
    name: "Travel Applications",
    icon: "📋",
    path: "/admin/travel/applications",
  },
  {
    name: "Travel Listings",
    icon: "🏨",
    path: "/admin/travel/listings",
  },
  {
    name: "Travel Bookings",
    icon: "🧳",
    path: "/admin/travel/bookings",
  },
];

/* ============================================================================
   PLATFORM
============================================================================ */

const platformMenu: AdminMenuItem[] = [
  {
    name: "Messages",
    icon: "💬",
    path: "/admin/messages",
  },
  {
    name: "Live",
    icon: "🔴",
    path: "/admin/live",
  },
  {
    name: "Meetings",
    icon: "🎥",
    path: "/admin/meetings",
  },
  {
    name: "Real Estate",
    icon: "🏠",
    path: "/admin/realestate",
  },
  {
    name: "Documents",
    icon: "📄",
    path: "/admin/documents",
  },
  {
    name: "Design Studio",
    icon: "🎨",
    path: "/admin/design",
  },
  {
    name: "Playlists",
    icon: "🎶",
    path: "/admin/playlists",
  },
  {
    name: "Moderation",
    icon: "🛡️",
    path: "/admin/moderation",
  },
  {
    name: "Security",
    icon: "🔐",
    path: "/admin/security",
  },
  {
    name: "Audit Logs",
    icon: "📋",
    path: "/admin/audit",
  },
];

/* ============================================================================
   DOMAIN ADMINISTRATION
============================================================================ */

const domainMenu: AdminMenuItem[] = [
  {
    name: "Domain Administration",
    icon: "🌐",
    path: "/admin/domains",
  },
];

/* ============================================================================
   SYSTEM
============================================================================ */

const systemMenu: AdminMenuItem[] = [
  {
    name: "Settings",
    icon: "⚙️",
    path: "/admin/system/settings",
  },
];

/* ============================================================================
   SIDEBAR LINK
============================================================================ */

function SidebarLink({
  item,
  onNavigate,
  nested = false,
}: {
  item: AdminMenuItem;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "admin-sidebar__link",
          nested ? "admin-sidebar__link--nested" : "",
          isActive ? "admin-sidebar__link--active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <span
        className="admin-sidebar__icon"
        aria-hidden="true"
      >
        {item.icon}
      </span>

      <span className="admin-sidebar__label">
        {item.name}
      </span>
    </NavLink>
  );
}

/* ============================================================================
   SIDEBAR SECTION
============================================================================ */

function SidebarSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: AdminMenuItem[];
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="admin-sidebar__section-label">
        {title}
      </div>

      {items.map((item) => (
        <SidebarLink
          key={item.path}
          item={item}
          onNavigate={onNavigate}
        />
      ))}
    </>
  );
}

/* ============================================================================
   MARKETING SECTION
============================================================================ */

function MarketingSection({
  items,
  onNavigate,
}: {
  items: AdminMenuItem[];
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.location.pathname.startsWith(
        "/admin/marketing-admin",
      ) ||
      window.location.pathname === "/marketing" ||
      window.location.pathname.startsWith(
        "/marketing/",
      )
    );
  });

  const toggleMarketing = () => {
    setOpen((current) => !current);
  };

  return (
    <div className="admin-sidebar__marketing">
      <button
        type="button"
        className={[
          "admin-sidebar__marketing-toggle",
          open
            ? "admin-sidebar__marketing-toggle--open"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={toggleMarketing}
        aria-expanded={open}
        aria-controls="admin-marketing-menu"
      >
        <span className="admin-sidebar__marketing-left">
          <span
            className="admin-sidebar__icon"
            aria-hidden="true"
          >
            📣
          </span>

          <span className="admin-sidebar__label">
            Marketing
          </span>
        </span>

        <span
          className={[
            "admin-sidebar__chevron",
            open
              ? "admin-sidebar__chevron--open"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden="true"
        >
          ›
        </span>
      </button>

      {open && (
        <div
          id="admin-marketing-menu"
          className="admin-sidebar__marketing-items"
        >
          {items.map((item) => (
            <SidebarLink
              key={item.path}
              item={item}
              nested
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   ADMIN SIDEBAR
============================================================================ */

export function AdminSidebar({
  onNavigate,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__header">
        <div
          className="admin-sidebar__logo"
          aria-hidden="true"
        >
          🛡️
        </div>

        <div className="admin-sidebar__brand">
          <h2>Admin Center</h2>
          <span>Fockis Administration</span>
        </div>
      </div>

      <nav
        className="admin-sidebar__nav"
        aria-label="Admin navigation"
      >
        <SidebarSection
          title="MAIN"
          items={mainMenu}
          onNavigate={onNavigate}
        />

        <SidebarSection
          title="MARKETPLACE"
          items={marketplaceMenu}
          onNavigate={onNavigate}
        />

        <SidebarSection
          title="BUSINESS"
          items={businessMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            MARKETING
        ================================================================ */}

        <div className="admin-sidebar__section-label">
          MARKETING
        </div>

        <MarketingSection
          items={marketingMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            FOCKIS AI
        ================================================================ */}

        <SidebarSection
          title="FOCKIS AI"
          items={aiMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            FOCKIS MUSIC
        ================================================================ */}

        <SidebarSection
          title="FOCKIS MUSIC"
          items={musicMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            FOCKIS TRAVEL
        ================================================================ */}

        <SidebarSection
          title="FOCKIS TRAVEL"
          items={travelMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            PLATFORM
        ================================================================ */}

        <SidebarSection
          title="PLATFORM"
          items={platformMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            DOMAIN ADMINISTRATION
        ================================================================ */}

        <SidebarSection
          title="DOMAIN ADMINISTRATION"
          items={domainMenu}
          onNavigate={onNavigate}
        />

        {/* ================================================================
            SYSTEM
        ================================================================ */}

        <SidebarSection
          title="SYSTEM"
          items={systemMenu}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="admin-sidebar__footer">
        <NavLink
          to="/fockis-preview"
          onClick={onNavigate}
          className="admin-sidebar__back"
        >
          <span
            className="admin-sidebar__back-icon"
            aria-hidden="true"
          >
            ←
          </span>

          <span>Back to Fockis</span>
        </NavLink>
      </div>
    </aside>
  );
}

export default AdminSidebar;