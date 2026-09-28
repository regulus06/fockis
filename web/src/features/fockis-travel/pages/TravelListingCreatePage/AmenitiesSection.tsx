import { Sparkles } from 'lucide-react';

import { COMMON_AMENITIES } from './constants';
import { FormCard } from './FormCard';
import { SelectablePill } from './SelectablePill';

interface AmenitiesSectionProps {
  amenities: string[];
  onToggle: (amenity: string) => void;
}

export function AmenitiesSection({ amenities, onToggle }: AmenitiesSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
        <Sparkles size={19} />
        <h2 style={{ margin: 0 }}>Amenities & features</h2>
      </div>

      <p style={{ color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
        Select everything guests can use.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
        {COMMON_AMENITIES.map((amenity) => (
          <SelectablePill
            key={amenity}
            label={amenity}
            selected={amenities.includes(amenity)}
            onClick={() => onToggle(amenity)}
          />
        ))}
      </div>
    </FormCard>
  );
}
