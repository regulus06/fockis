import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ShopHeader } from "../components/common/ShopHeader";
import { ShopFooter } from "../components/common/ShopFooter";
import { ShopBreadcrumbs } from "../components/common/ShopBreadcrumbs";
import { StoreGrid } from "../components/stores/StoreGrid";
import { ShopLoading } from "../components/common/ShopLoading";
import { ShopError } from "../components/common/ShopError";
import { ShopPagination } from "../components/common/ShopPagination";

import {
listStores,
type StoreListResult,
} from "../services/storeApi";

import type { StoreListFilters } from "../types/store.types";

export default function ShopStoresPage() {
const [searchParams] = useSearchParams();

const locationParam = searchParams.get("location");

const location: StoreListFilters["location"] =
locationParam === "local" ||
locationParam === "national" ||
locationParam === "international"
? locationParam
: "all";

const [filters, setFilters] =
useState<StoreListFilters>({
page: 1,
pageSize: 12,
location,
});

const [data, setData] =
useState<StoreListResult | null>(null);

const [loading, setLoading] = useState(true);

const [error, setError] =
useState<string | null>(null);

useEffect(() => {
setFilters((previous) => {
if (
previous.location === location &&
previous.page === 1
) {
return previous;
}

  return {
    ...previous,
    location,
    page: 1,
  };
});

}, [location]);

useEffect(() => {
let cancelled = false;

setLoading(true);
setError(null);

listStores(filters)
  .then((result) => {
    if (cancelled) {
      return;
    }

    setData(result);
  })
  .catch((err: unknown) => {
    if (cancelled) {
      return;
    }

    setData(null);

    setError(
      err instanceof Error
        ? err.message
        : "Failed to load stores.",
    );
  })
  .finally(() => {
    if (cancelled) {
      return;
    }

    setLoading(false);
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

const pageTitle =
location === "local"
? "Stores near you"
: location === "national"
? "National stores"
: location === "international"
? "International stores"
: "All stores";

const handlePageChange = (page: number) => {
setFilters((previous) => ({
...previous,
page,
}));
};

const handleSortChange = (
value: StoreListFilters["sort"],
) => {
setFilters((previous) => ({
...previous,
sort:
value === "relevance"
? undefined
: value,
page: 1,
}));
};

return ( <div className="shop-page-root"> <ShopHeader />

```
  <main>
    <div
      className="wrap"
      style={{
        paddingTop: 32,
      }}
    >
      <ShopBreadcrumbs
        items={[
          {
            label: "Shop",
            to: "/shop",
          },
          {
            label: "Stores",
          },
        ]}
      />
    </div>

    <section className="tight">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="sec-label">
              <span className="num">
                01
              </span>

              STORES
            </div>

            <h1>{pageTitle}</h1>

            {data && (
              <p>
                {data.total.toLocaleString()}{" "}
                {data.total === 1
                  ? "store"
                  : "stores"}
              </p>
            )}
          </div>

          <div
            className="category-filters-row"
            style={{
              marginBottom: 0,
            }}
          >
            <label
              className="mono"
              htmlFor="store-sort"
            >
              Sort by
            </label>

            <select
              id="store-sort"
              value={
                filters.sort ?? "relevance"
              }
              className="shop-select"
              onChange={(event) => {
                const value =
                  event.target.value as StoreListFilters["sort"];

                handleSortChange(value);
              }}
            >
              <option value="relevance">
                Relevance
              </option>

              <option value="rating">
                Highest Rated
              </option>

              <option value="newest">
                Newest
              </option>

              <option value="most_orders">
                Most Orders
              </option>
            </select>
          </div>
        </div>

        {loading && (
          <ShopLoading
            label="Loading stores…"
            rows={3}
          />
        )}

        {!loading && error && (
          <ShopError message={error} />
        )}

        {!loading &&
          !error &&
          data && (
            <>
              <StoreGrid
                stores={data.items}
              />

              {data.pages > 1 && (
                <ShopPagination
                  page={data.page}
                  totalPages={data.pages}
                  onPageChange={
                    handlePageChange
                  }
                />
              )}
            </>
          )}
      </div>
    </section>
  </main>

  <ShopFooter />
</div>
);
}
