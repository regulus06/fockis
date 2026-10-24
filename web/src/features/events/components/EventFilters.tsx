import { LocateFixed, Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

import { EVENT_CATEGORIES } from "../constants/eventCategories";
import type {
  EventAvailability,
  EventCategory,
  EventFormat,
  EventSort,
  EventWhen,
} from "../types/event.types";

export interface EventFilterValues {
  q: string;
  category: EventCategory | "";
  when: EventWhen;
  format: EventFormat;
  availability: EventAvailability;
  sort: EventSort;
  radiusKm: number | "";
}

export const DEFAULT_EVENT_FILTERS: EventFilterValues = {
  q: "",
  category: "",
  when: "any",
  format: "any",
  availability: "any",
  sort: "relevance",
  radiusKm: "",
};

interface Props {
  value: EventFilterValues;
  onChange: (patch: Partial<EventFilterValues>) => void;
  onReset: () => void;
  hasLocation: boolean;
  locating?: boolean;
  onRequestLocation: () => void;
}

const WHEN: Array<[EventWhen, string]> = [
  ["any", "Any time"],
  ["live", "Happening now"],
  ["today", "Today"],
  ["tomorrow", "Tomorrow"],
  ["this-week", "Next 7 days"],
  ["this-weekend", "This weekend"],
  ["next-30-days", "Next 30 days"],
];

export function isFiltered(value: EventFilterValues): boolean {
  return (
    value.q.trim() !== "" ||
    value.category !== "" ||
    value.when !== "any" ||
    value.format !== "any" ||
    value.availability !== "any" ||
    value.radiusKm !== ""
  );
}

export default function EventFilters({ value, onChange, onReset, hasLocation, locating, onRequestLocation }: Props) {
  const [open, setOpen] = useState(false);
  const featured = EVENT_CATEGORIES.filter((category) => category.featured);

  return (
    <div className="fke-filters">
      <div className="fke-filters__bar">
        <label className="fke-search">
          <Search size={18} aria-hidden="true" />
          <span className="fke-sr-only">Search events</span>
          <input
            type="search"
            value={value.q}
            onChange={(changeEvent) => onChange({ q: changeEvent.target.value })}
            placeholder="Search events, places, categories…"
            enterKeyHint="search"
          />
          {value.q && (
            <button type="button" className="fke-search__clear" onClick={() => onChange({ q: "" })} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <button
          type="button"
          className={`fke-btn fke-btn--outline fke-filters__toggle ${open ? "is-active" : ""}`}
          aria-expanded={open}
          aria-controls="fke-filter-panel"
          onClick={() => setOpen((current) => !current)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
        </button>
      </div>

      <div className="fke-chips" role="group" aria-label="Categories">
        <button
          type="button"
          className={`fke-chip ${value.category === "" ? "is-active" : ""}`}
          aria-pressed={value.category === ""}
          onClick={() => onChange({ category: "" })}
        >
          All
        </button>
        {featured.map((category) => (
          <button
            key={category.value}
            type="button"
            className={`fke-chip ${value.category === category.value ? "is-active" : ""}`}
            aria-pressed={value.category === category.value}
            onClick={() => onChange({ category: value.category === category.value ? "" : category.value })}
          >
            <category.icon size={15} aria-hidden="true" />
            {category.label}
          </button>
        ))}
      </div>

      {open && (
        <div className="fke-filters__panel" id="fke-filter-panel">
          <label className="fke-field">
            <span>Date</span>
            <select value={value.when} onChange={(changeEvent) => onChange({ when: changeEvent.target.value as EventWhen })}>
              {WHEN.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="fke-field">
            <span>Category</span>
            <select
              value={value.category}
              onChange={(changeEvent) => onChange({ category: changeEvent.target.value as EventCategory | "" })}
            >
              <option value="">All categories</option>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fke-field">
            <span>Format</span>
            <select value={value.format} onChange={(changeEvent) => onChange({ format: changeEvent.target.value as EventFormat })}>
              <option value="any">Online & in person</option>
              <option value="in-person">In person</option>
              <option value="online">Online</option>
            </select>
          </label>

          <label className="fke-field">
            <span>Availability</span>
            <select
              value={value.availability}
              onChange={(changeEvent) => onChange({ availability: changeEvent.target.value as EventAvailability })}
            >
              <option value="any">Any</option>
              <option value="open">Spots available</option>
            </select>
          </label>

          <label className="fke-field">
            <span>Distance</span>
            <select
              value={String(value.radiusKm)}
              disabled={!hasLocation}
              onChange={(changeEvent) =>
                onChange({ radiusKm: changeEvent.target.value ? Number(changeEvent.target.value) : "" })
              }
            >
              <option value="">Anywhere</option>
              {[5, 10, 25, 50, 100].map((km) => (
                <option key={km} value={km}>
                  Within {km} km
                </option>
              ))}
            </select>
          </label>

          <label className="fke-field">
            <span>Sort by</span>
            <select value={value.sort} onChange={(changeEvent) => onChange({ sort: changeEvent.target.value as EventSort })}>
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="popularity">Popularity</option>
              <option value="distance" disabled={!hasLocation}>
                Distance{hasLocation ? "" : " (needs location)"}
              </option>
            </select>
          </label>

          <div className="fke-filters__footer">
            {!hasLocation && (
              <button type="button" className="fke-btn fke-btn--ghost" onClick={onRequestLocation} disabled={locating}>
                <LocateFixed size={16} aria-hidden="true" />
                {locating ? "Locating…" : "Use my location"}
              </button>
            )}
            <button type="button" className="fke-btn fke-btn--ghost" onClick={onReset}>
              Reset filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
