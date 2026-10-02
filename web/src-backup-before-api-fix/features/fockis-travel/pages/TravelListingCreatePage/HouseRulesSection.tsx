import { HOUSE_RULES } from './constants';
import { FormCard } from './FormCard';
import { SelectablePill } from './SelectablePill';

interface HouseRulesSectionProps {
  houseRules: string[];
  onToggle: (rule: string) => void;
}

export function HouseRulesSection({ houseRules, onToggle }: HouseRulesSectionProps) {
  return (
    <FormCard>
      <h2 style={{ marginTop: 0 }}>House rules</h2>

      <p style={{ color: 'var(--slate, #5B6B76)', fontSize: 14 }}>
        Let guests know what is expected during their stay.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
        {HOUSE_RULES.map((rule) => (
          <SelectablePill
            key={rule}
            label={rule}
            selected={houseRules.includes(rule)}
            onClick={() => onToggle(rule)}
          />
        ))}
      </div>
    </FormCard>
  );
}
