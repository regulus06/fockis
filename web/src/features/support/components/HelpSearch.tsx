import { useId, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, CircleHelp, Layers, Search } from "lucide-react";

import { resultLink, resultTitle, searchHelp } from "../data/searchHelp";
import { useHelpContent } from "../hooks/useHelpContent";

/** Help search bar with live suggestions; submitting opens the Help Center results. */
export default function HelpSearch({ initial = "", className = "" }: { initial?: string; className?: string }) {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const content = useHelpContent();
  const suggestions = useMemo(() => searchHelp(query, content, 6), [query, content]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (active >= 0 && suggestions[active]) {
      navigate(resultLink(suggestions[active]));
      return;
    }
    const q = query.trim();
    navigate(q ? `/help/articles?q=${encodeURIComponent(q)}` : "/help/articles");
  };

  return (
    <form className={`fk-help-search ${className}`} role="search" onSubmit={submit}>
      <Search className="fk-help-search__icon" size={22} aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Search help articles, guides, or common questions..."
        aria-label="Search help articles, guides, or common questions"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        maxLength={120}
      />
      <button type="submit" className="fk-help-search__button">Search</button>

      {open && query.trim() && (
        <ul className="fk-help-search__menu" id={listId} role="listbox">
          {suggestions.length === 0 ? (
            <li className="fk-help-search__none">No matches. Press Search to see all results, or contact Support.</li>
          ) : (
            suggestions.map((result, index) => {
              const Icon = result.type === "article" ? BookOpen : result.type === "faq" ? CircleHelp : Layers;
              return (
                <li key={`${result.type}-${result.item.id}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                  <Link to={resultLink(result)} className={index === active ? "is-active" : ""} onMouseDown={(e) => e.preventDefault()}>
                    <Icon size={16} aria-hidden="true" />
                    <span>{resultTitle(result)}</span>
                    <small>{result.type === "article" ? "Article" : result.type === "faq" ? "FAQ" : "Topic"}</small>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      )}
    </form>
  );
}
