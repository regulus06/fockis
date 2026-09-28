import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const UTILITY_LINKS = [
  { label: 'Students', href: '/academy/portal' },
  { label: 'Faculty & Staff', href: '/academy/faculty' },
  { label: 'Parents', href: '/academy/contact' },
  { label: 'Alumni', href: '/academy/about' },
  { label: 'Employers', href: '/academy/employers' },
  { label: 'Library', href: '/academy/library' },
  { label: 'Canvas / LMS', href: '/academy/lms' },
  { label: 'Student Portal', href: '/academy/portal' },
  { label: 'Contact', href: '/academy/contact' },
];

const MAIN_LINKS = [
  { label: 'Academics', href: '/academy/academics' },
  { label: 'Admissions', href: '/academy/admissions' },
  { label: 'Student Life', href: '/academy/student-life' },
  { label: 'Programs', href: '/academy/programs' },
  { label: 'Online Learning', href: '/academy/online-learning' },
  { label: 'Career Center', href: '/academy/career' },
  { label: 'About', href: '/academy/about' },
  { label: 'Resources', href: '/academy/library' },
];

const SEARCH_INDEX = [
  { label: 'Cybersecurity Program', href: '/academy/programs', kw: 'cybersecurity security hacking' },
  { label: 'Apply to Fockis Academy', href: '/academy/admissions', kw: 'apply application admissions' },
  { label: 'Tuition & Financial Aid', href: '/academy/financial-aid', kw: 'tuition cost financial aid scholarships fafsa' },
  { label: 'Student Portal', href: '/academy/portal', kw: 'portal dashboard gpa' },
  { label: 'Fockis Learn (LMS)', href: '/academy/lms', kw: 'lms canvas course learn' },
  { label: 'Career Center & Jobs', href: '/academy/career', kw: 'career job internship resume' },
  { label: 'Online Learning', href: '/academy/online-learning', kw: 'online learning virtual classroom' },
  { label: 'Faculty Directory', href: '/academy/faculty', kw: 'faculty professor staff' },
  { label: 'Library', href: '/academy/library', kw: 'library research ebooks' },
  { label: 'Academic Calendar', href: '/academy/calendar', kw: 'calendar dates deadlines' },
  { label: 'Contact Us', href: '/academy/contact', kw: 'contact phone email address' },
];

export default function AcademyNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const matches = query.trim()
    ? SEARCH_INDEX.filter(
        (i) => i.label.toLowerCase().includes(query.toLowerCase()) || i.kw.includes(query.toLowerCase())
      )
    : [];

  function goTo(href: string) {
    setMobileOpen(false);
    setSearchOpen(false);
    setQuery('');
    navigate(href);
  }

  return (
    <>
      {/* UTILITY BAR */}
      <div className="utility-bar">
        <div className="wrap">
          <div className="utility-links">
            {UTILITY_LINKS.map((l) => (
              <Link key={l.label} to={l.href}>
                {l.label}
              </Link>
            ))}
          </div>
          <button className="utility-search" onClick={() => setSearchOpen(true)}>
            🔍 Search
          </button>
        </div>
      </div>

      {/* MAIN NAV */}
      <nav className="mainnav">
        <div className="wrap">
          <Link className="logo" to="/academy">
            <span className="logo-mark">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 8L12 4L20 8L12 12L4 8Z" stroke="#E3A542" strokeWidth={1.6} strokeLinejoin="round" />
                <path d="M7 10.5V16C7 16 9 18 12 18C15 18 17 16 17 16V10.5" stroke="#E3A542" strokeWidth={1.6} />
              </svg>
            </span>
            FOCKIS ACADEMY
          </Link>
          <div className="nav-links">
            {MAIN_LINKS.map((l) => (
              <Link key={l.label} to={l.href} className={location.pathname === l.href ? 'active' : ''}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="nav-cta">
            <Link className="btn btn-outline btn-sm" to="/academy/contact">
              Request Info
            </Link>
            <Link className="btn btn-gold btn-sm" to="/academy/admissions">
              Apply Now
            </Link>
            <button className="hamburger" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`mobile-menu${mobileOpen ? ' open' : ''}`}>
        <div className="wrap">
          <div className="mobile-menu-top">
            <span className="logo" style={{ color: '#fff' }}>
              FOCKIS ACADEMY
            </span>
            <button className="mobile-menu-close" onClick={() => setMobileOpen(false)}>
              &times;
            </button>
          </div>
          {[...MAIN_LINKS, { label: 'Contact', href: '/academy/contact' }].map((l) => (
            <a key={l.label} onClick={() => goTo(l.href)}>
              {l.label}
            </a>
          ))}
          <button className="btn btn-gold" onClick={() => goTo('/academy/admissions')}>
            Apply Now
          </button>
        </div>
      </div>

      {/* SEARCH MODAL */}
      <div className={`modal-overlay${searchOpen ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setSearchOpen(false)}>
        <div className="modal-box">
          <button className="modal-close" onClick={() => setSearchOpen(false)}>
            &times;
          </button>
          <h3 style={{ marginBottom: 16 }}>Search Fockis Academy</h3>
          <div className="field">
            <input
              type="text"
              placeholder="Try 'cybersecurity', 'financial aid', 'apply'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {query.trim() && matches.length === 0 && <p>No results — try &quot;cybersecurity&quot; or &quot;financial aid&quot;.</p>}
            {matches.map((m) => (
              <a
                key={m.label}
                onClick={() => goTo(m.href)}
                style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, display: 'block', fontWeight: 600, cursor: 'pointer' }}
              >
                {m.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
