import { useEffect, useRef, useState } from 'react';
import type { PlatformUser } from '../types/admin.types';
import { AdminStatusBadge } from './AdminStatusBadge';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { hasPermission } from '../permissions/permissionHelpers';
import { PERMISSIONS, type PermissionValue } from '../permissions/permission.constants';
import { BlockAccountModal } from './BlockAccountModal';
import { DeactivateAccountModal } from './DeactivateAccountModal';
import { SuspendAccountModal } from './SuspendAccountModal';
import { RestoreAccountModal } from './RestoreAccountModal';
import { adminApi } from '../api/adminApi';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

type ModalKind = 'block' | 'deactivate' | 'suspend' | 'restore' | null;

export function AccountStatusControl({
  user,
  onUpdated,
}: {
  user: PlatformUser;
  onUpdated: (u: PlatformUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const ref = useRef<HTMLDivElement>(null);
  const permissions = useAdminSessionStore((s) => s.permissions);
  const pushToast = useAdminNotificationStore((s) => s.pushToast);
  const has = (p: PermissionValue) => hasPermission(permissions, p);
  const isDeleted = user.status === 'PERMANENTLY_DELETED';

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const options: { label: string; onClick: () => void; visible: boolean }[] = [
    { label: 'Activate', visible: has(PERMISSIONS.USERS_ACTIVATE) && user.status !== 'ACTIVE', onClick: async () => {
      setOpen(false);
      try {
        const updated = await adminApi.activateUser(user.id, 'Reactivated from status control');
        pushToast('success', 'Account activated.');
        onUpdated(updated);
      } catch { pushToast('error', 'Unable to activate.'); }
    } },
    { label: 'Deactivate', visible: has(PERMISSIONS.USERS_DEACTIVATE) && user.status !== 'DEACTIVATED', onClick: () => { setOpen(false); setModal('deactivate'); } },
    { label: 'Suspend', visible: has(PERMISSIONS.USERS_SUSPEND) && user.status !== 'SUSPENDED', onClick: () => { setOpen(false); setModal('suspend'); } },
    { label: 'Block', visible: has(PERMISSIONS.USERS_BLOCK) && user.status !== 'BLOCKED', onClick: () => { setOpen(false); setModal('block'); } },
    { label: 'Restore', visible: has(PERMISSIONS.USERS_RESTORE) && ['BLOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(user.status), onClick: () => { setOpen(false); setModal('restore'); } },
  ].filter((o) => o.visible);

  return (
    <div className="fk-card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--fk-text-tertiary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Account Status
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <AdminStatusBadge status={user.status} />
        {!isDeleted && options.length > 0 && (
          <div className="fk-menu-wrap" ref={ref}>
            <button className="fk-btn fk-btn--sm" onClick={() => setOpen((o) => !o)}>
              Change Status ▾
            </button>
            {open && (
              <div className="fk-menu">
                {options.map((o) => (
                  <button key={o.label} className="fk-menu__item" onClick={o.onClick}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {user.status === 'BLOCKED' && user.blockCaseId && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--fk-text-secondary)', lineHeight: 1.6 }}>
          Case: <span className="mono">{user.blockCaseId}</span><br />
          Reason: {user.blockReason?.replace(/_/g, ' ')}<br />
          Blocked by: {user.blockedBy}
        </div>
      )}
      {user.status === 'SUSPENDED' && user.suspensionEnd && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--fk-text-secondary)' }}>
          Suspension ends: {new Date(user.suspensionEnd).toLocaleDateString()}
        </div>
      )}

      {modal === 'block' && <BlockAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'deactivate' && <DeactivateAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'suspend' && <SuspendAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'restore' && <RestoreAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
    </div>
  );
}
