import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Heart, Menu, X } from 'lucide-react';
// components/TravelHeader.tsx
import "../styles/TravelHeader.scss";

const NAV_LINKS = [
  { to: '/travel', label: 'Home' },
  { to: '/travel/stays', label: 'Stays' },
  { to: '/travel/cars', label: 'Cars' },
  { to: '/travel/experiences', label: 'Experiences' },
  { to: '/travel/restaurants', label: 'Restaurants' },
  { to: '/travel/transfers', label: 'Transfers' },
  { to: '/travel/destinations', label: 'Destinations' },
];

/**
 * Shared site header for every Fockis Travel page. Renders once per route
 * tree (e.g. inside TravelRoutes) so markup is never duplicated per page.
 */
export default function TravelHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="travel-header">
      <div className="travel-header__inner">
        <Link to="/travel" className="logo">
          <span className="logo-mark" aria-hidden="true" />
          Fockis <small>TRAVEL</small>
        </Link>

        <nav className="travel-header__nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/travel'}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="travel-header__actions">
          <Link to="/travel/partner" className="text-link">Become a Partner</Link>
          <Link to="/travel/my-trips" className="text-link">My Trips</Link>
          <Link to="/travel/wishlist" className="icon-btn" aria-label="Wishlist">
            <Heart size={16} aria-hidden="true" />
          </Link>
          <Link to="/travel/sign-in" className="btn btn-outline">Sign In</Link>
        </div>

        <button
          type="button"
          className="travel-header__mobile-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="travel-header__mobile-menu" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link to="/travel/my-trips" onClick={() => setMenuOpen(false)}>My Trips</Link>
          <Link to="/travel/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
          <Link to="/travel/business" onClick={() => setMenuOpen(false)}>Business</Link>
          <Link to="/travel/partner" onClick={() => setMenuOpen(false)}>Become a Partner</Link>
          <Link to="/travel/sign-in" onClick={() => setMenuOpen(false)}>Sign In</Link>
        </nav>
      )}
    </header>
  );
}
