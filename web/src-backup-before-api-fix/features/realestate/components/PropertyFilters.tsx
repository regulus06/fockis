import React from "react";
import { X } from "lucide-react";

export interface PropertyFilterValues {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
}

interface PropertyFiltersProps {
  open: boolean;
  values: PropertyFilterValues;
  onChange: (
    values: PropertyFilterValues,
  ) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
}

const PropertyFilters: React.FC<
  PropertyFiltersProps
> = ({
  open,
  values,
  onChange,
  onClose,
  onApply,
  onReset,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="re-filter-overlay">
      <aside className="re-filter-panel">
        <header>
          <div>
            <small>Search</small>
            <h2>Filters</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="re-filter-content">
          <section>
            <h4>Property type</h4>

            <div className="re-chip-grid">
              {[
                ["", "All"],
                ["house", "House"],
                ["apartment", "Apartment"],
                ["condo", "Condo"],
                ["townhouse", "Townhouse"],
                ["land", "Land"],
                ["commercial", "Commercial"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    (values.propertyType || "") ===
                    value
                      ? "is-active"
                      : ""
                  }
                  onClick={() =>
                    onChange({
                      ...values,
                      propertyType: value,
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4>Price</h4>

            <div className="re-range">
              <input
                type="number"
                placeholder="Min"
                value={values.minPrice ?? ""}
                onChange={(event) =>
                  onChange({
                    ...values,
                    minPrice:
                      event.target.value
                        ? Number(
                            event.target.value,
                          )
                        : undefined,
                  })
                }
              />

              <span>—</span>

              <input
                type="number"
                placeholder="Max"
                value={values.maxPrice ?? ""}
                onChange={(event) =>
                  onChange({
                    ...values,
                    maxPrice:
                      event.target.value
                        ? Number(
                            event.target.value,
                          )
                        : undefined,
                  })
                }
              />
            </div>
          </section>

          <section>
            <h4>Bedrooms</h4>

            <div className="re-chip-grid">
              {[undefined, 1, 2, 3, 4].map(
                (value) => (
                  <button
                    key={String(value)}
                    type="button"
                    className={
                      values.bedrooms === value
                        ? "is-active"
                        : ""
                    }
                    onClick={() =>
                      onChange({
                        ...values,
                        bedrooms: value,
                      })
                    }
                  >
                    {value
                      ? `${value}+`
                      : "Any"}
                  </button>
                ),
              )}
            </div>
          </section>

          <section>
            <h4>Bathrooms</h4>

            <div className="re-chip-grid">
              {[undefined, 1, 2, 3, 4].map(
                (value) => (
                  <button
                    key={String(value)}
                    type="button"
                    className={
                      values.bathrooms === value
                        ? "is-active"
                        : ""
                    }
                    onClick={() =>
                      onChange({
                        ...values,
                        bathrooms: value,
                      })
                    }
                  >
                    {value
                      ? `${value}+`
                      : "Any"}
                  </button>
                ),
              )}
            </div>
          </section>
        </div>

        <footer>
          <button
            type="button"
            className="re-reset"
            onClick={onReset}
          >
            Reset
          </button>

          <button
            type="button"
            className="re-apply"
            onClick={onApply}
          >
            Apply Filters
          </button>
        </footer>
      </aside>
    </div>
  );
};

export default PropertyFilters;