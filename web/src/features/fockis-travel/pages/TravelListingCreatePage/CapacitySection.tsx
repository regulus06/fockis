import { Dispatch, SetStateAction } from 'react';
import { Bath, BedDouble, Home, Users } from 'lucide-react';

import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface CapacitySectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
}

export function CapacitySection({ form, setForm }: CapacitySectionProps) {
  return (
    <FormCard>
      <h2 style={{ marginTop: 0 }}>Guests & sleeping arrangements</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <div className="ft-field">
          <label htmlFor="listing-capacity">
            <Users size={14} /> Guests
          </label>

          <input
            id="listing-capacity"
            type="number"
            min="0"
            value={form.capacity}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, capacity: event.target.value }))
            }
            placeholder="Guests"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-bedrooms">
            <Home size={14} /> Bedrooms
          </label>

          <input
            id="listing-bedrooms"
            type="number"
            min="0"
            value={form.bedrooms}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, bedrooms: event.target.value }))
            }
            placeholder="0"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-beds">
            <BedDouble size={14} /> Beds
          </label>

          <input
            id="listing-beds"
            type="number"
            min="0"
            value={form.beds}
            onChange={(event) => setForm((previous) => ({ ...previous, beds: event.target.value }))}
            placeholder="0"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-bathrooms">
            <Bath size={14} /> Bathrooms
          </label>

          <input
            id="listing-bathrooms"
            type="number"
            min="0"
            step="0.5"
            value={form.bathrooms}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, bathrooms: event.target.value }))
            }
            placeholder="0"
          />
        </div>
      </div>
    </FormCard>
  );
}
