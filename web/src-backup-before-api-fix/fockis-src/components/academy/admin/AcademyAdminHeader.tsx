import { useNavigate } from 'react-router-dom';
import { useAcademyAdminAuth } from '../../../lib/academyAdminAuth';

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function AcademyAdminHeader({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user, logout } = useAcademyAdminAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/academy/admin/login');
  }

  return (
    <header className="admin-header">
      <div className="admin-header-left">
        <button className="admin-menu-btn" onClick={onMenuClick} aria-label="Open menu">
          ☰
        </button>
        <h1>{title}</h1>
      </div>
      <div className="admin-header-right">
        {user && (
          <div className="admin-user-chip">
            <span className="avatar">{initials(user.name)}</span>
            {user.name}
            <span style={{ opacity: 0.6, fontWeight: 400 }}>· {user.role}</span>
          </div>
        )}
        <button className="btn btn-outline btn-sm" onClick={handleLogout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
