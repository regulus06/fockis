import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent, MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  BedDouble,
  CalendarDays,
  Car,
  Compass,
  House,
  Search,
  Ticket,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import "../styles/TravelSearchPanel.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — SEARCH PANEL
 * ============================================================================
 *
 * The white panel that overlaps the bottom of the home hero. The tab decides
 * which fields show and which results page receives the search:
 *
 *   Stays            → /travel/stays?destination&checkIn&checkOut&guests
 *   Everything else  → /travel/explore?type=<listing type>&q&…
 *                      (Explore queries GET /travel/listings?type=…; cars
 *                       also pass pickupDate/dropoffDate, which the
 *                       backend's car search supports)
 *
 * The last search is remembered for this browser tab so coming back to the
 * home page keeps the traveller's selections.
 * ============================================================================
 */

export type SearchTabId =
  | "stays"
  | "rentals"
  | "restaurants"
  | "cars"
  | "experiences"
  | "events";

interface SearchTab {
  id: SearchTabId;
  label: string;
  icon: LucideIcon;
  listingType: string;
  whereLabel: string;
  wherePlaceholder: string;
  /** "range" = start + end date; "single" = one date. */
  dates: "range" | "single";
  startLabel: string;
  endLabel?: string;
  peopleLabel?: string;
  peopleUnit?: [string, string];
}

const TABS: SearchTab[] = [
  {
    id: "stays",
    label: "Stays",
    icon: BedDouble,
    listingType: "stay",
    whereLabel: "Where are you going?",
    wherePlaceholder: "Search destinations, hotels, or businesses",
    dates: "range",
    startLabel: "Check in",
    endLabel: "Check out",
    peopleLabel: "Travelers",
    peopleUnit: ["traveler", "travelers"],
  },
  {
    id: "rentals",
    label: "Vacation Rentals",
    icon: House,
    listingType: "rental",
    whereLabel: "Where are you going?",
    wherePlaceholder: "City, country or rental name",
    dates: "range",
    startLabel: "Check in",
    endLabel: "Check out",
    peopleLabel: "Guests",
    peopleUnit: ["guest", "guests"],
  },
  {
    id: "restaurants",
    label: "Restaurants",
    icon: UtensilsCrossed,
    listingType: "restaurant",
    whereLabel: "Where do you want to eat?",
    wherePlaceholder: "City or restaurant name",
    dates: "single",
    startLabel: "Date",
    peopleLabel: "Party size",
    peopleUnit: ["person", "people"],
  },
  {
    id: "cars",
    label: "Cars",
    icon: Car,
    listingType: "car",
    whereLabel: "Pick-up location",
    wherePlaceholder: "City or airport",
    dates: "range",
    startLabel: "Pick-up date",
    endLabel: "Drop-off date",
  },
  {
    id: "experiences",
    label: "Experiences",
    icon: Compass,
    listingType: "experience",
    whereLabel: "Where are you going?",
    wherePlaceholder: "City, country or activity",
    dates: "single",
    startLabel: "Date",
    peopleLabel: "Travelers",
    peopleUnit: ["traveler", "travelers"],
  },
  {
    id: "events",
    label: "Events",
    icon: Ticket,
    listingType: "event",
    whereLabel: "Where?",
    wherePlaceholder: "City or event name",
    dates: "single",
    startLabel: "Date",
    peopleLabel: "Tickets",
    peopleUnit: ["ticket", "tickets"],
  },
];

const STORAGE_KEY = "fockis-travel:last-search";

interface SavedSearch {
  tab: SearchTabId;
  where: string;
  start: string;
  end: string;
  people: number;
}

function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function nextDay(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + 1);
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

/** Open the native calendar on click (Chrome/Edge/Firefox support showPicker). */
function openPicker(event: MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker?.();
  } catch {
    // Some browsers block showPicker outside trusted gestures; typing still works.
  }
}

function readSaved(): Partial<SavedSearch> {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SavedSearch>) : {};
  } catch {
    return {};
  }
}

function writeSaved(value: SavedSearch) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: the URL still carries the search.
  }
}

