/* ============================================================================
   FOCKIS ADS — APP SHELL

   Sidebar + top bar for every page under /ads. Uses the official Fockis
   icon from public/brand. Every navigation item points at a real route
   registered in AdsRoutes.tsx.
============================================================================ */

import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CreditCard,
  Images,
  LayoutDashboard,
  Megaphone,
  Menu,
  Plus,
  X,
} from "lucide-react";

import { adsPaths } from "./adsModel";

import "./FockisAds.scss";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: adsPaths.overview,
    label: "Overview",
    icon: <LayoutDashboard size={18} aria-hidden="true" />,
    end: true,
  },
  {
    to: adsPaths.campaigns,
    label: "Campaigns",
    icon: <Megaphone size={18} aria-hidden="true" />,
  },
  {
    to: adsPaths.creatives,
    label: "Creative library",
    icon: <Images size={18} aria-hidden="true" />,
  },
  {
    to: adsPaths.analytics,
    label: "Analytics",
    icon: <BarChart3 size={18} aria-hidden="true" />,
  },
  {
    to: adsPaths.billing,
    label: "Billing",
    icon: <CreditCard size={18} aria-hidden="true" />,
  },
];

function hasSession(): boolean {
  try {
    return Boolean(localStorage.getItem("token"));
  } catch {
    return false;
  }
}

export function AdsLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to={adsPaths.overview} className="fk-ads-logo" aria-label="Fockis Ads home">
      <img
        src="/brand/fockis-icon-96.png"
        srcSet="/brand/fockis-icon-96.png 1x, /brand/fockis-icon-192.png 2x"
        alt=""
        width={36}
        height={36}
      />
      {!compact && (
        <span className="fk-ads-logo__text">
          Fockis <em>Ads</em>
        </span>
      )}
    </Link>
  );
}

export default function AdsShell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const signedIn = hasSession();

  /* Close the mobile drawer whenever the route changes. */
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="fk-ads-shell">
      <aside
        id="fk-ads-sidebar"
        className={`fk-ads-sidebar${drawerOpen ? " is-open" : ""}`}
        aria-label="Fockis Ads navigation"
      >
        <div className="fk-ads-sidebar__head">
          <AdsLogo />
          <button
            type="button"
            className="fk-ads-icon-btn fk-ads-sidebar__close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary fk-ads-sidebar__create">
          <Plus size={18} aria-hidden="true" />
          Create campaign
        </Link>

        <nav className="fk-ads-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `fk-ads-nav__link${isActive ? " is-active" : ""}`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="fk-ads-sidebar__foot">
          <Link to="/" className="fk-ads-nav__link">
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Back to Fockis</span>
          </Link>
        </div>
      </aside>

      {drawerOpen && (
        <button
          type="button"
          className="fk-ads-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="fk-ads-main">
        <header className="fk-ads-topbar">
          <button
            type="button"
            className="fk-ads-icon-btn fk-ads-topbar__menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="fk-ads-sidebar"
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          <div className="fk-ads-topbar__brand">
            <AdsLogo />
          </div>

          <div className="fk-ads-topbar__spacer" />

          <Link to={adsPaths.create} className="fk-ads-btn fk-ads-btn--primary fk-ads-topbar__create">
            <Plus size={16} aria-hidden="true" />
            <span>New campaign</span>
          </Link>
        </header>

        <div className="fk-ads-content">
          {signedIn ? (
            <Outlet />
          ) : (
            <section className="fk-ads-empty fk-ads-empty--page">
              <img src="/brand/fockis-icon-96.png" alt="" width={56} height={56} />
              <h1>Sign in to use Fockis Ads</h1>
              <p>
                Campaigns, budgets and results are tied to your Fockis account.
              </p>
              <Link to="/login" className="fk-ads-btn fk-ads-btn--primary">
                Sign in
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
