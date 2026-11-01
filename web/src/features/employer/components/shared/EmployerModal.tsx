import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';

export interface EmployerModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Prevent closing while a request is running. */
  busy?: boolean;
}

export function EmployerModal({ open, title, description, onClose, children, footer, wide, busy }: EmployerModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const focusable = node?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])');
    (focusable ?? node)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
      if (event.key === 'Tab' && node) {
        const items = [...node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKey);
      previousFocus.current?.focus?.();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className={ui.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={wide ? ui.modalWide : ui.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={ui.modalHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className={ui.iconBtn} onClick={onClose} disabled={busy} aria-label="Close" data-close>
            <X size={18} />
          </button>
        </div>
        <div className={ui.modalBody}>{children}</div>
        {footer && <div className={ui.modalFooter}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export default EmployerModal;
