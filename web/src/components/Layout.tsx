
import { Outlet, useLocation } from "react-router-dom";

import {
  ThemeProvider,
  useFockisTheme,
} from "../context/ThemeContext";

import FockisBottomNav from "../components/fockis/FockisBottomNav";

import "../styles/Layout.scss";
import "../styles/FockisSidebar.scss";

function LayoutInner() {
  const { theme } = useFockisTheme();
  const location = useLocation();
  const pathname = location.pathname;

  const isRealEstatePage =
    pathname === "/realestate" ||
    pathname.startsWith("/realestate/");

  const isMessagesPage =
    pathname === "/messages" ||
    pathname.startsWith("/messages/");

  const isMapPage =
    pathname === "/map" ||
    pathname.startsWith("/map/");

  const isShopPage =
    pathname === "/shop" ||
    pathname.startsWith("/shop/");

  const hidesGlobalBottomNav =
    isRealEstatePage || isMessagesPage;

  const contentClasses = [
    "fk-app-content",
    isRealEstatePage ? "fk-app-content--realestate" : "",
    isMapPage ? "fk-app-content--map" : "",
    isShopPage ? "fk-app-content--shop" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="fk-app-layout"
      data-theme={theme}
    >
      <main className={contentClasses}>
        <Outlet />
      </main>

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
