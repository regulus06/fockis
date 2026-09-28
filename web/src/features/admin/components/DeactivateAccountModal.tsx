import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function DeactivateAccountModal({
  user,
  onClose,
  onSuccess,
}: {
  user: PlatformUser;
  onClose: () => void;
  onSuccess: (updated: PlatformUser) => void;
}) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [notify, setNotify] = useState(true);
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
      const updated = await adminApi.deactivateUser(user.id, { reason, notes, notifyUser: notify });
      pushToast('success', `${user.name}'s account has been deactivated.`);
      onSuccess(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      pushToast('error', 'Unable to deactivate this account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={`Deactivate ${user.name}`} onClose={onClose}>
      <p className="fk-modal__desc">
        This account will no longer be accessible to the user. The account will
        <strong> not</strong> be permanently deleted and remains in the administrative database.
      </p>
      <div className="fk-modal__field">
        <label>Reason</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this account being deactivated?" />
      </div>
      <div className="fk-modal__field">
        <label>Administrative notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <label className="fk-modal__checkbox">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Notify user
      </label>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Deactivating…' : 'Deactivate Account'}
        </button>
      </div>
    </AdminModal>
  );
}
