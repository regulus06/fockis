interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
}

/**
 * The pill on/off switch used by "Allow reservations" and
 * "Instant booking".
 */
export function ToggleSwitch({ checked, onChange, label, description }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        width: '100%',
        border: 0,
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked ? 'var(--amber, #E8A33D)' : '#d7dde2',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 2,
            left: checked ? 22 : 2,
          }}
        />
      </span>

      <span>
        <strong>{label}</strong>

        <span
          style={{
            display: 'block',
            marginTop: 4,
            fontSize: 13,
            color: 'var(--slate, #5B6B76)',
            lineHeight: 1.5,
          }}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
