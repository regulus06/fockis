import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import layout from '../styles/EmployerLayout.module.scss';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerSidebar } from './EmployerSidebar';
import { EmployerTopbar } from './EmployerTopbar';
import { EmployerMobileNav } from './EmployerMobileNav';
import { EmployerError } from './shared/EmployerError';
import { EmployerLoading } from './shared/EmployerLoading';
import { Toaster } from './shared/Toaster';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { ROLE_LABELS } from '../utils/employerPermissions';

/** One shared shell for every Employer Center page. */
export function EmployerLayout() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { me, loading, error, load, setMe } = useEmployerStore();
  const notify = useNotify();
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  // Close the drawer and return to top on navigation.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const accept = async (companyId: string) => {
    setAccepting(companyId);
    try {
      const updated = await employerApi.acceptInvitation(companyId);
      setMe(updated);
      notify('Invitation accepted. You now have access to this Employer Center.');
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className={`${layout.shell} fockis-employer-app`}>
      <EmployerSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        badges={{ applications: me?.unreviewedApplications }}
      />
      <EmployerMobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className={layout.main}>
        <EmployerTopbar onMenu={() => setMenuOpen(true)} menuOpen={menuOpen} />

        <div className={layout.content} id="employer-main">
          {me?.isOwner &&
            me.pendingInvitations.map((invite) => (
              <div key={invite.companyId} className={layout.invite} role="status">
                <span style={{ flex: 1 }}>
                  <strong>{invite.companyName}</strong> invited you to join their Employer Center as{' '}
                  {ROLE_LABELS[invite.role].toLowerCase()}.
                </span>
                <button
                  type="button"
                  className={`${ui.btnPrimary} ${ui.btnSm}`}
                  onClick={() => accept(invite.companyId)}
                  disabled={accepting === invite.companyId}
                >
                  {accepting === invite.companyId ? 'Joining…' : 'Accept invitation'}
                </button>
              </div>
            ))}

          {!me && loading && <EmployerLoading label="Loading your Employer Center…" />}
          {!me && error && (
            <div className={ui.card}>
              <EmployerError title="We couldn't open the Employer Center" message={error} onRetry={() => void load()} />
              <p className={ui.muted} style={{ textAlign: 'center', fontSize: 13 }}>
                If your session expired, <Link to="/login">sign in again</Link>.
              </p>
            </div>
          )}
          {me && <Outlet />}
        </div>
      </div>

      <Toaster />
    </div>
  );
}

export default EmployerLayout;
