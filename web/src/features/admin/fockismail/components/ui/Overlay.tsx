import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { cx } from "../../utils/format";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Shared focus management + Escape handling for modal surfaces. */
function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>("[data-autofocus]") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab" && node) {
        const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (!items.length) return;
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  return ref;
}

/** Portals into <body> with the theme class so tokens still apply. */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(<div className="fm-theme fm-portal">{children}</div>, document.body);
}

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, title, description, onClose, children, footer, size = "md" }: ModalProps) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fm-scrim" onMouseDown={onClose} />
      <div className="fm-modal-wrap">
        <div ref={ref} className={cx("fm-modal", `fm-modal--${size}`)} role="dialog" aria-modal="true" aria-labelledby="fm-modal-title">
          <header className="fm-modal__head">
            <div>
              <h2 id="fm-modal-title">{title}</h2>
              {description && <p>{description}</p>}
            </div>
            <button type="button" className="fm-iconbtn" onClick={onClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </header>
          <div className="fm-modal__body">{children}</div>
          {footer && <footer className="fm-modal__foot">{footer}</footer>}
        </div>
      </div>
    </Portal>
  );
}

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  width?: number;
}

export function Drawer({ open, title, onClose, children, footer, side = "right", width = 480 }: DrawerProps) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <Portal>
      <div className="fm-scrim" onMouseDown={onClose} />
      <div
        ref={ref}
        className={cx("fm-drawer", `fm-drawer--${side}`)}
        style={{ width: `min(${width}px, 100vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="fm-drawer__head">
          <h2>{title}</h2>
          <button type="button" className="fm-iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </header>
        <div className="fm-drawer__body">{children}</div>
        {footer && <footer className="fm-drawer__foot">{footer}</footer>}
      </div>
    </Portal>
  );
}
