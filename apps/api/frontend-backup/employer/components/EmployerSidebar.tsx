import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../styles/EmployerSidebar.module.scss';
interface Props { children?: ReactNode }
const links = [['Overview','/careers/employer'],['Company profile','/careers/employer/profile'],['Verification','/careers/employer/verification'],['Jobs','/careers/employer/jobs'],['Applicants','/careers/employer/applicants'],['Interviews','/careers/employer/interviews'],['Team','/careers/employer/team'],['Analytics','/careers/employer/analytics'],['Billing','/careers/employer/billing'],['Settings','/careers/employer/settings']] as const;
export function EmployerSidebar({ children }) {
  return <aside className={styles.sidebar}><strong>Fockis Employer</strong><nav aria-label="Employer navigation">{links.map(([label, href]) => <NavLink key={href} to={href}>{label}</NavLink>)}</nav></aside>;
}
