import { Dispatch, SetStateAction } from 'react';

import { CATEGORIES } from './constants';
import { FormCard } from './FormCard';
import type { ListingForm } from './types';

interface BasicInfoSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
  isVacationRental: boolean;
  onCategoryChange: (category: string) => void;
}

export function BasicInfoSection({
  form,
  setForm,
  isVacationRental,
  onCategoryChange,
}: BasicInfoSectionProps) {
  return (
    <FormCard>
      <h2 style={{ marginTop: 0, marginBottom: 5 }}>Basic information</h2>

      <p style={{ marginTop: 0, color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
        Tell travelers what you are offering.
      </p>

      <div className="ft-field">
        <label htmlFor="listing-title">Listing name *</label>

        <input
          id="listing-title"
          required
          value={form.title}
          onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
          placeholder={
            isVacationRental
              ? 'Example: Beautiful Beachfront Villa'
              : form.category === 'Hotels & Stays'
                ? 'Example: Paradise Beach Resort'
                : 'Example: Sunset Experience'
          }
        />
      </div>

      <div className="ft-field">
        <label htmlFor="listing-category">Travel category *</label>

        <select
          id="listing-category"
          required
          value={form.category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          {CATEGORIES.map((category) => (
            <option key={category.label} value={category.label}>
              {category.icon} {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ft-field">
        <label htmlFor="listing-description">Description *</label>

        <textarea
          id="listing-description"
          required
          rows={7}
          value={form.description}
          onChange={(event) =>
            setForm((previous) => ({ ...previous, description: event.target.value }))
          }
          placeholder={
            isVacationRental
              ? 'Describe the home, neighborhood, amenities, sleeping arrangements, and what makes the property special.'
              : 'Describe your listing, what travelers can expect, what is included, and what makes it special.'
          }
        />
      </div>
    </FormCard>
  );
}
