import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import type { AvatarTone } from "../../types";

/* ============================================================================
   AVATAR
   Shows the real profile photo when one is available, otherwise an initial.
   ============================================================================ */

export function Avatar({
  name,
  tone = "blue",
  size = "sm",
  src,
}: {
  name: string;
  tone?: AvatarTone;
  size?: "xs" | "sm" | "md" | "lg";
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  if (src && !failed) {
    return (
      <img
        className={`avatar avatar--${size} avatar--photo`}
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`avatar avatar--${size} avatar--${tone}`} aria-hidden="true">
      {initial}
    </div>
  );
}

/* ============================================================================
   BUTTON
   ============================================================================ */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "live" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", size = "md", fullWidth, icon, children, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size} ${fullWidth ? "btn--full" : ""} ${className ?? ""}`}
      {...rest}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  );
}

/* ============================================================================
   TOGGLE SWITCH
   ============================================================================ */

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-row__label">{label}</span>
        {description && <span className="toggle-row__description">{description}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        type="button"
        className={`switch ${checked ? "switch--on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="switch__thumb" />
      </button>
    </label>
  );
}

/* ============================================================================
   EMPTY STATE
   ============================================================================ */

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
      {action}
    </div>
  );
}

/* ============================================================================
   CONTROL BUTTON (bottom toolbar)
   ============================================================================ */

export function ControlButton({
  icon,
  label,
  active,
  disabled,
  danger,
  tooltip,
  badge,
  onClick,
  expanded,
  className,
}: {
  className?: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  tooltip?: string;
  badge?: string | number;
  onClick?: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      className={`control ${active ? "control--active" : ""} ${danger ? "control--danger" : ""} ${className ?? ""}`}
      disabled={disabled}
      onClick={onClick}
      title={tooltip ?? label}
      aria-pressed={expanded === undefined ? active : undefined}
      aria-expanded={expanded}
    >
      <span className="control__icon-wrap">
        {icon}
        {badge !== undefined && <span className="control__badge">{badge}</span>}
      </span>
      <span className="control__label">{label}</span>
    </button>
  );
}

/* ============================================================================
   DIALOG FOCUS
   Moves focus into a dialog, traps Tab inside it, closes on Escape and
   returns focus to whatever opened it.
   ============================================================================ */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;

    if (node) {
      const preferred = node.querySelector<HTMLElement>("[data-autofocus]");
      const first = preferred ?? node.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? node).focus();
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !node) {
        return;
      }

      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));

      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [ref]);
}

/* ============================================================================
   DRAWER
   ============================================================================ */

export function Drawer({ children, onClose, label = "Studio panel" }: { children: ReactNode; onClose: () => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);

  return (
    <>
      <div className="backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="drawer"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {children}
      </div>
    </>
  );
}

/* ============================================================================
   CONFIRM DIALOG
   ============================================================================ */

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  error,
  icon,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useDialogFocus(ref, () => {
    if (!busy) onCancel();
  });

  return (
    <div className="modal-backdrop" onClick={() => !busy && onCancel()}>
      <div
        className="modal"
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {icon && (
          <div className={`modal__icon-badge modal__icon-badge--${tone === "danger" ? "end" : "live"}`}>
            {icon}
          </div>
        )}

        <h2 className="modal__title" id={titleId}>{title}</h2>
        <p className="modal__subtitle" id={descId}>{description}</p>

        {children}

        {error && (
          <p className="modal__error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={busy} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} fullWidth onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   MENU (popover)
   ============================================================================ */

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  hint?: string;
  danger?: boolean;
}

export function Menu({
  trigger,
  items,
  label,
  align = "end",
  placement = "below",
  triggerClassName = "icon-square",
  triggerTitle,
}: {
  trigger: ReactNode;
  items: MenuItem[];
  label: string;
  align?: "start" | "end";
  placement?: "below" | "above";
  triggerClassName?: string;
  triggerTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  /*
   * The list is position: fixed and placed from the trigger's rect, so it
   * is never clipped by scrolling containers (chat list, side panels).
   */
  const place = () => {
    const trigger = wrapRef.current?.querySelector("button");
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const openAbove =
      placement === "above" ||
      (placement === "below" && rect.bottom + 260 > viewportH && rect.top > 260);

    const next: CSSProperties = {};

    if (openAbove) {
      next.bottom = Math.max(gap, viewportH - rect.top + gap);
    } else {
      next.top = rect.bottom + gap;
    }

    if (align === "end") {
      next.right = Math.max(gap, viewportW - rect.right);
    } else {
      next.left = Math.max(gap, rect.left);
    }

    setPosition(next);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        wrapRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
        return;
      }

      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

      const buttons = Array.from(
        listRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? [],
      );

      if (!buttons.length) return;

      event.preventDefault();
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next =
        event.key === "ArrowDown"
          ? buttons[(index + 1) % buttons.length]
          : buttons[(index - 1 + buttons.length) % buttons.length];
      next.focus();
    };

    const handleViewportChange = () => setOpen(false);

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    listRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open]);

  return (
    <div className="menu" ref={wrapRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        title={triggerTitle ?? label}
        onClick={() => {
          if (!open) place();
          setOpen((value) => !value);
        }}
      >
        {trigger}
      </button>

      {open && (
        <div
          className="menu__list"
          style={position}
          role="menu"
          id={menuId}
          aria-label={label}
          ref={listRef}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`menu__item ${item.danger ? "menu__item--danger" : ""}`}
              disabled={item.disabled}
              title={item.hint}
              onClick={() => {
                setOpen(false);
                item.onSelect?.();
              }}
            >
              {item.icon && <span className="menu__icon">{item.icon}</span>}
              <span className="menu__text">
                <span>{item.label}</span>
                {item.hint && item.disabled && <span className="menu__hint">{item.hint}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   PANEL SHELL
   ============================================================================ */

export function PanelShell({
  title,
  subtitle,
  onClose,
  footer,
  children
}: {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="panel-shell">
      <div className="panel-shell__header">
        <div>
          <h3 className="panel-shell__title">{title}</h3>
          {subtitle && <p className="panel-shell__subtitle">{subtitle}</p>}
        </div>
        {onClose && (
          <button className="panel-shell__close" onClick={onClose} aria-label="Close panel" type="button">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="panel-shell__body">{children}</div>
      {footer && <div className="panel-shell__footer">{footer}</div>}
    </div>
  );
}
