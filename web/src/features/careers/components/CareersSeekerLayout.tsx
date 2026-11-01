import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  Briefcase,
  FileText,
  FileUser,
  House,
  Lightbulb,
  Menu,
  Search,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import styles from '../styles/CareersLayout.module.scss';
import ui from '../../employer/styles/EmployerShared.module.scss';
import { Toaster } from '../../employer/components/shared/Toaster';
import { CareersBrand, CareersHeaderActions } from './CareersHeaderActions';
import { useCareerUser } from '../hooks/useCareerUser';
import { useSavedJobs } from '../hooks/useSavedJobs';

/** Job seeker shell: navy sidebar (Overview, Applications, Saved Jobs, Resume, Profile, Alerts…). */
export function CareersSeekerLayout() {
  const { pathname, hash } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { load, user, newAlertMatches } = useCareerUser();
  const loadSaved = useSavedJobs((state) => state.load);
  const savedCount = useSavedJobs((state) => state.savedJobIds.size);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (user) void loadSaved();
  }, [user, loadSaved]);

  useEffect(() => {
    setOpen(false);
    if (!hash) window.scrollTo({ top: 0 });
  }, [pathname, hash]);

  const items = [
    { to: '/careers/dashboard', label: 'Overview', icon: House },
    { to: '/careers/applications', label: 'My Applications', icon: FileText },
    { to: '/careers/saved-jobs', label: 'Saved Jobs', icon: Bookmark, badge: savedCount },
    { to: '/careers/resume', label: 'My Resume', icon: FileUser },
    { to: '/careers/profile', label: 'Career Profile', icon: UserRound },
    { to: '/careers/alerts', label: 'Job Alerts', icon: Bell, badge: newAlertMatches },
    { to: '/careers/resources', label: 'Career Resources', icon: Lightbulb },
  ];

  const search = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(`/careers/jobs${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };

  return (
    <div className={`${styles.root} fockis-careers-app`}>
      <div className={styles.seekerShell}>
        <aside id="careers-sidebar" className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`} aria-label="My careers">
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <CareersBrand />
            <button type="button" className={`${ui.iconBtn} ${styles.sideClose}`} onClick={() => setOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
          <nav className={styles.sideNav} aria-label="Job seeker navigation">
            {items.map(({ to, label, icon: Icon, badge }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `${styles.sideLink} ${isActive ? styles.sideActive : ''}`}>
                <Icon size={18} aria-hidden="true" />
                {label}
                {typeof badge === 'number' && badge > 0 && <span className={styles.sideBadge}>{badge > 99 ? '99+' : badge}</span>}
              </NavLink>
            ))}
            <Link to="/settings" className={styles.sideLink}>
              <Settings size={18} aria-hidden="true" /> Settings
            </Link>
          </nav>
          <div className={styles.sideFooter}>
            <Link to="/careers/jobs"><Search size={15} /> Find Jobs</Link>
            <Link to="/careers/employer"><Briefcase size={15} /> Employer Center</Link>
          </div>
        </aside>
        {open && <button type="button" className={styles.scrim} aria-label="Close menu" onClick={() => setOpen(false)} />}

        <div className={styles.seekerMain}>
          <header className={styles.seekerTop}>
            <button type="button" className={`${ui.iconBtn} ${styles.burger}`} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="careers-sidebar">
              <Menu size={20} />
            </button>
            <form className={styles.topSearch} role="search" onSubmit={search}>
              <Search size={16} aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs, companies or skills…" aria-label="Search jobs" />
            </form>
            <div className={styles.topActions}>
              <CareersHeaderActions />
            </div>
          </header>
          <main className={styles.seekerContent} id="careers-main">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}

export default CareersSeekerLayout;
