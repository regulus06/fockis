import { useMemo, useState } from 'react';

export interface BuilderOption {
  key: string;
  label: string;
  fullName: string;
  price: number;
  defaultSelected?: boolean;
}

export interface BuilderCategory {
  id: string;
  title: string;
  icon: string;
  exclusive: boolean;
  options: BuilderOption[];
}

export interface PackageBuilderProps {
  categories: BuilderCategory[];
  onBuild?: (selection: { categoryId: string; optionKey: string; name: string; price: number }[]) => void;
}

/**
 * "Customize your reservation" package builder — lets a traveler combine
 * room, food, transportation, services and experiences into a single
 * priced package. Ported from the homepage's local-state implementation
 * into a reusable, prop-driven component.
 */
export default function PackageBuilder({ categories, onBuild }: PackageBuilderProps) {
  const initialSelection = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    categories.forEach((cat) => {
      map[cat.id] = new Set(cat.options.filter((o) => o.defaultSelected).map((o) => o.key));
    });
    return map;
  }, [categories]);

  const [selection, setSelection] = useState(initialSelection);

  function toggleOption(cat: BuilderCategory, optionKey: string) {
    setSelection((prev) => {
      const next = { ...prev };
      const current = new Set(prev[cat.id]);
      if (cat.exclusive) {
        current.clear();
        current.add(optionKey);
      } else if (current.has(optionKey)) {
        current.delete(optionKey);
      } else {
        current.add(optionKey);
      }
      next[cat.id] = current;
      return next;
    });
  }

  const summaryLines = categories.flatMap((cat) =>
    cat.options
      .filter((opt) => selection[cat.id]?.has(opt.key))
      .map((opt) => ({ key: `${cat.id}:${opt.key}`, categoryId: cat.id, optionKey: opt.key, name: opt.fullName, price: opt.price }))
  );
  const summaryTotal = summaryLines.reduce((sum, l) => sum + l.price, 0);

  return (
    <div className="builder-shell">
      <div className="builder-cats">
        {categories.map((cat) => (
          <div className="builder-cat" key={cat.id}>
            <div className="builder-cat-head">
              <h4><span className="ic" aria-hidden="true">{cat.icon}</span>{cat.title}</h4>
            </div>
            <div className="builder-options">
              {cat.options.map((opt) => {
                const selected = selection[cat.id]?.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={selected}
                    className={`chip-option${selected ? ' is-selected' : ''}`}
                    onClick={() => toggleOption(cat, opt.key)}
                  >
                    {opt.label}{' '}
                    <span className="add">{opt.price === 0 ? 'Included' : `+$${opt.price.toLocaleString()}`}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="summary-card">
        <h4>Your stay</h4>
        <span className="demo-tag">Demo pricing preview</span>
        <div>
          {summaryLines.map((line) => (
            <div className="summary-line" key={line.key}>
              <span className="n">{line.name}</span>
              <span className="p">{line.price === 0 ? 'Included' : `$${line.price.toLocaleString()}`}</span>
            </div>
          ))}
        </div>
        <div className="summary-total">
          <span className="lbl">Total</span>
          <span className="amt mono">${summaryTotal.toLocaleString()}</span>
        </div>
        <button
          type="button"
          className="btn btn-amber btn-block"
          style={{ marginTop: 20 }}
          onClick={() => onBuild?.(summaryLines)}
        >
          Build my package →
        </button>
      </div>
    </div>
  );
}
