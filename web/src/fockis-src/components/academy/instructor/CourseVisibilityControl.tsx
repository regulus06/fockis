import { useEffect, useRef, useState } from 'react';
import LearnIcon from '../learn/LearnIcon';
import type { Visibility } from '../../../lib/academyLearnApi';

export const VISIBILITY_OPTIONS: { v: Visibility; label: string; hint: string; icon: string; cls: string }[] = [
  { v: 'public', label: 'Visible (Public)', hint: 'Everyone can find and enroll.', icon: 'eye', cls: 'vis-public' },
  { v: 'hidden', label: 'Hidden', hint: 'Not shown in listings or search.', icon: 'eyeOff', cls: 'vis-hidden' },
  { v: 'private', label: 'Private', hint: 'Only invited students can access.', icon: 'lock', cls: 'vis-private' },
  { v: 'draft', label: 'Draft', hint: 'Only you can see and edit.', icon: 'draft', cls: 'vis-draft' },
];

const SHORT: Record<Visibility, string> = { public: 'Visible', hidden: 'Hidden', private: 'Private', draft: 'Draft' };

export default function CourseVisibilityControl({
  value,
  onChange,
  disabled,
}: {
  value: Visibility;
  onChange: (v: Visibility) => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = VISIBILITY_OPTIONS.find((o) => o.v === value)!;

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function pick(v: Visibility) {
    setOpen(false);
    if (v === value) return;
    setSaving(true);
    try {
      await onChange(v);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ins-vis" ref={ref}>
      <button
        type="button"
        className={`ins-vis-btn ${current.cls}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || saving}
        onClick={() => setOpen((o) => !o)}
      >
        <LearnIcon name={current.icon} size={16} /> {saving ? 'Saving…' : SHORT[value]} <LearnIcon name="chevronDown" size={14} />
      </button>
      {open && (
        <ul className="ins-vis-menu" role="listbox" aria-label="Visibility">
          {VISIBILITY_OPTIONS.map((o) => (
            <li key={o.v} role="option" aria-selected={o.v === value} onClick={() => pick(o.v)} className={o.cls}>
              <LearnIcon name={o.icon} size={18} />
              <div>
                <strong>{o.label}</strong>
                <small>{o.hint}</small>
              </div>
              {o.v === value && <LearnIcon name="check" size={18} className="ins-vis-check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
