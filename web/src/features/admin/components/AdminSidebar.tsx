import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronDown, PanelLeftOpen, X } from "lucide-react";

import FockisMark from "../../../components/fockis/FockisMark";
import { useAdminAccess } from "../permissions/adminAccess";
import {
  ADMIN_NAV,
  bestMatchingPath,
  type AdminNavItem,
  type AdminNavLink,
} from "./adminNavigation";

import "../styles/AdminSidebar.scss";

/* ============================================================================
   ADMIN SIDEBAR

   variant="full"   — desktop sidebar
   variant="rail"   — compact icon rail (tablet, or desktop collapsed)
   variant="drawer" — off-canvas drawer for mobile/tablet (opened by the
                      hamburger in the top bar; state lives in AdminLayout)
============================================================================ */

export interface AdminSidebarProps {
  variant?: "full" | "rail" | "drawer";
  id?: string;
  open?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
  /** Rail only: expand to full navigation (opens drawer / un-collapses). */
  onRequestExpand?: () => void;
}

interface VisibleItem extends AdminNavItem {
  visibleChildren: AdminNavLink[];
}

export function AdminSidebar({
  variant = "full",
  id,
  open = false,
  onNavigate,
  onClose,
  onRequestExpand,
}: AdminSidebarProps) {
  const { pathname } = useLocation();
  const { can } = useAdminAccess();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);

  const isRail = variant === "rail";
  const isDrawer = variant === "drawer";

  /* ---------- permission-filtered navigation ---------- */
  const items = useMemo<VisibleItem[]>(() => {
    const result: VisibleItem[] = [];

    for (const item of ADMIN_NAV) {
      if (item.children?.length) {
        const visibleChildren = item.children.filter((child) => can(child.anyOf));
        if (visibleChildren.length > 0) {
          result.push({ ...item, path: visibleChildren[0].path, visibleChildren });
        }
      } else if (can(item.anyOf)) {
        result.push({ ...item, visibleChildren: [] });
      }
    }

    return result;
  }, [can]);

  const activePath = useMemo(() => {
    const paths = items.flatMap((item) =>
      item.visibleChildren.length > 0
        ? item.visibleChildren.map((child) => child.path)
        : [item.path],
    );
    return bestMatchingPath(pathname, paths);
  }, [items, pathname]);

  const groupContainsActive = (item: VisibleItem) =>
    item.visibleChildren.some((child) => child.path === activePath);

  /* ---------- expandable groups ---------- */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the group that contains the current page.
  useEffect(() => {
    const activeGroup = items.find(
      (item) => item.visibleChildren.length > 0 && groupContainsActive(item),
    );

    if (activeGroup) {
      setOpenGroups((current) =>
        current[activeGroup.label] ? current : { ...current, [activeGroup.label]: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, items]);

  const toggleGroup = (label: string) =>
    setOpenGroups((current) => ({ ...current, [label]: !current[label] }));

  // A closed drawer stays in the DOM (so it can animate) but must not be
  // reachable by keyboard or screen readers.
  useEffect(() => {
    const node = asideRef.current;
    if (!node || !isDrawer) return;
    if (open) node.removeAttribute("inert");
    else node.setAttribute("inert", "");
  }, [isDrawer, open]);

  // Move focus into the drawer when it opens.
  useEffect(() => {
    if (isDrawer && open) {
      const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [isDrawer, open]);

  const className = [
    "admin-sidebar",
    `admin-sidebar--${variant}`,
    isDrawer && open ? "is-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      ref={asideRef}
      id={id}
      className={className}
      aria-label="Admin navigation"
      role={isDrawer ? "dialog" : undefined}
      aria-modal={isDrawer && open ? true : undefined}
      aria-hidden={isDrawer && !open ? true : undefined}
    >
      {/* ---------- brand ---------- */}
      <div className="admin-sidebar__header">
        <Link
          to="/admin/dashboard"
          className="admin-sidebar__brand-link"
          onClick={onNavigate}
          title="Fockis App Admin Center"
        >
          <span className="admin-sidebar__logo" aria-hidden="true">
            <FockisMark />
          </span>

          {!isRail && (
            <span className="admin-sidebar__brand">
              <strong>FOCKIS</strong>
              <span>App Admin Center</span>
            </span>
          )}
        </Link>

        {isDrawer && (
          <button
            ref={closeButtonRef}
            type="button"
            className="admin-sidebar__close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* ---------- navigation ---------- */}
      <nav className="admin-sidebar__nav" aria-label="Admin sections">
        <ul className="admin-sidebar__list">
          {items.map((item) => {
            const Icon = item.icon;
            const isGroup = item.visibleChildren.length > 0;
            const groupActive = isGroup && groupContainsActive(item);
            const linkActive = !isGroup && item.path === activePath;

            /* Rail: groups become a single icon that opens the full nav. */
            if (isRail) {
              const active = groupActive || linkActive;
              return (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className={`admin-sidebar__link${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    aria-label={item.label}
                  >
                    <Icon className="admin-sidebar__icon" size={20} aria-hidden="true" />
                  </Link>
                </li>
              );
            }

            if (!isGroup) {
              return (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    onClick={onNavigate}
                    className={`admin-sidebar__link${linkActive ? " is-active" : ""}`}
                    aria-current={linkActive ? "page" : undefined}
                  >
                    <Icon className="admin-sidebar__icon" size={20} aria-hidden="true" />
                    <span className="admin-sidebar__label">{item.label}</span>
                  </Link>
                </li>
              );
            }

            const expanded = Boolean(openGroups[item.label]);
            const groupId = `${id ?? "admin-sidebar"}-group-${item.label
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")}`;

            return (
              <li key={item.label}>
                <button
                  type="button"
                  className={`admin-sidebar__link admin-sidebar__group-toggle${
                    groupActive ? " has-active" : ""
                  }`}
                  aria-expanded={expanded}
                  aria-controls={groupId}
                  onClick={() => toggleGroup(item.label)}
                >
                  <Icon className="admin-sidebar__icon" size={20} aria-hidden="true" />
                  <span className="admin-sidebar__label">{item.label}</span>
                  <ChevronDown
                    className={`admin-sidebar__chevron${expanded ? " is-open" : ""}`}
                    size={16}
                    aria-hidden="true"
                  />
                </button>

                <ul
                  id={groupId}
                  className={`admin-sidebar__sublist${expanded ? " is-open" : ""}`}
                  hidden={!expanded}
                >
                  {item.visibleChildren.map((child) => {
                    const active = child.path === activePath;
                    return (
                      <li key={child.path + child.label}>
                        <Link
                          to={child.path}
                          onClick={onNavigate}
                          className={`admin-sidebar__sublink${active ? " is-active" : ""}`}
                          aria-current={active ? "page" : undefined}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ---------- footer ---------- */}
      <div className="admin-sidebar__footer">
        {isRail && onRequestExpand ? (
          <button
            type="button"
            className="admin-sidebar__back"
            onClick={onRequestExpand}
            title="Show full navigation"
            aria-label="Show full navigation"
          >
            <PanelLeftOpen size={18} aria-hidden="true" />
          </button>
        ) : (
          <Link
            to="/fockis-preview"
            onClick={onNavigate}
            className="admin-sidebar__back"
            title="Back to Fockis"
          >
            <ArrowLeft size={18} aria-hidden="true" />
            {!isRail && <span>Back to Fockis</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
