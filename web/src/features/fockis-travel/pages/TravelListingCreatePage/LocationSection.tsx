import { Dispatch, SetStateAction } from 'react';
import { MapPin } from 'lucide-react';

import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface LocationSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
}

export function LocationSection({ form, setForm }: LocationSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 15 }}>
        <MapPin size={19} />
        <h2 style={{ margin: 0 }}>Location</h2>
      </div>

      <div className="ft-field">
        <label htmlFor="listing-address">Address</label>

        <input
          id="listing-address"
          value={form.address}
          onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))}
          placeholder="Street address"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div className="ft-field">
          <label htmlFor="listing-city">City</label>

          <input
            id="listing-city"
            value={form.city}
            onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))}
            placeholder="City"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-state">State / Province</label>

          <input
            id="listing-state"
            value={form.state}
            onChange={(event) => setForm((previous) => ({ ...previous, state: event.target.value }))}
            placeholder="State"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-postal-code">ZIP / Postal code</label>

          <input
            id="listing-postal-code"
            value={form.postalCode}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, postalCode: event.target.value }))
            }
            placeholder="ZIP code"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-country">Country</label>

          <input
            id="listing-country"
            value={form.country}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, country: event.target.value }))
            }
            placeholder="Country"
          />
        </div>
      </div>
    </FormCard>
  );
}
