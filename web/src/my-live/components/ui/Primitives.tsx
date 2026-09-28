import type { ButtonHTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import type { AvatarTone } from "../../types";

export function Avatar({ name, tone = "blue", size = "sm" }: { name: string; tone?: AvatarTone; size?: "xs" | "sm" | "md" | "lg" }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className={`avatar avatar--${size} avatar--${tone}`} aria-hidden="true">
      {initial}
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "live";
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

export function ControlButton({
  icon,
  label,
  active,
  disabled,
  danger,
  tooltip,
  badge,
  onClick
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  tooltip?: string;
  badge?: string | number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`control ${active ? "control--active" : ""} ${danger ? "control--danger" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={tooltip ?? label}
      aria-pressed={active}
    >
      <span className="control__icon-wrap">
        {icon}
        {badge !== undefined && <span className="control__badge">{badge}</span>}
      </span>
      <span className="control__label">{label}</span>
    </button>
  );
}

export function Drawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="drawer">{children}</div>
    </>
  );
}

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
