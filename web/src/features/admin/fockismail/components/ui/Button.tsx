import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import { cx } from "../../utils/format";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("fm-btn", `fm-btn--${variant}`, `fm-btn--${size}`, !children && "fm-btn--icon", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="fm-spinner" aria-hidden /> : icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      {children && <span>{children}</span>}
      {iconRight && <Icon name={iconRight} size={15} />}
    </button>
  );
}

interface LinkButtonProps {
  to: string;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

export function LinkButton({ to, variant = "secondary", size = "md", icon, children, className }: LinkButtonProps) {
  return (
    <Link to={to} className={cx("fm-btn", `fm-btn--${variant}`, `fm-btn--${size}`, className)}>
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} />}
      <span>{children}</span>
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
}

export function IconButton({ icon, label, active, className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx("fm-iconbtn", active && "is-active", className)}
      aria-label={label}
      title={label}
      aria-pressed={active}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
