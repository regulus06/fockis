import { Dispatch, SetStateAction } from 'react';
import { ShieldCheck } from 'lucide-react';

import { CANCELLATION_POLICIES } from './constants';
import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface CancellationSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
}

export function CancellationSection({ form, setForm }: CancellationSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <ShieldCheck size={19} />
        <h2 style={{ margin: 0 }}>Cancellation policy</h2>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {CANCELLATION_POLICIES.map((policy) => {
          const selected = form.cancellationPolicy === policy.value;

          return (
            <button
              key={policy.value}
              type="button"
              onClick={() =>
                setForm((previous) => ({ ...previous, cancellationPolicy: policy.value }))
              }
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 12,
                border: selected
                  ? '2px solid var(--amber, #E8A33D)'
                  : '1px solid rgba(15,27,43,0.12)',
                background: selected ? 'rgba(232,163,61,0.08)' : '#fff',
                cursor: 'pointer',
              }}
            >
              <strong>{policy.label}</strong>

              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--slate, #5B6B76)' }}>
                {policy.description}
              </div>
            </button>
          );
        })}
      </div>
    </FormCard>
  );
}
