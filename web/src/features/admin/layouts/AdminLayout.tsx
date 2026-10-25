import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { AdminSidebar } from "../components/AdminSidebar";
import { AdminTopbar } from "../components/AdminTopbar";
import { AdminToaster } from "../components/AdminToaster";
import { useAdminUiStore } from "../store/adminUiStore";

import "../styles/fonts.scss";
import "../styles/base.scss";
import "../styles/AdminLayout.scss";
import "../styles/AdminComponents.scss";

/* ============================================================================
   FOCKIS APP ADMIN CENTER — SHELL

   Responsive behaviour
   - Desktop (>= 1200px): full sidebar on the left. The header button collapses
     it to an icon rail (existing `sidebarCollapsed` UI store).
   - Tablet / small laptop (768px – 1199px): compact icon rail so the content
     is never squeezed; the hamburger opens the full navigation as a drawer.
   - Mobile (< 768px): no sidebar; the hamburger opens the drawer.

   Drawer behaviour (React state, not CSS-only)
   - Dark translucent backdrop; tapping it closes the drawer.
   - Close button inside the drawer, Escape closes it.
   - Closes when a link is chosen or the route changes.
   - Background scrolling is locked while it is open.
   - Focus moves into the drawer on open and back to the hamburger on close.
============================================================================ */

// Sections that bring their own sidebar/header. While inside one of these
// sections the main admin sidebar and topbar are hidden so the section can
// use the full screen (unchanged from the previous layout).
const FULL_SCREEN_SECTIONS = ["/admin/users", "/admin/marketing-admin"];

const MOBILE_QUERY = "(max-width: 767.98px)";
const TABLET_QUERY = "(min-width: 768px) and (max-width: 1199.98px)";

function useMediaQuery(query: string): boolean {
  const getMatch = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;

  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);

    onChange();
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function AdminLayout() {
  const collapsed = useAdminUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAdminUiStore((s) => s.toggleSidebar);
  const theme = useAdminUiStore((s) => s.theme);
  const { pathname } = useLocation();

  const isMobile = useMediaQuery(MOBILE_QUERY);
  const isTablet = useMediaQuery(TABLET_QUERY);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  const isFullScreen = FULL_SCREEN_SECTIONS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const usesDrawer = isMobile || isTablet;
  const railMode = !isMobile && (isTablet || collapsed);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close the drawer when the viewport grows into desktop.
  useEffect(() => {
    if (!usesDrawer) setDrawerOpen(false);
  }, [usesDrawer]);

  // Escape to close + background scroll lock while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
      }
    };

    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [drawerOpen]);

  // Return focus to the hamburger after the drawer closes.
  useEffect(() => {
    if (wasOpenRef.current && !drawerOpen) {
      menuButtonRef.current?.focus();
    }
    wasOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  const shellClass = [
    "fk-shell",
    "fk-admin-shell",
    railMode && !isFullScreen ? "fk-shell--rail" : "",
    collapsed && !isFullScreen ? "fk-shell--collapsed" : "",
    isMobile ? "fk-shell--mobile" : "",
    isFullScreen ? "fk-shell--full" : "",
    drawerOpen ? "fk-shell--drawer-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass} data-theme={theme}>
      {!isFullScreen && !isMobile && (
        <AdminSidebar
          variant={railMode ? "rail" : "full"}
          onRequestExpand={isTablet ? openDrawer : toggleSidebar}
        />
      )}

      {!isFullScreen && usesDrawer && (
        <>
          <div
            className={`fk-drawer-backdrop${drawerOpen ? " is-open" : ""}`}
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <AdminSidebar
            id="fk-admin-drawer"
            variant="drawer"
            open={drawerOpen}
            onNavigate={closeDrawer}
            onClose={closeDrawer}
          />
        </>
      )}

      <div className="fk-main">
        {!isFullScreen && (
          <AdminTopbar
            menuButtonRef={menuButtonRef}
            showMenuButton={usesDrawer}
            menuOpen={drawerOpen}
            onMenuClick={drawerOpen ? closeDrawer : openDrawer}
            showCollapseToggle={!usesDrawer}
            sidebarCollapsed={collapsed}
            onToggleCollapse={toggleSidebar}
          />
        )}

        <main className="fk-content" id="fk-admin-content">
          <Outlet />
        </main>
      </div>

      <AdminToaster />
    </div>
  );
}

export default AdminLayout;
