import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAcademyAdminAuth, isAdminRole } from '../../../lib/academyAdminAuth';

/**
 * Wraps every /academy/admin/* route (except the login page itself).
 * Validates the stored JWT against the backend on first mount (via
 * hydrate(), which calls GET /academy/auth/me), then either renders the
 * protected page or redirects to login. This is real authorization, not a
 * UI-only check — every admin API call is separately guarded server-side
 * (AcademyJwtAuthGuard + RolesGuard), so a determined user can't bypass
 * this by editing frontend state; they'd still get 401/403 from the API.
 */
export default function AcademyAdminGuard({ children }: { children: ReactNode }) {
  const { user, status, hydrate } = useAcademyAdminAuth();
  const location = useLocation();

  useEffect(() => {
    if (status === 'idle') {
      hydrate();
    }
  }, [status, hydrate]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="admin-state" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Checking your session…
      </div>
    );
  }

  if (status !== 'authenticated' || !user || !isAdminRole(user.role)) {
    return <Navigate to="/academy/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
