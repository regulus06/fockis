
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import '../styles/EmployerBreadcrumbs.scss';

export interface EmployerBreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

interface EmployerBreadcrumbsProps {
  items?: EmployerBreadcrumbItem[];
  className?: string;
  separator?: ReactNode;
  showHome?: boolean;
  homeHref?: string;
  homeLabel?: string;
  ariaLabel?: string;
}

export function EmployerBreadcrumbs({
  items = [],
  className = '',
  separator = '/',
  showHome = false,
  homeHref = '/careers/employer',
  homeLabel = 'Employer Center',
  ariaLabel = 'Breadcrumb',
}: EmployerBreadcrumbsProps) {
  const breadcrumbs: EmployerBreadcrumbItem[] = [
    ...(showHome ? [{ label: homeLabel, href: homeHref }] : []),
    ...items,
  ];

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={`employer-breadcrumbs ${className}`.trim()}
    >
      <ol className="employer-breadcrumbs__list">
        {breadcrumbs.map((item, index) => {
          const isCurrentPage = index === breadcrumbs.length - 1;

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li
                className={`employer-breadcrumbs__item${isCurrentPage ? ' employer-breadcrumbs__item--current' : ''}`}
                aria-current={isCurrentPage ? 'page' : undefined}
              >
                {item.href && !isCurrentPage ? (
                  <Link
                    className="employer-breadcrumbs__link"
                    to={item.href}
                  >
                    {item.icon && (
                      <span
                        className="employer-breadcrumbs__icon"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="employer-breadcrumbs__current">
                    {item.icon && (
                      <span
                        className="employer-breadcrumbs__icon"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </span>
                )}
              </li>

              {!isCurrentPage && (
                <li
                  className="employer-breadcrumbs__separator"
                  aria-hidden="true"
                >
                  {separator}
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default EmployerBreadcrumbs;
