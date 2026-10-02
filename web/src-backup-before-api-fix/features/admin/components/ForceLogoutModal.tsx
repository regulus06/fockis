import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function ForceLogoutModal({
  user,
  onClose,
  onSuccess,
}: {
  user: PlatformUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pushToast = useAdminNotificationStore((s) => s.pushToast);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminApi.forceLogoutUser(user.id, reason);
      pushToast('success', `All sessions for ${user.name} have been revoked.`);
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      pushToast('error', 'Unable to force logout this user.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title="Force this user to log out?" onClose={onClose}>
      <p className="fk-modal__desc">
        This revokes every active session for <strong>{user.name}</strong> across all devices.
        They will need to sign in again.
      </p>
      <div className="fk-modal__field">
        <label>Reason</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Revoking…' : 'Force Logout'}
        </button>
      </div>
    </AdminModal>
  );
}
