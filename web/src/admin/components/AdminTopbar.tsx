import { AdminBreadcrumbs } from './AdminBreadcrumbs';
import { AdminCommandSearch } from './AdminCommandSearch';
import { AdminNotificationCenter } from './AdminNotificationCenter';
import { MockAdminSessionSelector } from './MockAdminSessionSelector';
import { useAdminUiStore } from '../store/adminUiStore';

export function AdminTopbar() {
  const toggleSidebar = useAdminUiStore((s) => s.toggleSidebar);
  const toggleTheme = useAdminUiStore((s) => s.toggleTheme);
  const theme = useAdminUiStore((s) => s.theme);

  return (
    <header className="fk-topbar">
      <div className="fk-topbar__left">
        <button className="fk-icon-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          ☰
        </button>
        <AdminBreadcrumbs />
      </div>
      <div className="fk-topbar__right">
        <AdminCommandSearch />
        <MockAdminSessionSelector />
        <AdminNotificationCenter />
        <button className="fk-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
