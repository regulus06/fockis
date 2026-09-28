import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlatformUser } from '../types/admin.types';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { hasPermission } from '../permissions/permissionHelpers';
import { PERMISSIONS, type PermissionValue } from '../permissions/permission.constants';
import { BlockAccountModal } from './BlockAccountModal';
import { DeactivateAccountModal } from './DeactivateAccountModal';
import { SuspendAccountModal } from './SuspendAccountModal';
import { RestoreAccountModal } from './RestoreAccountModal';
import { ForceLogoutModal } from './ForceLogoutModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { PermanentDeleteModal } from './PermanentDeleteModal';
import { adminApi } from '../api/adminApi';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

type ModalKind = 'block' | 'deactivate' | 'suspend' | 'restore' | 'forceLogout' | 'delete' | 'permanentDelete' | null;

export function UserActionsMenu({
  user,
  onUpdated,
}: {
  user: PlatformUser;
  onUpdated: (u: PlatformUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const permissions = useAdminSessionStore((s) => s.permissions);
  const pushToast = useAdminNotificationStore((s) => s.pushToast);
  const has = (p: PermissionValue) => hasPermission(permissions, p);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleRecovery() {
    try {
      await adminApi.sendPasswordReset(user.id, 'Requested from user actions menu');
      pushToast('success', `Password reset instructions sent for ${user.name}.`);
    } catch {
      pushToast('error', 'Unable to send password reset.');
    }
    setOpen(false);
  }

  const isDeleted = user.status === 'PERMANENTLY_DELETED';

  return (
    <div className="fk-menu-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="fk-icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Actions">
        ⋯
      </button>
      {open && (
        <div className="fk-menu">
          <button className="fk-menu__item" onClick={() => { setOpen(false); navigate(`/admin/users/${user.id}`); }}>
            View Account
          </button>
          {has(PERMISSIONS.USERS_EDIT) && !isDeleted && (
            <button className="fk-menu__item" onClick={() => { setOpen(false); navigate(`/admin/users/${user.id}/edit`); }}>
              Edit
            </button>
          )}
          <div className="fk-menu__divider" />
          {has(PERMISSIONS.USERS_ACTIVATE) && user.status !== 'ACTIVE' && !isDeleted && (
            <button className="fk-menu__item" onClick={async () => {
              setOpen(false);
              try {
                const updated = await adminApi.activateUser(user.id, 'Reactivated from actions menu');
                pushToast('success', `${user.name} activated.`);
                onUpdated(updated);
              } catch { pushToast('error', 'Unable to activate.'); }
            }}>
              Activate
            </button>
          )}
          {has(PERMISSIONS.USERS_DEACTIVATE) && user.status !== 'DEACTIVATED' && !isDeleted && (
            <button className="fk-menu__item" onClick={() => { setOpen(false); setModal('deactivate'); }}>
              Deactivate
            </button>
          )}
          {has(PERMISSIONS.USERS_SUSPEND) && user.status !== 'SUSPENDED' && !isDeleted && (
            <button className="fk-menu__item" onClick={() => { setOpen(false); setModal('suspend'); }}>
              Suspend
            </button>
          )}
          {has(PERMISSIONS.USERS_BLOCK) && user.status !== 'BLOCKED' && !isDeleted && (
            <button className="fk-menu__item fk-menu__item--danger" onClick={() => { setOpen(false); setModal('block'); }}>
              Block
            </button>
          )}
          {has(PERMISSIONS.USERS_RESTORE) &&
            ['BLOCKED', 'SUSPENDED', 'DEACTIVATED'].includes(user.status) && (
              <button className="fk-menu__item" onClick={() => { setOpen(false); setModal('restore'); }}>
                Restore
              </button>
          )}
          {has(PERMISSIONS.USERS_FORCE_LOGOUT) && !isDeleted && (
            <button className="fk-menu__item" onClick={() => { setOpen(false); setModal('forceLogout'); }}>
              Force Logout
            </button>
          )}
          {has(PERMISSIONS.USERS_RECOVERY) && !isDeleted && (
            <button className="fk-menu__item" onClick={handleRecovery}>
              Password Recovery
            </button>
          )}
          <div className="fk-menu__divider" />
          {has(PERMISSIONS.AUDIT_VIEW) && (
            <button className="fk-menu__item" onClick={() => { setOpen(false); navigate(`/admin/users/${user.id}#history`); }}>
              View Audit History
            </button>
          )}
          {has(PERMISSIONS.USERS_DELETE_REQUEST) && user.status !== 'PENDING_DELETION' && !isDeleted && (
            <button className="fk-menu__item fk-menu__item--danger" onClick={() => { setOpen(false); setModal('delete'); }}>
              Request Permanent Deletion
            </button>
          )}
          {has(PERMISSIONS.USERS_DELETE_PERMANENT) && user.status === 'PENDING_DELETION' && (
            <button className="fk-menu__item fk-menu__item--danger" onClick={() => { setOpen(false); setModal('permanentDelete'); }}>
              Permanently Delete
            </button>
          )}
        </div>
      )}

      {modal === 'block' && <BlockAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'deactivate' && <DeactivateAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'suspend' && <SuspendAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'restore' && <RestoreAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'forceLogout' && <ForceLogoutModal user={user} onClose={() => setModal(null)} onSuccess={() => {}} />}
      {modal === 'delete' && <DeleteAccountModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
      {modal === 'permanentDelete' && <PermanentDeleteModal user={user} onClose={() => setModal(null)} onSuccess={onUpdated} />}
    </div>
  );
}
