import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminTopbar } from '../components/AdminTopbar';
import { AdminToaster } from '../components/AdminToaster';
import { useAdminUiStore } from '../store/adminUiStore';

import '../styles/base.scss';
import '../styles/AdminLayout.scss';
import '../styles/AdminComponents.scss';

// Sections that bring their own sidebar/header.
// While inside one of these sections, the main admin sidebar
// and topbar are hidden so the section can use the full screen.
//
// Examples:
// - Admin Users
// - Marketing Admin
const FULL_SCREEN_SECTIONS = [
  '/admin/users',
  '/admin/marketing-admin',
];

export function AdminLayout() {
  const collapsed = useAdminUiStore((s) => s.sidebarCollapsed);
  const theme = useAdminUiStore((s) => s.theme);
  const { pathname } = useLocation();

  const isFullScreen = FULL_SCREEN_SECTIONS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const shellClass = [
    'fk-shell',
    collapsed && !isFullScreen ? 'fk-shell--collapsed' : '',
    isFullScreen ? 'fk-shell--full' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={shellClass} data-theme={theme}>
      {!isFullScreen && <AdminSidebar />}

      <div className="fk-main">
        {!isFullScreen && <AdminTopbar />}

        <main className="fk-content">
          <Outlet />
        </main>
      </div>

      <AdminToaster />
    </div>
  );
}