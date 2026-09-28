import { Dispatch, SetStateAction } from 'react';
import { CalendarDays } from 'lucide-react';

import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface StayRequirementsSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
}

export function StayRequirementsSection({ form, setForm }: StayRequirementsSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 15 }}>
        <CalendarDays size={19} />
        <h2 style={{ margin: 0 }}>Stay requirements</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div className="ft-field">
          <label htmlFor="minimum-stay">Minimum nights</label>

          <input
            id="minimum-stay"
            type="number"
            min="1"
            value={form.minimumStay}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, minimumStay: event.target.value }))
            }
          />
        </div>

        <div className="ft-field">
          <label htmlFor="maximum-stay">Maximum nights</label>

          <input
            id="maximum-stay"
            type="number"
            min="1"
            value={form.maximumStay}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, maximumStay: event.target.value }))
            }
            placeholder="No limit"
          />
        </div>
      </div>
    </FormCard>
  );
}
