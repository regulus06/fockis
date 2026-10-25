import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  BriefcaseBusiness,
  CalendarCheck,
  Heart,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";

import { travelApi } from "../services/travelApi";
import "../styles/TravelHeader.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — HEADER
 * ============================================================================
 * Clean white bar from the reference design:
 *   logo · Stays · Vacation Rentals · Restaurants · Cars · Experiences ·
 *   Events · Business Travel · search · favorites · account · Sign In
 *
 * Every link points at an existing Travel route. Pages that are not in the
 * main bar (Destinations, Transfers, Trip planner, Price alerts, Partner)
 * stay reachable from the menu drawer.
 * ============================================================================
 */

const LOGO_SRC = "/brand/fockis-icon-96.png";

interface NavItem {
  to: string;
  label: string;
}

const PRIMARY_NAV: NavItem[] = [
  { to: "/travel/stays", label: "Stays" },
  { to: "/travel/explore?type=rental", label: "Vacation Rentals" },
  { to: "/travel/restaurants", label: "Restaurants" },
  { to: "/travel/cars", label: "Cars" },
  { to: "/travel/experiences", label: "Experiences" },
  { to: "/travel/explore?type=event", label: "Events" },
  { to: "/travel/business", label: "Business Travel" },
];

const MORE_NAV: NavItem[] = [
  { to: "/travel/meetings", label: "Meetings" },
  { to: "/travel/transfers", label: "Transfers" },
  { to: "/travel/destinations", label: "Destinations" },
  { to: "/travel/trip-planner", label: "Trip planner" },
  { to: "/travel/price-alerts", label: "Price alerts" },
];

function isItemActive(item: NavItem, pathname: string, search: string): boolean {
  const [path, query = ""] = item.to.split("?");

  if (query) {
    const wanted = new URLSearchParams(query);
    const current = new URLSearchParams(search);
    return (
      pathname === path &&
      Array.from(wanted.entries()).every(([key, value]) => current.get(key) === value)
    );
  }

  return pathname === path || pathname.startsWith(`${path}/`);
}

export function TravelLogo({ compact = false }: { compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={`ft-logo${compact ? " ft-logo--compact" : ""}`}>
      {failed ? (
        <span className="ft-logo__fallback" aria-hidden="true">
          F
        </span>
      ) : (
        <img
          src={LOGO_SRC}
          alt=""
          width={34}
          height={34}
          onError={() => setFailed(true)}
        />
      )}
      <span className="ft-logo__word">
        Fockis <span>Travel</span>
      </span>
    </span>
  );
}

export default function TravelHeader() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(() => travelApi.hasAuthToken());
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close the drawer and re-check auth on every navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSignedIn(travelApi.hasAuthToken());
  }, [location.pathname, location.search]);

  // Lock scroll, close on Escape and move focus into the drawer.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const navClass = (item: NavItem) =>
    `ft-header__link${isItemActive(item, location.pathname, location.search) ? " is-active" : ""}`;

  return (
    <header className="ft-header">
      <div className="ft-header__inner">
        <Link to="/travel" className="ft-header__brand" aria-label="Fockis Travel home">
          <TravelLogo />
        </Link>

        <nav className="ft-header__nav" aria-label="Travel">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={navClass(item)}
              aria-current={isItemActive(item, location.pathname, location.search) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ft-header__actions">
          <Link to="/travel/explore" className="ft-header__icon" aria-label="Search Fockis Travel">
            <Search size={20} aria-hidden="true" />
          </Link>

          <Link to="/travel/wishlist" className="ft-header__icon" aria-label="Favorites">
            <Heart size={20} aria-hidden="true" />
          </Link>

          <Link
            to={signedIn ? "/travel/my-trips" : "/travel/sign-in"}
            className={`ft-header__icon${signedIn ? " ft-header__icon--account" : ""}`}
            aria-label={signedIn ? "My Trips" : "Account"}
          >
            <User size={20} aria-hidden="true" />
          </Link>

          {!signedIn && (
            <Link to="/travel/sign-in" className="ft-header__signin">
              Sign In
            </Link>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            className="ft-header__menu"
            aria-label="Open Travel menu"
            aria-expanded={menuOpen}
            aria-controls="ft-header-drawer"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="ft-drawer" id="ft-header-drawer">
          <button
            type="button"
            className="ft-drawer__backdrop"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
          />

          <div
            ref={drawerRef}
            className="ft-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Fockis Travel menu"
          >
            <div className="ft-drawer__head">
              <TravelLogo compact />
              <button
                type="button"
                className="ft-drawer__close"
                aria-label="Close menu"
                onClick={() => {
                  setMenuOpen(false);
                  menuButtonRef.current?.focus();
                }}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <div className="ft-drawer__quick">
              <Link to="/travel/my-trips">
                <CalendarCheck size={18} aria-hidden="true" /> My Trips
              </Link>
              <Link to="/travel/wishlist">
                <Heart size={18} aria-hidden="true" /> Favorites
              </Link>
              <Link to={signedIn ? "/travel/my-trips" : "/travel/sign-in"}>
                <User size={18} aria-hidden="true" /> {signedIn ? "Account" : "Sign In"}
              </Link>
            </div>

            <nav aria-label="Travel categories">
              <h2>Explore</h2>
              <NavLink to="/travel" end className={({ isActive }) => (isActive ? "is-active" : "")}>
                Home
              </NavLink>
              {PRIMARY_NAV.map((item) => (
                <Link key={item.to} to={item.to} className={navClass(item)}>
                  {item.label}
                </Link>
              ))}
              {MORE_NAV.map((item) => (
                <Link key={item.to} to={item.to} className={navClass(item)}>
                  {item.label}
                </Link>
              ))}

              <h2>For businesses</h2>
              <Link to="/travel/partner">
                <BriefcaseBusiness size={16} aria-hidden="true" /> Become a Partner
              </Link>
              <Link to="/travel/partner/dashboard">Partner dashboard</Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
