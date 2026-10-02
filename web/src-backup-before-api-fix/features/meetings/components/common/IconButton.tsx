import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from './Tooltip';
import '../../styles/components/common.scss';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  variant?: 'light' | 'dark';
  showLabelBelow?: boolean;
}

export function IconButton({
  icon,
  label,
  active,
  danger,
  variant = 'dark',
  showLabelBelow,
  className = '',
  disabled,
  ...rest
}: IconButtonProps) {
  const content = (
    <button
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      className={[
        'fm-icon-btn',
        `fm-icon-btn--${variant}`,
        active ? 'fm-icon-btn--active' : '',
        danger ? 'fm-icon-btn--danger' : '',
        disabled ? 'fm-icon-btn--disabled' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {icon}
      {showLabelBelow && <span className="fm-icon-btn__label">{label}</span>}
    </button>
  );

  return showLabelBelow ? content : <Tooltip label={label}>{content}</Tooltip>;
}
