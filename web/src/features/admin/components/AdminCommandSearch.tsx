import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';

import { useAdminAccess } from '../permissions/adminAccess';
import { ADMIN_NAV } from './adminNavigation';

/* ============================================================================
   GLOBAL ADMIN SEARCH

   Searches the Admin Center's own pages (only the ones the signed-in
   administrator can open) and jumps straight to them. Ctrl/⌘ + K focuses it.

   The previous version read `useAdminStore().users`, a field that no longer
   exists on that store, so it could not return results. There is no global
   search endpoint in the backend, so this searches navigation destinations
   rather than inventing data.
============================================================================ */

interface SearchEntry {
  label: string;
  section: string;
  path: string;
}

export function AdminCommandSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();
  const navigate = useNavigate();
  const { can } = useAdminAccess();

  const entries = useMemo<SearchEntry[]>(() => {
    const result: SearchEntry[] = [];
    const seen = new Set<string>();

    for (const item of ADMIN_NAV) {
      const links = item.children?.length ? item.children : [item];
      for (const link of links) {
        if (!can(link.anyOf) || seen.has(link.path)) continue;
        seen.add(link.path);
        result.push({
          label: link.label === item.label || link.label === 'Overview' ? `${item.label}${link.label === 'Overview' ? ' Overview' : ''}` : link.label,
          section: item.label,
          path: link.path,
        });
      }
    }

    return result;
  }, [can]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries
      .filter((entry) => `${entry.label} ${entry.section}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [entries, query]);

  useEffect(() => setActiveIndex(0), [query]);

  // Ctrl/⌘ + K focuses the search field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (entry: SearchEntry | undefined) => {
    if (!entry) return;
    navigate(entry.path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const showResults = open && query.trim().length > 0;

  return (
    <div className="fk-menu-wrap fk-command-search">
      <div className="fk-search fk-search--header">
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search the Admin Center"
          aria-expanded={showResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showResults && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          placeholder="Search anything..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIndex((i) => Math.min(results.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIndex((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(results[activeIndex]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </div>

      {showResults && (
        <div className="fk-menu fk-command-search__results" role="listbox" id={listId}>
          {results.length === 0 ? (
            <div className="fk-command-search__empty">No pages match “{query.trim()}”.</div>
          ) : (
            results.map((entry, index) => (
              <button
                key={entry.path}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`fk-menu__item${index === activeIndex ? ' is-active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(entry);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="fk-command-search__label">{entry.label}</span>
                <span className="fk-command-search__section">{entry.section}</span>
                {index === activeIndex && <CornerDownLeft size={14} aria-hidden="true" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
