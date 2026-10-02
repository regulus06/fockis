import type { ReactNode } from 'react';

export interface CategoryTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface CategoryTabsProps {
  categories: CategoryTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  bordered?: boolean;
  className?: string;
}

/**
 * Horizontally scrollable set of category tabs, used by the hero search
 * panel, the search results page, the experiences page filter row, etc.
 */
export default function CategoryTabs({
  categories,
  activeId,
  onChange,
  bordered = false,
  className = '',
}: CategoryTabsProps) {
  return (
    <div
      className={`category-tabs${bordered ? ' category-tabs--bordered' : ''} ${className}`.trim()}
      role="tablist"
      aria-label="Categories"
    >
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`category-tab${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(cat.id)}
          >
            {cat.icon}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
