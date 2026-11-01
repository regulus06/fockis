import { useState } from 'react';
import { EmployerModal } from './EmployerModal';
import { getErrorMessage } from '../../hooks/useEmployerQuery';
import ui from '../../styles/EmployerShared.module.scss';

export interface ConfirmActionModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/** Confirmation dialog that keeps itself open (with the error) if the action fails. */
export function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onCancel();
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <EmployerModal
      open={open}
      title={title}
      onClose={close}
      busy={busy}
      footer={
        <>
          <button type="button" className={ui.btnSecondary} onClick={close} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? ui.btnDanger : ui.btnPrimary}
            onClick={confirm}
            disabled={busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className={ui.prose} style={{ margin: 0 }}>{description}</p>
      {error && (
        <p className={ui.fieldError} role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </EmployerModal>
  );
}

export default ConfirmActionModal;
