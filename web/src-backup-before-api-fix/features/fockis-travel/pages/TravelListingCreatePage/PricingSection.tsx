import { Dispatch, SetStateAction } from 'react';
import { DollarSign } from 'lucide-react';

import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface PricingSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
  isVacationRental: boolean;
}

export function PricingSection({ form, setForm, isVacationRental }: PricingSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <DollarSign size={19} />
        <h2 style={{ margin: 0 }}>Pricing</h2>
      </div>

      {isVacationRental && (
        <p style={{ color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
          Set your nightly rate and optional guest fees.
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(180px, 0.6fr)',
          gap: 12,
        }}
      >
        <div className="ft-field">
          <label htmlFor="listing-price">Starting price</label>

          <input
            id="listing-price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => setForm((previous) => ({ ...previous, price: event.target.value }))}
            placeholder="0.00"
          />
        </div>

        <div className="ft-field">
          <label htmlFor="listing-price-unit">Price unit</label>

          <select
            id="listing-price-unit"
            value={form.priceUnit}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, priceUnit: event.target.value }))
            }
          >
            <option value="night">Per night</option>
            <option value="day">Per day</option>
            <option value="hour">Per hour</option>
            <option value="person">Per person</option>
            <option value="vehicle">Per vehicle</option>
            <option value="event">Per event</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {isVacationRental && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
            marginTop: 8,
          }}
        >
          <div className="ft-field">
            <label htmlFor="cleaning-fee">Cleaning fee</label>

            <input
              id="cleaning-fee"
              type="number"
              min="0"
              step="0.01"
              value={form.cleaningFee}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, cleaningFee: event.target.value }))
              }
              placeholder="0.00"
            />
          </div>

          <div className="ft-field">
            <label htmlFor="security-deposit">Security deposit</label>

            <input
              id="security-deposit"
              type="number"
              min="0"
              step="0.01"
              value={form.securityDeposit}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, securityDeposit: event.target.value }))
              }
              placeholder="0.00"
            />
          </div>
        </div>
      )}
    </FormCard>
  );
}
