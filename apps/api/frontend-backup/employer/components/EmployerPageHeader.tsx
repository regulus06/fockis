import type { ReactNode } from 'react';
import styles from '../styles/EmployerShared.module.scss';
interface Props { title: string; description?: string; action?: ReactNode }

export function EmployerPageHeader({ title, description, action }) {
  return <header className={styles.pageHeader}><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
