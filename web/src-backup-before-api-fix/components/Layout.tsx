import { Outlet, useLocation } from "react-router-dom";

import {
  ThemeProvider,
  useFockisTheme,
} from "../context/ThemeContext";

import FockisBottomNav from "../components/fockis/FockisBottomNav";

import "../styles/Layout.scss";
import "../styles/FockisSidebar.scss";

/* ============================================================================
   FOCKIS GLOBAL LAYOUT

   Global Fockis bottom navigation appears everywhere EXCEPT Real Estate
   and Messages.

   Real Estate has its own dedicated bottom navigation and is responsible
   for rendering that navigation inside its own layout/page.

   Messages has its own in-page navigation (conversation list, chat header,
   back button) and, on mobile, needs the full viewport height for the
   conversation list / chat / composer without a fixed global nav bar
   overlapping the message composer.

   Map is a full-bleed, fixed-viewport UI (like Real Estate) — the default
   fk-app-content padding causes it to overflow one viewport height and
   scroll, clipping its own floating controls. It gets a zero-padding,
   locked-height modifier instead.
============================================================================ */

function LayoutInner() {
  const { theme } = useFockisTheme();
  const location = useLocation();

  const isRealEstatePage =
    location.pathname === "/realestate" ||
    location.pathname.startsWith("/realestate/");

  const isMessagesPage =
    location.pathname === "/messages" ||
    location.pathname.startsWith("/messages/");

  const isMapPage =
    location.pathname === "/map" ||
    location.pathname.startsWith("/map/");

  const hidesGlobalBottomNav =
    isRealEstatePage || isMessagesPage;

  function contentClassName() {
    if (isRealEstatePage) return "fk-app-content fk-app-content--realestate";
    if (isMapPage) return "fk-app-content fk-app-content--map";
    return "fk-app-content";
  }

  return (
    <div
      className="fk-app-layout"
      data-theme={theme}
    >
      {/* ================================================================
          PAGE CONTENT
      ================================================================ */}

      <main className={contentClassName()}>
        <Outlet />
      </main>

      {/* ================================================================
          FOCKIS GLOBAL BOTTOM NAV

          Real Estate and Messages are excluded because they either have
          their own navigation, or need the full viewport without a fixed
          nav bar overlapping in-page controls (e.g. the message composer).

          Map keeps the global bottom nav (per the original design), but
          now sits in a zero-padding, locked-height content area so the
          nav bar and the map don't fight over vertical space.
      ================================================================ */}

      {!hidesGlobalBottomNav && <FockisBottomNav />}
    </div>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <LayoutInner />
    </ThemeProvider>
  );
}