export default function TravelSearchPanel() {
  const navigate = useNavigate();
  const formId = useId();
  const saved = useMemo(readSaved, []);
  const today = useMemo(todayString, []);

  const [tabId, setTabId] = useState<SearchTabId>(
    TABS.some((tab) => tab.id === saved.tab) ? (saved.tab as SearchTabId) : "stays",
  );
  const [where, setWhere] = useState(saved.where ?? "");
  const [start, setStart] = useState(saved.start && saved.start >= today ? saved.start : "");
  const [end, setEnd] = useState(saved.end && saved.end > (saved.start ?? "") ? saved.end : "");
  const [people, setPeople] = useState(Math.min(16, Math.max(1, Number(saved.people) || 2)));
  const [error, setError] = useState("");

  const tab = TABS.find((item) => item.id === tabId) ?? TABS[0];

  useEffect(() => {
    setError("");
  }, [tabId, where, start, end, people]);

  function handleStartChange(value: string) {
    setStart(value);
    if (tab.dates === "range" && end && value && end <= value) {
      setEnd(nextDay(value));
    }
  }

  function handleTabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tabId);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;

    event.preventDefault();
    setTabId(TABS[next].id);
    document.getElementById(`${formId}-tab-${TABS[next].id}`)?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (tab.dates === "range" && start && end && end <= start) {
      setError(`${tab.endLabel} must be after ${tab.startLabel?.toLowerCase()}.`);
      return;
    }

    if (tab.dates === "range" && end && !start) {
      setError(`Choose a ${tab.startLabel?.toLowerCase()} first.`);
      return;
    }

    writeSaved({ tab: tab.id, where: where.trim(), start, end, people });

    const params = new URLSearchParams();
    const query = where.trim();

    if (tab.id === "stays") {
      if (query) params.set("destination", query);
      if (start) params.set("checkIn", start);
      if (end) params.set("checkOut", end);
      params.set("guests", String(people));
      navigate(`/travel/stays?${params.toString()}`);
      return;
    }

    params.set("type", tab.listingType);
    if (query) params.set("q", query);

    if (tab.id === "cars") {
      if (start) params.set("pickupDate", start);
      if (end) params.set("dropoffDate", end);
    } else if (tab.dates === "range") {
      if (start) params.set("checkIn", start);
      if (end) params.set("checkOut", end);
    } else if (start) {
      params.set("date", start);
    }

    if (tab.peopleLabel) params.set("guests", String(people));

    navigate(`/travel/explore?${params.toString()}`);
  }

  return (
    <form
      className="ft-search"
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search Fockis Travel"
    >
      <div
        className="ft-search__tabs"
        role="tablist"
        aria-label="What are you looking for?"
        onKeyDown={handleTabKeys}
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = item.id === tabId;

          return (
            <button
              key={item.id}
              id={`${formId}-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${formId}-panel`}
              tabIndex={active ? 0 : -1}
              className={`ft-search__tab${active ? " is-active" : ""}`}
              onClick={() => setTabId(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`${formId}-panel`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-${tabId}`}
        className={`ft-search__fields ft-search__fields--${tab.dates}${tab.peopleLabel ? "" : " ft-search__fields--no-people"}`}
      >
        <label className="ft-search__field ft-search__field--where">
          <span className="ft-search__label">{tab.whereLabel}</span>
          <input
            type="search"
            value={where}
            onChange={(event) => setWhere(event.target.value)}
            placeholder={tab.wherePlaceholder}
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>

        <label className={`ft-search__field ft-search__field--date${start ? " has-value" : ""}`}>
          <span className="ft-search__label">{tab.startLabel}</span>
          <span className="ft-search__date">
            <input
              type="date"
              value={start}
              min={today}
              onChange={(event) => handleStartChange(event.target.value)}
              onClick={openPicker}
              aria-label={tab.startLabel}
            />
            {!start && (
              <span className="ft-search__date-text" aria-hidden="true">
                Add dates
              </span>
            )}
            <CalendarDays size={16} aria-hidden="true" />
          </span>
        </label>

        {tab.dates === "range" && (
          <label className={`ft-search__field ft-search__field--date${end ? " has-value" : ""}`}>
            <span className="ft-search__label">{tab.endLabel}</span>
            <span className="ft-search__date">
              <input
                type="date"
                value={end}
                min={start ? nextDay(start) : today}
                onChange={(event) => setEnd(event.target.value)}
                onClick={openPicker}
                aria-label={tab.endLabel}
              />
              {!end && (
                <span className="ft-search__date-text" aria-hidden="true">
                  Add dates
                </span>
              )}
              <CalendarDays size={16} aria-hidden="true" />
            </span>
          </label>
        )}

        {tab.peopleLabel && tab.peopleUnit && (
          <label className="ft-search__field ft-search__field--people">
            <span className="ft-search__label">{tab.peopleLabel}</span>
            <select
              value={people}
              onChange={(event) => setPeople(Number(event.target.value))}
            >
              {Array.from({ length: 16 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count} {count === 1 ? tab.peopleUnit![0] : tab.peopleUnit![1]}
                </option>
              ))}
            </select>
          </label>
        )}

        <button type="submit" className="ft-search__submit">
          <Search size={18} aria-hidden="true" className="ft-search__submit-icon" />
          Search
        </button>
      </div>

      {error && (
        <p className="ft-search__error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
