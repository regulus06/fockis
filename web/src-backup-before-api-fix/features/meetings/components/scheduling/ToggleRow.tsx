import '../../styles/components/scheduling.scss';

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="fm-toggle-row">
      <div>
        <div className="fm-toggle-row__label">{label}</div>
        {description && <div className="fm-toggle-row__desc">{description}</div>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`fm-switch ${checked ? 'fm-switch--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="fm-switch__thumb" />
      </button>
    </div>
  );
}
