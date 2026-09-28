import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SuspendAccountModal({
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
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');
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
      const updated = await adminApi.suspendUser(user.id, {
        reason,
        notes,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        notifyUser: notify,
      });
      pushToast('success', `${user.name}'s account has been suspended.`);
      onSuccess(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      pushToast('error', 'Unable to suspend this account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={`Suspend ${user.name}`} onClose={onClose}>
      <p className="fk-modal__desc">
        This account will be temporarily restricted. It can be reactivated automatically
        at the expiration date, or manually restored at any time.
      </p>
      <div className="fk-modal__field">
        <label>Reason</label>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="fk-modal__field">
        <label>Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="fk-modal__field" style={{ flex: 1 }}>
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="fk-modal__field" style={{ flex: 1 }}>
          <label>Expiration (optional)</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <label className="fk-modal__checkbox">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Notify user
      </label>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--primary" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Suspending…' : 'Suspend Account'}
        </button>
      </div>
    </AdminModal>
  );
}
