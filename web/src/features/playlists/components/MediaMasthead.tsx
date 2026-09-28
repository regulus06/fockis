import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MenuIcon, XIcon } from './icons';

const NAV_LINKS = [
  { to: '/media/music', label: 'Music' },
  { to: '/media/videos', label: 'Videos' },
  { to: '/media/playlists', label: 'Playlists' },
  { to: '/media/producers', label: 'Producers' },
  { to: '/media/premium', label: 'Premium' },
  { to: '/media/library', label: 'My Library' },
];

/**
 * New component (not in the original file list): every page in this brief
 * shares the same top masthead and secondary nav, so it's factored out here
 * rather than duplicated across five page files.
 */
export function MediaMasthead() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fk-masthead">
      <div className="fk-container">
        <div className="fk-masthead__bar">
          <Link to="/media" className="fk-masthead__brand">
            Fockis Media
            <span className="fk-masthead__brand-sub">Marketplace</span>
          </Link>

          <nav aria-label="Primary">
            <ul className="fk-masthead__nav">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="fk-masthead__link"
                    aria-current={location.pathname.startsWith(link.to) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="fk-masthead__actions">
            <Link to="/media/my-playlists" className="fk-btn fk-btn--outline-inverse fk-btn--sm">
              Become a Producer
            </Link>
            <button
              type="button"
              className="fk-masthead__menu-btn"
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <XIcon width={18} height={18} /> : <MenuIcon width={18} height={18} />}
            </button>
          </div>
        </div>

        <nav
          aria-label="Primary, mobile"
          className={`fk-masthead__mobile-nav${mobileOpen ? ' fk-masthead__mobile-nav--open' : ''}`}
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className="fk-masthead__link" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}