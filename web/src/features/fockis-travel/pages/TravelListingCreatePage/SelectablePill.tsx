import { Check } from 'lucide-react';

interface SelectablePillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * The selectable checkbox-style pill used for amenities and house rules.
 */
export function SelectablePill({ label, selected, onClick }: SelectablePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '11px 13px',
        borderRadius: 10,
        border: selected ? '2px solid var(--amber, #E8A33D)' : '1px solid rgba(15,27,43,0.12)',
        background: selected ? 'rgba(232,163,61,0.08)' : '#fff',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 5,
          display: 'grid',
          placeItems: 'center',
          background: selected ? 'var(--amber, #E8A33D)' : 'rgba(15,27,43,0.06)',
          flexShrink: 0,
        }}
      >
        {selected && <Check size={13} color="#fff" />}
      </span>

      {label}
    </button>
  );
}
