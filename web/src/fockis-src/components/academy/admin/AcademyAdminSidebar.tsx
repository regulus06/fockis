import { Link, useLocation } from 'react-router-dom';
import { ADMIN_NAV } from './adminNavConfig';

export default function AcademyAdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const currentPath = location.pathname + location.search;

  function isActive(href: string) {
    const [hrefPath] = href.split('?');
    if (hrefPath === '/academy/admin') return location.pathname === '/academy/admin';
    return location.pathname === hrefPath || currentPath === href;
  }

  return (
    <>
      <div className={`admin-sidebar-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        <div className="admin-sidebar-brand">
          <span className="logo-mark">FA</span>
          FOCKIS ACADEMY ADMIN
        </div>
        {ADMIN_NAV.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <div className="admin-nav-label">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`admin-nav-link${isActive(item.href) ? ' active' : ''}`}
                onClick={onClose}
              >
                <span className="dot" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="admin-sidebar-footer">
          <Link to="/academy" style={{ color: '#9BAAB8' }}>
            ← Back to public site
          </Link>
        </div>
      </aside>
    </>
  );
}
