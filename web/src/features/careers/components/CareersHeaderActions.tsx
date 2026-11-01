import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Bookmark, Briefcase, FileText, House, LogIn, Settings, UserRound } from 'lucide-react';
import FockisMark from '../../../components/fockis/FockisMark';
import styles from '../styles/CareersLayout.module.scss';
import ui from '../../employer/styles/EmployerShared.module.scss';
import { displayName, useCareerUser } from '../hooks/useCareerUser';
import { initialsOf } from '../services/careersApi';

export function CareersBrand({ to = '/careers', inline = false }: { to?: string; inline?: boolean }) {
  return (
    <Link to={to} className={`${styles.brand} ${inline ? styles.brandInline : ''}`} aria-label="Fockis Careers home">
      <span className={styles.brandMark}>
        <FockisMark />
      </span>
      <span className={styles.brandText}>
        <strong>Fockis</strong>
        <span>Careers</span>
      </span>
    </Link>
  );
}

/** Alerts bell + account menu, shared by both Careers layouts. */
export function CareersHeaderActions() {
  const { user, newAlertMatches } = useCareerUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => !ref.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = displayName(user);

  if (!user) {
    return (
      <Link to="/login" className={`${ui.btnPrimary} ${ui.btnSm}`}>
        <LogIn size={15} /> Sign in
      </Link>
    );
  }

  return (
    <>
      <span className={styles.iconWrap}>
        <Link
          to="/careers/alerts"
          className={ui.iconBtn}
          aria-label={newAlertMatches ? `Job alerts, ${newAlertMatches} new matches` : 'Job alerts'}
        >
          <Bell size={19} />
        </Link>
        {newAlertMatches > 0 && <span className={styles.badgeDot}>{newAlertMatches > 99 ? '99+' : newAlertMatches}</span>}
      </span>

      <div className={styles.iconWrap} ref={ref}>
        <button
          type="button"
          className={styles.avatarBtn}
          onClick={() => setOpen((value) => !value)}
          aria-label="Your account"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          {user.profilePicture ? <img src={user.profilePicture} alt="" /> : initialsOf(name || 'Me')}
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <div className={styles.menuHeader}>
              <strong>{name || 'Your account'}</strong>
              <span>{user.email ?? ''}</span>
            </div>
            {[
              { to: '/careers/dashboard', icon: <House size={16} />, label: 'Careers overview' },
              { to: '/careers/applications', icon: <FileText size={16} />, label: 'My applications' },
              { to: '/careers/saved-jobs', icon: <Bookmark size={16} />, label: 'Saved jobs' },
              { to: '/careers/profile', icon: <UserRound size={16} />, label: 'Career profile' },
              { to: '/careers/employer', icon: <Briefcase size={16} />, label: 'Employer Center' },
              { to: '/settings', icon: <Settings size={16} />, label: 'Account settings' },
            ].map((item) => (
              <Link key={item.to} to={item.to} className={styles.menuLink} role="menuitem" onClick={() => setOpen(false)}>
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
