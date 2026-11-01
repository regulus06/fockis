import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import styles from '../../styles/EmployerJobForm.module.scss';

export interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  max?: number;
  'aria-describedby'?: string;
}

/** Type and press Enter or comma to add. Backspace removes the last tag. */
export function TagInput({ id, value, onChange, placeholder, max = 30, ...aria }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const items = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (!items.length) return;
    const next = [...value];
    for (const item of items) {
      if (next.length >= max) break;
      if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item.slice(0, 80));
    }
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={styles.tagInput} onClick={(event) => (event.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}>
      {value.map((tag) => (
        <span key={tag} className={styles.tagChip}>
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((item) => item !== tag))}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        placeholder={value.length >= max ? '' : placeholder}
        disabled={value.length >= max}
        aria-describedby={aria['aria-describedby']}
      />
    </div>
  );
}

export default TagInput;
