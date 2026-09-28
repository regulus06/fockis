import { Link, useLocation } from 'react-router-dom';

function titleCase(segment: string): string {
  if (segment.startsWith(':')) return segment;
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function AdminBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <div className="fk-breadcrumbs">
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        const label = titleCase(seg);
        return (
          <span key={path} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span>/</span>}
            {isLast ? (
              <span className="fk-breadcrumbs__current">{label}</span>
            ) : (
              <Link to={path}>{label}</Link>
            )}
          </span>
        );
      })}
    </div>
  );
}
