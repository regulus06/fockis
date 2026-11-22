/**
 * NewsShell.tsx — frame for every public News & Media page: the Fockis sidebar
 * (same as the feed), the "Fockis News & Media" masthead with search and
 * section navigation, the page content and an optional right rail.
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Bell, Layers, Search } from "lucide-react";

import FockisSidebar from "../../components/fockis/FockisSidebar/FockisSidebar";
import FockisBottomNav from "../../components/fockis/FockisBottomNav";

import "../../styles/FockisFeedPage.scss";
import "./news.scss";

const NAV: { to: string; label: string; live?: boolean; end?: boolean }[] = [
  { to: "/news", label: "Home", end: true },
  { to: "/news/latest", label: "Latest" },
  { to: "/news/breaking", label: "Breaking News" },
  { to: "/news/category/politics", label: "Politics" },
  { to: "/news/category/business", label: "Business" },
  { to: "/news/category/society", label: "Society" },
  { to: "/news/category/economy", label: "Economy" },
  { to: "/news/category/education", label: "Education" },
  { to: "/news/category/sports", label: "Sports" },
  { to: "/news/category/technology", label: "Technology" },
  { to: "/news/category/culture", label: "Culture" },
  { to: "/news/category/entertainment", label: "Entertainment" },
  { to: "/news/category/international", label: "International" },
  { to: "/news/live", label: "Live TV", live: true },
  { to: "/news/radio", label: "Radio" },
  { to: "/news/podcasts", label: "Podcasts" },
];

export function PulseMark() {
  return (
    <svg className="nm-pulse" viewBox="0 0 64 32" aria-hidden="true">
      <path d="M2 18h14l4-10 6 20 6-26 6 22 4-6h20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NewsShell({
  children,
  rail,
  compactHeader = false,
  plain = false,
}: {
  children: ReactNode;
  rail?: ReactNode;
  compactHeader?: boolean;
  /** Content sits directly on a white page (reading layout) instead of inside a card. */
  plain?: boolean;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setMobileOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function search(ev: FormEvent) {
    ev.preventDefault();
    const term = q.trim();
    navigate(term ? `/news/latest?q=${encodeURIComponent(term)}` : "/news/latest");
  }

  return (
    <div className="fk-app nm-app">
      <header className="fk-mobile-header">
        <button type="button" className="fk-mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open Fockis navigation" aria-expanded={mobileOpen} aria-controls="fockis-news-sidebar">
          <span />
          <span />
          <span />
        </button>
        <div className="fk-mobile-header__brand">
          <span className="fk-mobile-header__logo" style={{ overflow: "hidden", padding: 0 }}>
            <img src="/brand/fockis-icon-96.png" alt="" width={34} height={34} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit", display: "block" }} />
          </span>
          <span className="fk-mobile-header__logo-text">News & Media</span>
        </div>
      </header>

      {mobileOpen && <button type="button" className="fk-sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close Fockis navigation" />}

      <div className="fk-shell nm-shell">
        <aside id="fockis-news-sidebar" className="fk-shell__left">
          <FockisSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        </aside>

        <div className={`nm-frame${plain ? " nm-frame--plain" : ""}`}>
          <section className={`nm-mast${compactHeader ? " nm-mast--compact" : ""}`} aria-label="Fockis News & Media">
            <div className="nm-mast__top">
              <NavLink to="/news" className="nm-mast__brand">
                <PulseMark />
                <span>
                  <strong>
                    Fockis <em>News</em> &amp; Media
                  </strong>
                  {!compactHeader && <small>News · TV · Radio · Magazines · Podcasts · From Haiti and Around the World</small>}
                </span>
              </NavLink>
              <div className="nm-mast__tools">
                <form className="nm-mast__search" role="search" onSubmit={search}>
                  <Search aria-hidden="true" />
                  <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search news, articles…" aria-label="Search news and articles" />
                </form>
                <NavLink to="/news/directory" className="nm-mast__pill">
                  <Layers aria-hidden="true" /> <span>Media Directory</span>
                </NavLink>
                <NavLink to="/notifications" className="nm-mast__icon" aria-label="Notifications">
                  <Bell />
                </NavLink>
              </div>
            </div>
            <nav className="nm-mast__nav" aria-label="News sections">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => ["nm-mast__link", isActive || (n.to === "/news" && pathname === "/news/") ? "is-active" : "", n.live ? "nm-mast__link--live" : ""].filter(Boolean).join(" ")}
                >
                  {n.live && <span className="nm-live-dot" aria-hidden="true" />}
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </section>

          <div className={`nm-stage${rail ? " nm-stage--rail" : ""}${plain ? " nm-stage--plain" : ""}`}>
            <div className="nm-stage__main">
              <main className="nm-main">{children}</main>
            </div>
            {rail && (
              <aside className="nm-rail" aria-label="Media on Fockis">
                {rail}
              </aside>
            )}
          </div>
        </div>
      </div>
      <FockisBottomNav />
    </div>
  );
}
