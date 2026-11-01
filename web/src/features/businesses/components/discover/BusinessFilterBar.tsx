import { ArrowDownWideNarrow, Clock, Flame, MapPin, Navigation, Sparkles, Star } from "lucide-react";

export type DiscoverSort = "featured" | "popular" | "newest" | "name" | "nearest";

const SORT_LABELS: Record<DiscoverSort, string> = {
  featured: "Featured",
  popular: "Most Popular",
  newest: "Newest",
  name: "Name (A–Z)",
  nearest: "Nearest",
};

interface Props {
  city: string;
  cities: string[];
  onCityChange: (city: string) => void;
  sort: DiscoverSort;
  onSortChange: (sort: DiscoverSort) => void;
  openNow: boolean;
  onOpenNowChange: (value: boolean) => void;
}

/**
 * Location + sort selects and quick pills. "Most Popular" orders by profile
 * views and "Open Now" uses saved opening hours — both real fields; there is
 * no rating data in the API, so there is no "Highest Rated" option.
 */
export default function BusinessFilterBar({
  city,
  cities,
  onCityChange,
  sort,
  onSortChange,
  openNow,
  onOpenNowChange,
}: Props) {
  const pills: Array<{ id: DiscoverSort; icon: typeof Star }> = [
    { id: "featured", icon: Star },
    { id: "popular", icon: Flame },
    { id: "newest", icon: Sparkles },
    { id: "nearest", icon: Navigation },
  ];
  const cityOptions = city && !cities.includes(city) ? [city, ...cities] : cities;

  return (
    <div className="fkbd-filters" role="group" aria-label="Filter and sort businesses">
      <label className="fkbd-select">
        <MapPin size={17} aria-hidden="true" />
        <span>Location:</span>
        <select value={city} onChange={(changeEvent) => onCityChange(changeEvent.target.value)}>
          <option value="">Anywhere</option>
          {cityOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <label className="fkbd-select">
        <ArrowDownWideNarrow size={17} aria-hidden="true" />
        <span>Sort:</span>
        <select value={sort} onChange={(changeEvent) => onSortChange(changeEvent.target.value as DiscoverSort)}>
          {(Object.keys(SORT_LABELS) as DiscoverSort[]).map((id) => (
            <option key={id} value={id}>
              {SORT_LABELS[id]}
            </option>
          ))}
        </select>
      </label>

      <span className="fkbd-filters__divider" aria-hidden="true" />

      <div className="fkbd-pills">
        {pills.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`fkbd-pill ${sort === id ? "is-active" : ""}`}
            aria-pressed={sort === id}
            onClick={() => onSortChange(id)}
          >
            <Icon size={15} fill={sort === id && id === "featured" ? "currentColor" : "none"} aria-hidden="true" />
            {id === "nearest" ? "Nearby" : SORT_LABELS[id]}
          </button>
        ))}
        <button
          type="button"
          className={`fkbd-pill ${openNow ? "is-active" : ""}`}
          aria-pressed={openNow}
          onClick={() => onOpenNowChange(!openNow)}
        >
          <Clock size={15} aria-hidden="true" />
          Open Now
        </button>
      </div>
    </div>
  );
}
