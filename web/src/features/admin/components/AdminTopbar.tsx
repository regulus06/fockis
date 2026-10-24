import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";

import { AdminCommandSearch } from "./AdminCommandSearch";
import { AdminNotificationCenter } from "./AdminNotificationCenter";
import { roleLabel } from "./AdminRoleBadge";
import { useAdminSessionStore } from "../store/adminSessionStore";
import type { AdminRole } from "../types/admin.types";

import "../styles/AdminComponents.scss";

/* ============================================================================
   ADMIN TOP BAR

   White header: hamburger (mobile/tablet), global search, notifications and
   the signed-in administrator. Name and role come from the real admin
   session store — nothing here is hard-coded.
============================================================================ */

interface AdminTopbarProps {
  /** Legacy prop kept for compatibility: opens the navigation. */
  onMenuClick?: () => void;
  menuButtonRef?: RefObject<HTMLButtonElement>;
  showMenuButton?: boolean;
  menuOpen?: boolean;
  showCollapseToggle?: boolean;
  sidebarCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AdminTopbar({
  onMenuClick,
  menuButtonRef,
  showMenuButton = Boolean(onMenuClick),
  menuOpen = false,
  showCollapseToggle = false,
  sidebarCollapsed = false,
  onToggleCollapse,
}: AdminTopbarProps) {
  const admin = useAdminSessionStore((state) => state.currentAdmin);

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!accountOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const adminName = admin?.name?.trim() || "Administrator";
  const adminRole = admin?.adminRoleName || (admin?.role ? roleLabel(admin.role as AdminRole) : "");

  return (
    <header className="fk-topbar">
      <div className="fk-topbar__left">
        {showMenuButton && onMenuClick && (
          <button
            ref={menuButtonRef}
            type="button"
            className="fk-topbar__menu"
            onClick={onMenuClick}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="fk-admin-drawer"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        )}

        {showCollapseToggle && onToggleCollapse && (
          <button
            type="button"
            className="fk-topbar__menu fk-topbar__collapse"
            onClick={onToggleCollapse}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen size={20} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={20} aria-hidden="true" />
            )}
          </button>
        )}

        <div className="fk-topbar__search">
          <AdminCommandSearch />
        </div>
      </div>

      <div className="fk-topbar__right">
        <AdminNotificationCenter />

        <div className="fk-topbar__account" ref={accountRef}>
          <button
            type="button"
            className="fk-topbar__account-button"
            onClick={() => setAccountOpen((value) => !value)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
          >
            <span className="fk-topbar__avatar" aria-hidden="true">
              {initials(adminName)}
            </span>

            <span className="fk-topbar__identity">
              <strong>{adminName}</strong>
              {adminRole && <span>{adminRole}</span>}
            </span>

            <ChevronDown className="fk-topbar__caret" size={16} aria-hidden="true" />
          </button>

          {accountOpen && (
            <div className="fk-menu fk-topbar__account-menu" role="menu">
              <div className="fk-topbar__account-head">
                <strong>{adminName}</strong>
                {admin?.email && <span>{admin.email}</span>}
              </div>

              <div className="fk-menu__divider" />

              <Link
                to="/fockis-preview"
                role="menuitem"
                className="fk-menu__item"
                onClick={() => setAccountOpen(false)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Fockis
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
