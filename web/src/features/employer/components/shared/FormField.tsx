import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import ui from '../../styles/EmployerShared.module.scss';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
}

/** Wires label, hint and error to the control via id / aria attributes. */
export function FormField({ label, required, hint, error, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        'aria-required': required || undefined,
      })
    : children;

  return (
    <div className={`${ui.field} ${className ?? ''}`.trim()}>
      <label className={ui.label} htmlFor={id}>
        {label} {required && <span className={ui.required} aria-hidden="true">*</span>}
      </label>
      {control}
      {hint && !error && <span id={hintId} className={ui.hint}>{hint}</span>}
      {error && <span id={errorId} className={ui.fieldError}>{error}</span>}
    </div>
  );
}

export default FormField;
