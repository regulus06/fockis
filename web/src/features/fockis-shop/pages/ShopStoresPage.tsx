import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { StoreGrid } from "../components/stores/StoreGrid";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopError } from "../components/common/ShopError";
import { ShopPagination } from "../components/common/ShopPagination";

import { listStores, type StoreListResult } from "../services/storeApi";

import type { StoreListFilters } from "../types/store.types";

type LocationFilter = NonNullable<StoreListFilters["location"]>;

const LOCATION_TABS: { value: LocationFilter; label: string }[] = [
  { value: "all", label: "All stores" },
  { value: "local", label: "Near you" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

const TITLES: Record<LocationFilter, string> = {
  all: "All stores",
  local: "Stores near you",
  national: "National stores",
  international: "International stores",
};

export default function ShopStoresPage() {
  const [searchParams] = useSearchParams();

  const locationParam = searchParams.get("location");

  const location: LocationFilter =
    locationParam === "local" ||
    locationParam === "national" ||
    locationParam === "international"
      ? locationParam
      : "all";

  const [filters, setFilters] = useState<StoreListFilters>({
    page: 1,
    pageSize: 12,
    location,
  });

  const [data, setData] = useState<StoreListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFilters((previous) =>
      previous.location === location && previous.page === 1
        ? previous
        : { ...previous, location, page: 1 },
    );
  }, [location]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    listStores(filters)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Failed to load stores.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    filters.categorySlug,
    filters.countryCode,
    filters.query,
    filters.location,
    filters.minRating,
    filters.verifiedOnly,
    filters.sort,
    filters.page,
    filters.pageSize,
  ]);

  const handleSortChange = (value: StoreListFilters["sort"]) => {
    setFilters((previous) => ({
      ...previous,
      sort: value === "relevance" ? undefined : value,
      page: 1,
    }));
  };

  return (
    <div className="shop-page-root fk-shop">
      <ShopHeader />

      <main className="fk-container fk-page">
        <ShopBreadcrumbs items={[{ label: "Shop", to: "/shop" }, { label: "Stores" }]} />

        <div className="fk-page__head">
          <div>
            <h1>{TITLES[location]}</h1>
            <p>
              {data
                ? `${data.total.toLocaleString()} ${data.total === 1 ? "store" : "stores"} on Fockis`
                : "Independent sellers and businesses on Fockis"}
            </p>
          </div>

          <div className="fk-page__actions">
            <label className="fk-pills__sort" htmlFor="store-sort">
              <span>Sort by</span>
              <select
                id="store-sort"
                value={filters.sort ?? "relevance"}
                className="shop-select"
                onChange={(event) =>
                  handleSortChange(event.target.value as StoreListFilters["sort"])
                }
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Highest rated</option>
                <option value="newest">Newest</option>
                <option value="most_orders">Most orders</option>
              </select>
            </label>

            <Link to="/shop/sell" className="fk-btn fk-btn--cart">
              Open a store
            </Link>
          </div>
        </div>

        <div className="fk-pills fk-pills--wrap" role="tablist" aria-label="Store location">
          {LOCATION_TABS.map((tab) => (
            <Link
              key={tab.value}
              role="tab"
              aria-selected={location === tab.value}
              to={tab.value === "all" ? "/shop/stores" : `/shop/stores?location=${tab.value}`}
              className={location === tab.value ? "fk-pill is-active" : "fk-pill"}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {loading && <ShopLoading label="Loading stores…" rows={3} />}

        {!loading && error && <ShopError message={error} />}

        {!loading && !error && data && (
          <>
            <StoreGrid
              stores={data.items}
              emptyMessage={
                location === "all"
                  ? "Stores will appear here as sellers open their storefronts."
                  : "No stores match this location yet."
              }
            />

            {data.pages > 1 && (
              <ShopPagination
                page={data.page}
                totalPages={data.pages}
                onPageChange={(page) => {
                  setFilters((previous) => ({ ...previous, page }));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            )}
          </>
        )}
      </main>

      <ShopFooter />
    </div>
  );
}
