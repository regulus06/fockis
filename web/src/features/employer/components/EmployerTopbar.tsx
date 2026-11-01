import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  House,
  Menu,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import layout from '../styles/EmployerLayout.module.scss';
import ui from '../styles/EmployerShared.module.scss';
import { employerApi } from '../services/employerApi';
import { useEmployerStore } from '../store/employerStore';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import type { EmployerActivity } from '../types';
import { formatRelative, initials } from '../utils/employerFormatters';
import { ROLE_LABELS } from '../utils/employerPermissions';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

function MenuLink({ to, icon, children, onClick }: { to: string; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <Link to={to} className={ui.menuItem} onClick={onClick}>
      {icon}
      {children}
    </Link>
  );
}

export function EmployerTopbar({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const navigate = useNavigate();
  const me = useEmployerStore((state) => state.me);
  const [query, setQuery] = useState('');

  const notifications = usePopover();
  const account = usePopover();
  const profile = usePopover();

  const [activity, setActivity] = useState<EmployerActivity[] | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    if (!notifications.open) return;
    setActivityError(null);
    employerApi
      .dashboard(7)
      .then((data) => setActivity(data.recentActivity))
      .catch((error) => setActivityError(getErrorMessage(error)));
  }, [notifications.open]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    navigate(`${EMPLOYER_BASE_PATH}/applicants${value ? `?search=${encodeURIComponent(value)}` : ''}`);
  };

  const companyName = me?.company?.companyName || 'Your company';
  const unread = me?.unreviewedApplications ?? 0;

  return (
    <header className={layout.topbar}>
      <button
        type="button"
        className={`${ui.iconBtn} ${layout.menuToggle}`}
        onClick={onMenu}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="employer-sidebar"
      >
        <Menu size={20} />
      </button>

      <form className={layout.topSearch} role="search" onSubmit={submitSearch}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search applicants by name, email or skill…"
          aria-label="Search applicants"
        />
      </form>

      <div className={layout.topActions}>
        <div className={layout.iconAction} ref={notifications.ref}>
          <button
            type="button"
            className={ui.iconBtn}
            aria-label={unread ? `Notifications, ${unread} unreviewed applications` : 'Notifications'}
            aria-expanded={notifications.open}
            onClick={() => notifications.setOpen((v) => !v)}
          >
            <Bell size={19} />
            {unread > 0 && <span className={layout.dot} aria-hidden="true" />}
          </button>
          {notifications.open && (
            <div className={layout.popover} role="dialog" aria-label="Recent activity">
              <div className={layout.popoverHeader}>
                <strong>Recent activity</strong>
                <span>{unread ? `${unread} application${unread === 1 ? '' : 's'} waiting for review` : 'You are all caught up'}</span>
              </div>
              {activityError && <p className={ui.fieldError} style={{ padding: 10 }}>{activityError}</p>}
              {!activity && !activityError && <p className={ui.muted} style={{ padding: 10, margin: 0, fontSize: 13 }}>Loading…</p>}
              {activity?.length === 0 && <p className={ui.muted} style={{ padding: 10, margin: 0, fontSize: 13 }}>No activity in the last 7 days.</p>}
              {activity?.slice(0, 6).map((item) => (
                <Link key={item.id} to={item.link} className={layout.activityItem} onClick={() => notifications.setOpen(false)}>
                  {item.message}
                  <span>{formatRelative(item.at)}</span>
                </Link>
              ))}
              <Link to={`${EMPLOYER_BASE_PATH}/applicants?status=applied`} className={ui.menuItem} onClick={() => notifications.setOpen(false)} style={{ justifyContent: 'center', color: '#1677e8', fontWeight: 650 }}>
                Review new applications
              </Link>
            </div>
          )}
        </div>

        <Link to={`${EMPLOYER_BASE_PATH}/resources#support`} className={ui.iconBtn} aria-label="Help and support">
          <CircleHelp size={19} />
        </Link>

        <div className={layout.iconAction} ref={account.ref}>
          <button
            type="button"
            className={layout.account}
            aria-label={`Company account: ${companyName}`}
            aria-expanded={account.open}
            onClick={() => account.setOpen((v) => !v)}
          >
            <span className={layout.accountLogo} aria-hidden="true">
              {me?.company?.logoUrl ? <img src={me.company.logoUrl} alt="" /> : initials(companyName)}
            </span>
            <span className={layout.accountText}>
              <strong>{companyName}</strong>
              <span>{me ? ROLE_LABELS[me.role] : 'Employer'}</span>
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {account.open && (
            <div className={layout.popover} role="menu">
              <div className={layout.popoverHeader}>
                <strong>{companyName}</strong>
                <span>{me ? `You are the ${ROLE_LABELS[me.role].toLowerCase()}` : ''}</span>
              </div>
              <MenuLink to={`${EMPLOYER_BASE_PATH}/profile`} icon={<Building2 size={16} />} onClick={() => account.setOpen(false)}>Company profile</MenuLink>
              <MenuLink to={`${EMPLOYER_BASE_PATH}/settings`} icon={<Settings size={16} />} onClick={() => account.setOpen(false)}>Employer settings</MenuLink>
              <MenuLink to="/careers" icon={<ExternalLink size={16} />} onClick={() => account.setOpen(false)}>View careers site</MenuLink>
            </div>
          )}
        </div>

        <div className={layout.iconAction} ref={profile.ref}>
          <button
            type="button"
            className={ui.iconBtn}
            aria-label="Your profile"
            aria-expanded={profile.open}
            onClick={() => profile.setOpen((v) => !v)}
          >
            <UserRound size={19} />
          </button>
          {profile.open && (
            <div className={layout.popover} role="menu" style={{ width: 260 }}>
              <div className={layout.popoverHeader}>
                <strong>{me?.user.username ?? 'Your account'}</strong>
                <span>{me?.user.email ?? ''}</span>
              </div>
              <MenuLink to="/settings" icon={<Settings size={16} />} onClick={() => profile.setOpen(false)}>Account settings</MenuLink>
              <MenuLink to="/fockis-preview" icon={<House size={16} />} onClick={() => profile.setOpen(false)}>Back to Fockis</MenuLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default EmployerTopbar;
