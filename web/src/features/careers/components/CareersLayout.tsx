import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Briefcase, Building2, GraduationCap, House, LayoutDashboard, Lightbulb, Menu, X } from 'lucide-react';
import styles from '../styles/CareersLayout.module.scss';
import ui from '../../employer/styles/EmployerShared.module.scss';
import { Toaster } from '../../employer/components/shared/Toaster';
import { CareersBrand, CareersHeaderActions } from './CareersHeaderActions';
import { useCareerUser } from '../hooks/useCareerUser';
import { useSavedJobs } from '../hooks/useSavedJobs';

const NAV = [
  { to: '/careers/jobs', label: 'Find Jobs', icon: Briefcase },
  { to: '/careers/companies', label: 'Companies', icon: Building2 },
  { to: '/careers/internships', label: 'Internships', icon: GraduationCap },
  { to: '/careers/resources', label: 'Career Resources', icon: Lightbulb },
];

/** Public Careers shell: top navigation (Home, Job Listings, Job Details, Companies). */
export function CareersLayout() {
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const loadUser = useCareerUser((state) => state.load);
  const user = useCareerUser((state) => state.user);
  const loadSaved = useSavedJobs((state) => state.load);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) void loadSaved();
  }, [user, loadSaved]);

  useEffect(() => {
    setDrawer(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className={`${styles.root} fockis-careers-app`}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <button type="button" className={`${ui.iconBtn} ${styles.burger}`} onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer}>
            <Menu size={20} />
          </button>
          <CareersBrand />
          <nav className={styles.topNav} aria-label="Careers">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? styles.navActive : undefined)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className={styles.topActions}>
            <Link to="/careers/employer" className={`${ui.btnSecondary} ${ui.btnSm} ${styles.employerLink}`}>
              For Employers
            </Link>
            <CareersHeaderActions />
          </div>
        </div>
      </header>

      {drawer && (
        <>
          <button type="button" className={styles.scrim} aria-label="Close menu" onClick={() => setDrawer(false)} />
          <nav className={styles.drawer} aria-label="Careers menu">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <CareersBrand />
              <button type="button" className={ui.iconBtn} style={{ marginLeft: 'auto' }} onClick={() => setDrawer(false)} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
            <NavLink to="/careers" end className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerActive : ''}`}>
              <House size={18} /> Home
            </NavLink>
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `${styles.drawerLink} ${isActive ? styles.drawerActive : ''}`}>
                <Icon size={18} /> {label}
              </NavLink>
            ))}
            <div className={styles.drawerDivider} />
            <NavLink to="/careers/dashboard" className={styles.drawerLink}>
              <LayoutDashboard size={18} /> My Careers
            </NavLink>
            <NavLink to="/careers/employer" className={styles.drawerLink}>
              <Briefcase size={18} /> For Employers
            </NavLink>
          </nav>
        </>
      )}

      <main className={styles.publicMain} id="careers-main">
        <Outlet />
      </main>

      <footer className={styles.publicFooter}>
        <div>
          <span>© {new Date().getFullYear()} Fockis Careers</span>
          <Link to="/careers/jobs">Find jobs</Link>
          <Link to="/careers/companies">Companies</Link>
          <Link to="/careers/resources">Career resources</Link>
          <Link to="/careers/employer">Post a job</Link>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}

export default CareersLayout;
