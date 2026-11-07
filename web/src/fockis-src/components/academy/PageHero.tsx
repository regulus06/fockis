import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './market/Icon';
import { FockisMark } from './market/Shared';

/**
 * Page header for Academy content pages — design board style (soft blue band,
 * breadcrumb, big navy title, optional actions). Same props as before plus
 * optional `icon` and `actions`, so existing callers keep working.
 */
export default function PageHero({
  crumb,
  title,
  subtitle,
  icon = 'cap',
  actions,
}: {
  crumb: string;
  title: string;
  subtitle: string;
  icon?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="fa-root">
      <section className="fa-phero">
        <div className="fa-container fa-phero__row">
          <div className="fa-phero__copy">
            <div className="fa-crumbs">
              <Link to="/academy">Home</Link> / <span>{crumb}</span>
            </div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {actions && <div className="fa-phero__actions">{actions}</div>}
          </div>
          <div className="fa-phero__badge" aria-hidden="true">
            <span className="fa-phero__ring" />
            <span className="fa-phero__icon">
              <Icon name={icon} size={46} stroke={1.5} />
            </span>
            <span className="fa-phero__mark">
              <FockisMark size={22} />
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
