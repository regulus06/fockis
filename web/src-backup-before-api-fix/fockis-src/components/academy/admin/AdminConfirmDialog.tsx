interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AdminConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }: Props) {
  return (
    <div className={`admin-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      {open && (
        <div className="admin-modal" style={{ maxWidth: 420 }}>
          <h2>{title}</h2>
          <p className="admin-modal-sub">{message}</p>
          <div className="admin-modal-actions">
            <button className="btn btn-outline btn-sm" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button className={`btn btn-sm ${danger ? 'btn-navy' : 'btn-gold'}`} style={danger ? { background: 'var(--error)', color: '#fff' } : undefined} onClick={onConfirm} disabled={busy}>
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
