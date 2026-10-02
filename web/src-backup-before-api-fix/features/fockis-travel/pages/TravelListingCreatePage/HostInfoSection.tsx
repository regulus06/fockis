import { Dispatch, SetStateAction } from 'react';

import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface HostInfoSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
  isVacationRental: boolean;
}

export function HostInfoSection({ form, setForm, isVacationRental }: HostInfoSectionProps) {
  return (
    <FormCard>
      <h2 style={{ marginTop: 0 }}>Host / contact information</h2>

      {isVacationRental && (
        <p style={{ color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
          This information helps guests understand who manages the property.
        </p>
      )}

      <div className="ft-field">
        <label htmlFor="host-name">Host name</label>

        <input
          id="host-name"
          value={form.hostName}
          onChange={(event) => setForm((previous) => ({ ...previous, hostName: event.target.value }))}
          placeholder="Your name or business name"
        />
      </div>

      {isVacationRental && (
        <div className="ft-field">
          <label htmlFor="host-description">About the host</label>

          <textarea
            id="host-description"
            rows={4}
            value={form.hostDescription}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, hostDescription: event.target.value }))
            }
            placeholder="Tell guests a little about yourself and why you enjoy hosting."
          />
        </div>
      )}

      <div className="ft-field">
        <label htmlFor="listing-phone">Phone</label>

        <input
          id="listing-phone"
          type="tel"
          value={form.phone}
          onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
          placeholder="+1..."
        />
      </div>

      <div className="ft-field">
        <label htmlFor="listing-website">Website</label>

        <input
          id="listing-website"
          type="url"
          value={form.website}
          onChange={(event) => setForm((previous) => ({ ...previous, website: event.target.value }))}
          placeholder="https://example.com"
        />
      </div>
    </FormCard>
  );
}
