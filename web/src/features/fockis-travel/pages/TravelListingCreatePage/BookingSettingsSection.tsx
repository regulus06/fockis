import { Dispatch, SetStateAction } from 'react';
import { Clock3 } from 'lucide-react';

import { FormCard } from './FormCard';
import { ToggleSwitch } from './ToggleSwitch';
import type { ListingForm } from './types';

interface BookingSettingsSectionProps {
  form: ListingForm;
  setForm: Dispatch<SetStateAction<ListingForm>>;
}

export function BookingSettingsSection({ form, setForm }: BookingSettingsSectionProps) {
  return (
    <FormCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <Clock3 size={19} />
        <h2 style={{ margin: 0 }}>Booking settings</h2>
      </div>

      <ToggleSwitch
        checked={form.instantBooking}
        onChange={() =>
          setForm((previous) => ({ ...previous, instantBooking: !previous.instantBooking }))
        }
        label="Instant booking"
        description="Allow eligible guests to book immediately without waiting for host approval."
      />
    </FormCard>
  );
}
