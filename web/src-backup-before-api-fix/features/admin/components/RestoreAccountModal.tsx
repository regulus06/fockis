import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function RestoreAccountModal({
  user,
  onClose,
  onSuccess,
}: {
  user: PlatformUser;
  onClose: () => void;
  onSuccess: (updated: PlatformUser) => void;
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
      const updated = await adminApi.restoreUser(user.id, reason);
      pushToast('success', `${user.name}'s account has been restored to active.`);
      onSuccess(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      pushToast('error', 'Unable to restore this account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={`Restore ${user.name}`} onClose={onClose}>
      <p className="fk-modal__desc">
        This will return the account to <strong>ACTIVE</strong> status ({user.status} → ACTIVE)
        and restore full access to Fockis services.
      </p>
      <div className="fk-modal__field">
        <label>Reason</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this account being restored?" />
      </div>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Restoring…' : 'Restore Account'}
        </button>
      </div>
    </AdminModal>
  );
}
