import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

export function DeleteAccountModal({
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
      const updated = await adminApi.requestUserDeletion(user.id, { reason, notes });
      pushToast('success', 'Submitted for permanent deletion review.');
      onSuccess(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      pushToast('error', 'Unable to submit this deletion request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={`Request deletion for ${user.name}`} onClose={onClose}>
      <div className="fk-modal__warning">
        This account will be submitted for permanent deletion review. A SUPER_ADMIN must
        approve permanent deletion before any data is removed.
      </div>
      <div className="fk-modal__field">
        <label>Reason</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="fk-modal__field">
        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Submitting…' : 'Submit for Review'}
        </button>
      </div>
    </AdminModal>
  );
}
