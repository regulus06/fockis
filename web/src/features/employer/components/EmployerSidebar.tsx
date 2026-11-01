import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Settings,
  UserSearch,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import layout from '../styles/EmployerLayout.module.scss';
import ui from '../styles/EmployerShared.module.scss';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';
import FockisMark from '../../../components/fockis/FockisMark';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Extra path prefixes that should highlight this item. */
  match?: string[];
  end?: boolean;
  badgeKey?: 'applications';
}

export const EMPLOYER_NAV: NavItem[] = [
  { label: 'Dashboard', to: EMPLOYER_BASE_PATH, icon: LayoutDashboard, end: true },
  { label: 'Job Listings', to: `${EMPLOYER_BASE_PATH}/jobs`, icon: Briefcase },
  { label: 'Applications', to: `${EMPLOYER_BASE_PATH}/applicants`, icon: FileText, badgeKey: 'applications' },
  { label: 'Candidates', to: `${EMPLOYER_BASE_PATH}/candidates`, icon: UserSearch },
  { label: 'Interviews', to: `${EMPLOYER_BASE_PATH}/interviews`, icon: CalendarDays },
  {
    label: 'Company Profile',
    to: `${EMPLOYER_BASE_PATH}/profile`,
    icon: Building2,
    match: [`${EMPLOYER_BASE_PATH}/verification`],
  },
  { label: 'Analytics', to: `${EMPLOYER_BASE_PATH}/analytics`, icon: BarChart3 },
  { label: 'Resources', to: `${EMPLOYER_BASE_PATH}/resources`, icon: BookOpen },
  { label: 'Team Management', to: `${EMPLOYER_BASE_PATH}/team`, icon: UsersRound },
  { label: 'Billing', to: `${EMPLOYER_BASE_PATH}/billing`, icon: CreditCard },
  { label: 'Settings', to: `${EMPLOYER_BASE_PATH}/settings`, icon: Settings },
];

interface EmployerSidebarProps {
  open: boolean;
  onClose: () => void;
  badges?: { applications?: number };
}

export function EmployerSidebar({ open, onClose, badges }: EmployerSidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside
      id="employer-sidebar"
      className={`${layout.sidebar} ${open ? layout.sidebarOpen : ''}`}
      aria-label="Employer Center"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <Link to={EMPLOYER_BASE_PATH} className={layout.brand} onClick={onClose}>
          <span className={layout.brandMark} aria-hidden="true">
            <FockisMark />
          </span>
          <span className={layout.brandText}>
            <strong>Fockis</strong>
            <span>Employer Center</span>
          </span>
        </Link>
        <button type="button" className={`${ui.iconBtn} ${layout.sidebarClose}`} onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className={layout.nav} aria-label="Employer navigation">
        {EMPLOYER_NAV.map((item) => {
          const extraMatch = item.match?.some((prefix) => pathname.startsWith(prefix)) ?? false;
          const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `${layout.navLink} ${isActive || extraMatch ? layout.navLinkActive : ''}`
              }
              aria-current={extraMatch ? 'page' : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {item.label}
              {typeof badge === 'number' && badge > 0 && (
                <span className={layout.navBadge} aria-label={`${badge} new`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className={layout.sidebarFooter}>
        <Link to="/careers" className={layout.careersLink}>
          View Careers Site <ExternalLink size={14} aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}

export default EmployerSidebar;
