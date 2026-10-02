import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function AdminModal({
  title,
  children,
  onClose,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  danger?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fk-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`fk-modal ${danger ? 'fk-modal--danger' : ''}`} role="dialog" aria-modal="true">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function AdminConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AdminModal title={title} onClose={onClose} danger={danger}>
      <p className="fk-modal__desc">{description}</p>
      <div className="fk-modal__actions">
        <button className="fk-btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className={`fk-btn ${danger ? 'fk-btn--danger' : 'fk-btn--primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}
