import type { ReactNode } from 'react';
import styles from '../styles/EmployerTopbar.module.scss';
interface Props { title?: string }

export function EmployerTopbar({ title = 'Employer Center' }) {
  return <header className={styles.topbar}><strong>{title}</strong><span>Fockis Careers</span></header>;
}
