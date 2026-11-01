import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';

interface EmployerPageHeaderProps {
  title: string;
  description?: string;
  /** Buttons rendered on the right. */
  action?: ReactNode;
  back?: { to: string; label: string };
  /** Decorative building art, as in the dashboard design. */
  art?: boolean;
}

function BuildingArt() {
  return (
    <svg className={ui.pageHeaderArt} viewBox="0 0 260 110" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      <defs>
        <linearGradient id="ecTowerA" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#5b7cfa" />
          <stop offset="1" stopColor="#3b4bd8" />
        </linearGradient>
        <linearGradient id="ecTowerB" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#9fb3ff" />
          <stop offset="1" stopColor="#6d7ff0" />
        </linearGradient>
      </defs>
      <polygon points="120,110 120,40 160,22 160,110" fill="url(#ecTowerB)" opacity="0.55" />
      <polygon points="160,110 160,22 205,42 205,110" fill="url(#ecTowerA)" opacity="0.75" />
      <polygon points="190,110 190,8 232,-8 232,110" fill="url(#ecTowerB)" opacity="0.7" />
      <polygon points="232,110 232,-8 260,6 260,110" fill="url(#ecTowerA)" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1="194" x2="228" y1={18 + i * 10} y2={4 + i * 10} stroke="#fff" strokeOpacity="0.35" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`b${i}`} x1="164" x2="201" y1={36 + i * 10} y2={52 + i * 10} stroke="#fff" strokeOpacity="0.3" />
      ))}
    </svg>
  );
}

export function EmployerPageHeader({ title, description, action, back, art = true }: EmployerPageHeaderProps) {
  return (
    <header className={ui.pageHeader}>
      {art && <BuildingArt />}
      <div className={ui.pageHeaderText}>
        {back && (
          <Link to={back.to} className={ui.pageHeaderBack}>
            <ArrowLeft size={14} aria-hidden="true" /> {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className={ui.pageHeaderActions}>{action}</div>}
    </header>
  );
}

export default EmployerPageHeader;
