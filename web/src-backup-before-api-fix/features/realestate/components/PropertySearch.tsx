import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
} from "lucide-react";

export type SearchTab =
  | "all"
  | "sale"
  | "rent"
  | "land"
  | "commercial";

interface PropertySearchProps {
  tab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  onSearch: (value: string) => void;
  onFilters: () => void;
}

const tabs: Array<{
  id: SearchTab;
  label: string;
}> = [
  { id: "all", label: "All Properties" },
  { id: "sale", label: "Buy" },
  { id: "rent", label: "Rent" },
  { id: "land", label: "Land" },
  { id: "commercial", label: "Commercial" },
];

const PropertySearch: React.FC<
  PropertySearchProps
> = ({
  tab,
  onTabChange,
  onSearch,
  onFilters,
}) => {
  const [value, setValue] = useState("");

  const submit = () => {
    onSearch(value.trim());
  };

  return (
    <section className="re-hero">
      <div className="re-hero__content">
        <p className="re-eyebrow">
          Fockis Real Estate
        </p>

        <h1>
          Find a place you'll love to live.
        </h1>

        <p className="re-hero__subtitle">
          Search homes, apartments, land and
          commercial properties on Fockis.
        </p>

        <div className="re-search">
          <div className="re-search__tabs">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  tab === item.id
                    ? "is-active"
                    : ""
                }
                onClick={() =>
                  onTabChange(item.id)
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="re-search__fields">
            <label>
              <span>Location</span>

              <input
                value={value}
                onChange={(event) =>
                  setValue(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submit();
                  }
                }}
                placeholder="City, ZIP or neighborhood"
              />
            </label>

            <button
              type="button"
              className="re-filter-button"
              onClick={onFilters}
            >
              <SlidersHorizontal size={17} />
              Filters
            </button>

            <button
              type="button"
              className="re-search-button"
              onClick={submit}
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PropertySearch;