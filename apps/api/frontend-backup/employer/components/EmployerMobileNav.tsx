import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../styles/EmployerShared.module.scss';

const links = [['Home','/careers/employer'],['Jobs','/careers/employer/jobs'],['Applicants','/careers/employer/applicants']] as const;
export function EmployerMobileNav() {
  return <nav className={styles.mobileNav} aria-label="Employer shortcuts">{links.map(([label, href]) => <NavLink key={href} to={href}>{label}</NavLink>)}</nav>;
}
