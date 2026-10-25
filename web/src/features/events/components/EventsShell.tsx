import { useEffect, useState, type ReactNode } from "react";
import { CalendarDays, CalendarPlus, Compass } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import FockisSidebar from "../../../components/fockis/FockisSidebar/FockisSidebar";
import FockisBottomNav from "../../../components/fockis/FockisBottomNav";
import { useEventsTheme } from "../hooks/useEventsTheme";

import "../../../styles/FockisFeedPage.scss";
import "../styles/EventsPage.scss";

interface Props {
  children: ReactNode;
  /** Hide the Discover / My events / Create tabs (e.g. editor pages). */
  hideTabs?: boolean;
}

/**
 * Same frame as the feed (Fockis sidebar, mobile header, bottom nav) with
 * a wider centre column for event grids.
 */
export default function EventsShell({ children, hideTabs = false }: Props) {
  const theme = useEventsTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className="fk-app fke-app" data-theme={theme}>
      <header className="fk-mobile-header">
        <button
          type="button"
          className="fk-mobile-menu-button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open Fockis navigation"
          aria-expanded={mobileOpen}
          aria-controls="fockis-events-sidebar"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="fk-mobile-header__brand">
          <span className="fk-mobile-header__logo" style={{ overflow: "hidden", padding: 0 }}>
            <img
              src="/brand/fockis-icon-96.png"
              alt=""
              width={34}
              height={34}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }}
            />
          </span>
          <span className="fk-mobile-header__logo-text">Events</span>
        </div>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="fk-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close Fockis navigation"
        />
      )}

      <div className="fk-shell fke-shell">
        <aside id="fockis-events-sidebar" className="fk-shell__left">
          <FockisSidebar
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
            onCreatePost={() => {
              setMobileOpen(false);
              navigate("/fockis-preview");
            }}
          />
        </aside>

        <main className="fke-main">
          {!hideTabs && (
            <nav className="fke-nav" aria-label="Events">
              <NavLink end to="/events" className={({ isActive }) => `fke-nav__item ${isActive ? "is-active" : ""}`}>
                <Compass size={17} aria-hidden="true" /> Discover
              </NavLink>
              <NavLink to="/events/my-events" className={({ isActive }) => `fke-nav__item ${isActive ? "is-active" : ""}`}>
                <CalendarDays size={17} aria-hidden="true" /> My events
              </NavLink>
              <NavLink to="/events/create" className="fke-nav__item fke-nav__item--cta">
                <CalendarPlus size={17} aria-hidden="true" /> Create event
              </NavLink>
            </nav>
          )}
          {children}
        </main>
      </div>

      <FockisBottomNav />
    </div>
  );
}
