import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './market/Icon';
import { Logo } from './market/Shared';
import { signOutAcademy, useAcademySession } from '../../lib/academySession';

/**
 * Academy top navigation — design board style (logo · Courses · Seminars ·
 * Workshops · Instructors · Institutions · search · bell · avatar).
 *
 * Every institutional page that existed before (Academics, Admissions,
 * Financial Aid, Library, Career, Faculty, Student Life, LMS, Portal…) is
 * still reachable from the "More" menu, the mobile menu and search.
 *
 * Notifications are passed in through `rightSlot` from your app shell (they
 * belong to the existing Fockis notification system).
 */

const MAIN_LINKS = [
  { label: 'Courses', href: '/academy/learn' },
  { label: 'Seminars', href: '/academy/calendar' },
  { label: 'Programs', href: '/academy/programs' },
  { label: 'Instructors', href: '/academy/faculty' },
  { label: 'Institutions', href: '/academy/campus' },
];

const EXPLORE_GROUPS = [
  {
    title: 'Learn',
    links: [
      { label: 'All courses', href: '/academy/learn' },
      { label: 'Schools on Fockis', href: '/academy/schools' },
      { label: 'Programs', href: '/academy/programs' },
      { label: 'Events & seminars', href: '/academy/calendar' },
      { label: 'My learning', href: '/academy/portal' },
      { label: 'My certificates', href: '/academy/portal/certificates' },
      { label: 'Verify a certificate', href: '/academy/verify' },
    ],
  },
  {
    title: 'Teach',
    links: [
      { label: 'Creator Studio', href: '/academy/studio' },
      { label: 'Create a class or seminar', href: '/academy/studio/new' },
      { label: 'Register your school', href: '/academy/schools/register' },
      { label: 'My school', href: '/academy/school' },
      { label: 'Become an instructor', href: '/academy/teach' },
      { label: 'Instructor dashboard', href: '/academy/instructor' },
      { label: 'Create a course', href: '/academy/instructor/course/new' },
      { label: 'Certificates', href: '/academy/instructor/certificates' },
      { label: 'Academy admin', href: '/academy/admin' },
    ],
  },
  {
    title: 'Academy',
    links: [
      { label: 'Campus overview', href: '/academy/campus' },
      { label: 'Academics', href: '/academy/academics' },
      { label: 'Admissions', href: '/academy/admissions' },
      { label: 'Financial Aid', href: '/academy/financial-aid' },
      { label: 'Online Learning', href: '/academy/online-learning' },
      { label: 'Student Life', href: '/academy/student-life' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Student Portal', href: '/academy/portal' },
      { label: 'Library', href: '/academy/library' },
      { label: 'Career Center', href: '/academy/career' },
      { label: 'Employers', href: '/academy/employers' },
      { label: 'About', href: '/academy/about' },
      { label: 'Contact', href: '/academy/contact' },
    ],
  },
];

const SEARCH_INDEX = [
  { label: 'Browse all courses', href: '/academy/learn', kw: 'course courses learn browse catalog' },
  { label: 'Events & seminars', href: '/academy/calendar', kw: 'seminar webinar event workshop live' },
  { label: 'Creator Studio', href: '/academy/studio', kw: 'create sell teach seminar class course live business studio' },
  { label: 'Schools on Fockis', href: '/academy/schools', kw: 'school university college institution organization apply' },
  { label: 'Register your school', href: '/academy/schools/register', kw: 'register school university institution organization domain' },
  { label: 'Become an instructor', href: '/academy/teach', kw: 'teach instructor professor apply earn' },
  { label: 'Instructor dashboard', href: '/academy/instructor', kw: 'teach instructor professor create dashboard' },
  { label: 'My learning', href: '/academy/portal', kw: 'my courses dashboard portal grades lms learn' },
  { label: 'My certificates', href: '/academy/portal/certificates', kw: 'certificate certificates diploma' },
  { label: 'Verify a certificate', href: '/academy/verify', kw: 'verify verification authentic qr certificate enrollment id' },
  { label: 'Certificate designer', href: '/academy/instructor/certificates/designer', kw: 'certificate template design designer issue' },
  { label: 'Apply to Fockis Academy', href: '/academy/admissions', kw: 'apply application admissions' },
  { label: 'Tuition & Financial Aid', href: '/academy/financial-aid', kw: 'tuition cost financial aid scholarships fafsa' },
  { label: 'Career Center & Jobs', href: '/academy/career', kw: 'career job internship resume' },
  { label: 'Online Learning', href: '/academy/online-learning', kw: 'online learning virtual classroom' },
  { label: 'Faculty Directory', href: '/academy/faculty', kw: 'faculty professor staff instructors' },
  { label: 'Library', href: '/academy/library', kw: 'library research ebooks' },
  { label: 'Academic Calendar', href: '/academy/calendar', kw: 'calendar dates deadlines' },
  { label: 'Contact Us', href: '/academy/contact', kw: 'contact phone email address' },
];

export default function AcademyNavbar({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<HTMLDivElement>(null);
  const [meOpen, setMeOpen] = useState(false);
  const location = useLocation();
  const session = useAcademySession();
  const user = session.user;
  const role = String(user?.role ?? '');
  const teaches = ['instructor', 'staff', 'administrator'].includes(role);
  const admin = ['staff', 'administrator'].includes(role);
  const initials = (user?.name ?? '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const loginHref = `/academy/login?next=${encodeURIComponent(location.pathname + location.search)}`;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (meRef.current && !meRef.current.contains(e.target as Node)) setMeOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = q ? SEARCH_INDEX.filter((i) => i.label.toLowerCase().includes(q) || i.kw.includes(q)).slice(0, 6) : [];

  function goTo(href: string) {
    setMobileOpen(false);
    setMoreOpen(false);
    setQuery('');
    navigate(href);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q) return;
    goTo(`/academy/learn?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="fa-root">
      <header className="fa-mnav">
        <div className="fa-container fa-mnav__row">
          <Logo />

          <nav className="fa-mnav__links" aria-label="Academy">
            {MAIN_LINKS.map((l) => (
              <NavLink key={l.label} to={l.href} className={({ isActive }) => `fa-mnav__link${isActive ? ' is-active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
            <div className="fa-mnav__more" ref={moreRef}>
              <button type="button" className="fa-mnav__link" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)}>
                More <Icon name="chevron" size={13} />
              </button>
              {moreOpen && (
                <div className="fa-mega" role="menu">
                  {EXPLORE_GROUPS.map((g) => (
                    <div key={g.title}>
                      <h4>{g.title}</h4>
                      {g.links.map((l) => (
                        <button key={l.href + l.label} type="button" role="menuitem" onClick={() => goTo(l.href)}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <form className="fa-search" role="search" onSubmit={submitSearch}>
            <Icon name="search" size={15} />
            <input
              type="search"
              placeholder="Search courses, seminars..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              aria-label="Search Fockis Academy"
            />
            {searchFocus && matches.length > 0 && (
              <div className="fa-search__pop">
                {matches.map((m) => (
                  <button key={m.label} type="button" onMouseDown={() => goTo(m.href)}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="fa-mnav__right">
            {rightSlot}
            {session.status === 'user' && user ? (
              <>
                <Link className="fa-btn fa-btn--white fa-btn--sm fa-hide-sm" to="/academy/portal">
                  My learning
                </Link>
                <div className="fa-me" ref={meRef}>
                  <button type="button" className="fa-me__btn" aria-expanded={meOpen} aria-label="Account menu" onClick={() => setMeOpen((o) => !o)}>
                    <span className="fa-me__avatar">{initials}</span>
                    <span className="fa-me__name fa-hide-sm">{user.name?.split(' ')[0]}</span>
                    <Icon name="chevron" size={13} />
                  </button>
                  {meOpen && (
                    <div className="fa-me__menu" role="menu">
                      <div className="fa-me__head">
                        <b>{user.name}</b>
                        <small>{user.email}</small>
                        <span className="fa-badge tone-blue">{role || 'student'}</span>
                      </div>
                      <button type="button" role="menuitem" onClick={() => goTo('/academy/portal')}>
                        <Icon name="grid" size={15} /> My learning
                      </button>
                      <button type="button" role="menuitem" onClick={() => goTo('/academy/portal/certificates')}>
                        <Icon name="award" size={15} /> My certificates
                      </button>
                      <button type="button" role="menuitem" onClick={() => goTo('/academy/studio')}>
                        <Icon name="layers" size={15} /> Creator Studio
                      </button>
                      <button type="button" role="menuitem" onClick={() => goTo('/academy/school')}>
                        <Icon name="building" size={15} /> My school
                      </button>
                      <button type="button" role="menuitem" onClick={() => goTo('/academy/change-password')}>
                        <Icon name="lock" size={15} /> Change password
                      </button>
                      {teaches && (
                        <>
                          <button type="button" role="menuitem" onClick={() => goTo('/academy/instructor')}>
                            <Icon name="monitor" size={15} /> Instructor dashboard
                          </button>

                        </>
                      )}
                      <button type="button" role="menuitem" onClick={() => goTo('/academy/instructor/certificates')}>
                        <Icon name="palette" size={15} /> Certificates & designer
                      </button>
                      {admin && (
                        <button type="button" role="menuitem" onClick={() => goTo('/academy/admin')}>
                          <Icon name="settings" size={15} /> Academy admin
                        </button>
                      )}
                      <button
                        type="button"
                        role="menuitem"
                        className="fa-me__out"
                        onClick={() => {
                          signOutAcademy();
                          setMeOpen(false);
                          navigate('/academy');
                        }}
                      >
                        <Icon name="right" size={15} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link className="fa-btn fa-btn--white fa-btn--sm" to={loginHref}>
                  Sign in
                </Link>
                <Link className="fa-btn fa-btn--primary fa-btn--sm fa-hide-sm" to="/academy/register">
                  Join free
                </Link>
              </>
            )}
            <button className="fa-mnav__burger" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
              <Icon name="list" size={22} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fa-mobile" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="fa-mobile__top">
            <Logo />
            <button aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              ✕
            </button>
          </div>
          <div className="fa-mobile__group">
            {session.status === 'user' && user ? (
              <>
                <h4>Signed in as {user.name}</h4>
                <button type="button" onClick={() => goTo('/academy/portal')}>My learning</button>
                <button type="button" onClick={() => { signOutAcademy(); setMobileOpen(false); }}>Sign out</button>
              </>
            ) : (
              <>
                <h4>Account</h4>
                <button type="button" onClick={() => goTo(loginHref)}>Sign in</button>
                <button type="button" onClick={() => goTo('/academy/register')}>Create an account</button>
              </>
            )}
          </div>
          {EXPLORE_GROUPS.map((g) => (
            <div key={g.title} className="fa-mobile__group">
              <h4>{g.title}</h4>
              {g.links.map((l) => (
                <button key={l.href + l.label} type="button" onClick={() => goTo(l.href)}>
                  {l.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
