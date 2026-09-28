import { useState } from 'react';
import { AdminModal } from './AdminConfirmModal';
import { adminApi } from '../api/adminApi';
import type { PlatformUser } from '../types/admin.types';
import { useAdminNotificationStore } from '../store/adminNotificationStore';

const REASONS = [
  'POLICY_VIOLATION', 'FRAUD', 'SPAM', 'ABUSIVE_BEHAVIOR',
  'MARKETPLACE_VIOLATION', 'PAYMENT_ABUSE', 'SECURITY_CONCERN', 'LEGAL_REQUEST', 'OTHER',
];

export function BlockAccountModal({
  user,
  onClose,
  onSuccess,
}: {
  user: PlatformUser;
  onClose: () => void;
  onSuccess: (updated: PlatformUser) => void;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pushToast = useAdminNotificationStore((s) => s.pushToast);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.blockUser(user.id, { reason, details, notifyUser: notify });
      pushToast('success', `${user.name} has been blocked.`);
      onSuccess(updated);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg === 'FORBIDDEN' || msg.startsWith('FORBIDDEN') ? 'You do not have permission to block accounts.' : msg);
      pushToast('error', 'Unable to block this account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal title={`Block ${user.name}`} onClose={onClose} danger>
      <p className="fk-modal__desc">
        This account will be immediately restricted from accessing Fockis. The user will
        see a restriction notice rather than a generic error. This action can be reversed
        by restoring the account.
      </p>
      <div className="fk-modal__field">
        <label>Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      <div className="fk-modal__field">
        <label>Details</label>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Case notes for the audit trail…" />
      </div>
      <label className="fk-modal__checkbox">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        Notify user
      </label>
      {error && <p className="fk-modal__error">{error}</p>}
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="fk-btn fk-btn--danger" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Blocking…' : 'Block Account'}
        </button>
      </div>
    </AdminModal>
  );
}
