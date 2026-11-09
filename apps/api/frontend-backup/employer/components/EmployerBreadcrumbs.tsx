import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/EmployerShared.module.scss';
interface Props { items?: { label: string; href?: string }[] }

export function EmployerBreadcrumbs({ items = [] }) {
  return <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>{items.map((item, index) => <span key={`${item.label}-${index}`}>{item.href ? <Link to={item.href}>{item.label}</Link> : item.label}{index < items.length - 1 ? ' / ' : ''}</span>)}</nav>;
}
