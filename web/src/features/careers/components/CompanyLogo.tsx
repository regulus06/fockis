import { useState } from 'react';
import styles from '../styles/JobCard.module.scss';
import { initialsOf } from '../services/careersApi';

export function CompanyLogo({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const cls = size === 'sm' ? styles.logoSm : size === 'lg' ? styles.logoLg : styles.logo;
  return (
    <span className={cls} aria-hidden="true">
      {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : initialsOf(name)}
    </span>
  );
}

export default CompanyLogo;
