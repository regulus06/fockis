import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import '../../styles/components/common.scss';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`fm-btn fm-btn--${variant} fm-btn--${size} ${fullWidth ? 'fm-btn--full' : ''} ${className}`}
      {...rest}
    >
      {icon && <span className="fm-btn__icon">{icon}</span>}
      {children}
    </button>
  );
}
