import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function PermanentDeleteModal({
  user,
  onClose,
  onSuccess,
}: {
  user: PlatformUser;
  onClose: () => void;
  onSuccess: (updated: PlatformUser) => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pushToast = useAdminNotificationStore((s) => s.pushToast);

  const canSubmit = confirmText === user.username && reason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.permanentlyDeleteUser(user.id, {
        usernameConfirmation: confirmText,
        reason,
      });
      pushToast('success', `${user.name} has been permanently deleted.`);
      onSuccess(updated);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(
        msg.startsWith('FORBIDDEN')
          ? 'Only a SUPER_ADMIN can permanently delete an account.'
          : msg === 'USERNAME_CONFIRMATION_MISMATCH'
          ? 'The username you typed does not match.'
          : msg,
      );
      pushToast('error', 'Unable to permanently delete this account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="Permanently delete this account?" onClose={onClose} danger>
      <div className="fk-modal__danger-notice">
        This action is <strong>irreversible</strong>. All account data will be permanently
        removed. This requires SUPER_ADMIN privileges and is fully audited.
      </div>
      <div className="fk-modal__field">
        <label>Account</label>
        <div style={{ fontSize: 13 }}>{user.name}</div>
      </div>
      <div className="fk-modal__field">
        <label>User ID</label>
        <div className="mono" style={{ fontSize: 12.5, color: 'var(--fk-text-secondary)' }}>{user.id}</div>
      </div>
      <div className="fk-modal__field">
        <label>Type the username to confirm: <span className="mono">{user.username}</span></label>
        <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </div>
      <div className="fk-modal__field">
        <label>Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--danger" onClick={handleSubmit} disabled={busy || !canSubmit}>
          {busy ? 'Deleting…' : 'Permanently Delete'}
        </button>
      </div>
    </AdminModal>
  );
}
