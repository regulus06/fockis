import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import FockisSidebar from "../../../../components/fockis/FockisSidebar/FockisSidebar";
import FockisBottomNav from "../../../../components/fockis/FockisBottomNav";
import BusinessesTopBar from "./BusinessesTopBar";

import "../../../../styles/FockisFeedPage.scss";
import "../../styles/BusinessUi.scss";
import "../../styles/BusinessesPage.scss";
import "../../styles/BusinessesDiscover.scss";

interface Props {
  children: ReactNode;
  /** Right-hand column (Join, My Businesses, Trending, Promote). */
  rightRail?: ReactNode;
  onSearch?: (query: string) => void;
}

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";

  const attr = document.documentElement.getAttribute("data-fk-theme");

  return attr === "dark" ? "dark" : "light";
}

/**
 * Same frame as the feed and Events: Fockis sidebar (drawer on mobile),
 * mobile header and bottom nav, plus the Businesses top bar and an
 * optional right rail.
 */
export default function BusinessesShell({ children, rightRail, onSearch }: Props) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-fk-theme"] });

    return () => observer.disconnect();
  }, []);

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
    <div className="fk-app fkbd-app" data-theme={theme}>
      <header className="fk-mobile-header">
        <button
          type="button"
          className="fk-mobile-menu-button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open Fockis navigation"
          aria-expanded={mobileOpen}
          aria-controls="fockis-businesses-sidebar"
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
          <span className="fk-mobile-header__logo-text">Businesses</span>
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

      <div className="fk-shell fkbd-shell">
        <aside id="fockis-businesses-sidebar" className="fk-shell__left">
          <FockisSidebar
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
            onCreatePost={() => {
              setMobileOpen(false);
              navigate("/fockis-preview");
            }}
          />
        </aside>

        <div className={`fkbd-stage ${rightRail ? "fkbd-stage--rail" : ""}`}>
          <BusinessesTopBar onSearch={onSearch} />

          <div className="fkbd-stage__body">
            <main className="fkbd-main fkb">{children}</main>

            {rightRail && (
              <aside className="fkbd-rail fkb" aria-label="Your businesses and categories">
                {rightRail}
              </aside>
            )}
          </div>
        </div>
      </div>

      <FockisBottomNav />
    </div>
  );
}
