import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AcademyAdminSidebar from './AcademyAdminSidebar';
import AcademyAdminHeader from './AcademyAdminHeader';
import AcademyToast from '../AcademyToast';
import { ADMIN_NAV } from './adminNavConfig';
import '../../../styles/academy.scss';
import '../../../styles/academy-admin.scss';

function currentPageTitle(pathname: string, search: string): string {
  const full = pathname + search;
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      const [itemPath] = item.href.split('?');
      if (item.href === full || itemPath === pathname) return item.label;
    }
  }
  return 'Admin';
}

export default function AcademyAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="academy academy-admin">
      <AcademyAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="admin-main">
        <AcademyAdminHeader title={currentPageTitle(location.pathname, location.search)} onMenuClick={() => setSidebarOpen(true)} />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
      <AcademyToast />
    </div>
  );
}
