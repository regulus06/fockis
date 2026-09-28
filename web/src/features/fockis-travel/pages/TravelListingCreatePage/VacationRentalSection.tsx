import { Dispatch, SetStateAction } from 'react';
import { Home } from 'lucide-react';

import { PROPERTY_TYPES } from './constants';
import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface VacationRentalSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
}

export function VacationRentalSection({ form, setForm }: VacationRentalSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
        <Home size={19} />
        <h2 style={{ margin: 0 }}>Vacation rental details</h2>
      </div>

      <p style={{ color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
        Tell guests exactly what kind of place they are booking.
      </p>

      <div className="ft-field">
        <label htmlFor="property-type">Property type *</label>

        <select
          id="property-type"
          required
          value={form.propertyType}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, propertyType: event.target.value }))
          }
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="ft-field">
        <label htmlFor="rental-type">Guest access</label>

        <select
          id="rental-type"
          value={form.rentalType}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, rentalType: event.target.value }))
          }
        >
          <option value="Entire place">Entire place</option>
          <option value="Private room">Private room</option>
          <option value="Shared room">Shared room</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div className="ft-field">
          <label htmlFor="check-in">Check-in time</label>

          <input
            id="check-in"
            type="time"
            value={form.checkInTime}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, checkInTime: event.target.value }))
            }
          />
        </div>

        <div className="ft-field">
          <label htmlFor="check-out">Check-out time</label>

          <input
            id="check-out"
            type="time"
            value={form.checkOutTime}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, checkOutTime: event.target.value }))
            }
          />
        </div>
      </div>
    </FormCard>
  );
}
