import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AdminLoadingState, AdminErrorState } from '../components/AdminStates';
import { AccountStatusControl } from '../components/AccountStatusControl';
import { UserAdminHistory } from '../components/UserAdminHistory';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { hasPermission } from '../permissions/permissionHelpers';
import { PERMISSIONS } from '../permissions/permission.constants';
import { adminApi as api } from '../api/adminApi';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const navigate = useNavigate();
  const permissions = useAdminSessionStore((s) => s.permissions);
  const pushToast = useAdminNotificationStore((s) => s.pushToast);
  const canViewSensitive = hasPermission(permissions, PERMISSIONS.USERS_VIEW_SENSITIVE);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setUser(null);
    setError(null);
    adminApi.getUser(id)
      .then((u) => !cancelled && setUser(u))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load user'));
    return () => { cancelled = true; };
  }, [id]);

  if (error) return <AdminErrorState message={error} onRetry={() => navigate(0)} />;
  if (!user) return <AdminLoadingState label="Loading account…" />;

  async function handleViewSensitive() {
    try {
      await api.viewSensitiveData(user!.id, 'contact information', 'Reviewing account details');
      pushToast('info', 'Sensitive data view logged to the audit trail.');
    } catch {
      pushToast('error', 'You do not have permission to view sensitive data.');
    }
  }

  return (
    <div>
      <AdminPageHeader
        title={user.name}
        description={`@${user.username} · ${user.id}`}
        actions={
          <button className="fk-btn" onClick={() => navigate('/admin/users')}>
            ← Back to Users
          </button>
        }
      />

      <div className="fk-tabs">
        <button className={`fk-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`fk-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>Admin History</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20 }}>
        <div>
          {tab === 'overview' && (
            <div className="fk-card">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13 }}>
                <Field label="Email" value={user.email} />
                <Field label="Role" value={user.role} />
                <Field label="Verified" value={user.verified ? 'Yes' : 'No'} />
                <Field label="Created" value={new Date(user.createdAt).toLocaleString()} />
                <Field label="Last Login" value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '—'} />
                <Field label="Flags" value={user.flags.length ? user.flags.join(', ') : 'None'} />
              </div>

              {canViewSensitive ? (
                <button className="fk-btn fk-btn--sm" style={{ marginTop: 16 }} onClick={handleViewSensitive}>
                  View Sensitive Information
                </button>
              ) : (
                <p style={{ marginTop: 16, fontSize: 12.5, color: 'var(--fk-text-tertiary)' }}>
                  Your role does not include access to sensitive account information.
                </p>
              )}
            </div>
          )}
          {tab === 'history' && <UserAdminHistory userId={user.id} />}
        </div>

        <div>
          <AccountStatusControl user={user} onUpdated={setUser} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--fk-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ marginTop: 3 }}>{value}</div>
    </div>
  );
}
