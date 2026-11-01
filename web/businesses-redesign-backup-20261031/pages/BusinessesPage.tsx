import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowRight,
  Building2,
  LayoutGrid,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  X,
} from "lucide-react";

import { businessesApi } from "../services/businessesApi";
import { listStores } from "../../fockis-shop/services/storeApi";
import { resolveProductImageUrl } from "../../fockis-shop/utils/productImage";

import type {
  Business,
  BusinessCategory,
  BusinessSort,
} from "../types/business.types";
import type { Store } from "../../fockis-shop/types/store.types";

import BusinessSpotlight from "../components/BusinessSpotlight";
import BusinessSpotlightCard from "../components/BusinessSpotlightCard";
import SpotlightDealsRail from "../components/SpotlightDealsRail";
import {
  BusinessCardSkeletonGrid,
  EmptyState,
  ErrorState,
  RailNav,
  useRailScroll,
} from "../components/BusinessUi";

import {
  BUSINESS_CATEGORIES,
  BUSINESS_MANAGER_ROUTE,
  CREATE_BUSINESS_ROUTE,
  dedupeById,
  distanceKm,
  formatDistance,
  getActiveDeals,
  getCategoryLabel,
  getStoreRoute,
  getUsableImageUrl,
  hasCoordinates,
  isBusinessCategory,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessesPage.scss";


/* ============================================================================
   BUSINESSES DISCOVERY PAGE

   Data sources (all existing endpoints):
   - GET /businesses               directory (server-side search/filter/paging)
   - GET /businesses/spotlight     Spotlight rail
   - GET /stores                   first page of Fockis Shop stores

   Filters are kept in the URL (?q=&category=&city=&sort=) so results can be
   shared and the back button restores them.
============================================================================ */

const PAGE_SIZE = 24;

const SORT_OPTIONS: Array<{ value: BusinessSort | "nearest"; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name (A–Z)" },
  { value: "nearest", label: "Nearest to me" },
];

type SortValue = BusinessSort | "nearest";

interface Coordinates {
  lat: number;
  lng: number;
}

function readSort(value: string | null): SortValue {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortValue)
    : "featured";
}

export default function BusinessesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const category: BusinessCategory | undefined = isBusinessCategory(categoryParam)
    ? categoryParam
    : undefined;
  const city = searchParams.get("city") ?? "";
  const sort = readSort(searchParams.get("sort"));

  const hasFilters = Boolean(query || category || city);

  /* --------------------------------------------------------------------------
     URL STATE
  -------------------------------------------------------------------------- */

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          for (const [key, value] of Object.entries(changes)) {
            if (value) {
              next.set(key, value);
            } else {
              next.delete(key);
            }
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  /* --------------------------------------------------------------------------
     SEARCH INPUT (debounced into the URL)
  -------------------------------------------------------------------------- */

  const [searchInput, setSearchInput] = useState(query);
  const [cityInput, setCityInput] = useState(city);

  useEffect(() => setSearchInput(query), [query]);
  useEffect(() => setCityInput(city), [city]);

  useEffect(() => {
    if (searchInput.trim() === query) {
      return;
    }

    const timer = window.setTimeout(() => {
      updateParams({ q: searchInput.trim() || undefined });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, query, updateParams]);

  const submitCity = (event: FormEvent) => {
    event.preventDefault();
    updateParams({ city: cityInput.trim() || undefined });
  };

  const clearFilters = () => {
    setSearchInput("");
    setCityInput("");
    updateParams({ q: undefined, category: undefined, city: undefined });
  };

  /* --------------------------------------------------------------------------
     NEAREST TO ME (browser geolocation, only when the visitor asks)
  -------------------------------------------------------------------------- */

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (sort !== "nearest") {
      if (locationError) {
        setLocationError(null);
      }

      return;
    }

    // Ask once per visit to the "nearest" sort; a denial is not retried.
    if (coords || locating || locationError) {
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("Your browser does not support location sharing.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("Location access was not granted, so results are not sorted by distance.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [sort, coords, locating, locationError]);

  /* --------------------------------------------------------------------------
     DIRECTORY
  -------------------------------------------------------------------------- */

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  // "Nearest" loads the largest page the API allows and sorts by distance
  // locally, because the API has no geo query.
  const serverSort: BusinessSort = sort === "nearest" ? "featured" : sort;
  const pageSize = sort === "nearest" ? 100 : PAGE_SIZE;

  useEffect(() => {
    const id = ++requestId.current;

    setLoading(true);
    setError(null);

    businessesApi
      .list({ q: query, category, city, sort: serverSort, page: 1, limit: pageSize })
      .then((data) => {
        if (id !== requestId.current) {
          return;
        }

        setBusinesses(data);
        setPage(1);
        setHasMore(sort !== "nearest" && data.length === pageSize);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) {
          return;
        }

        setBusinesses([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : "Unable to load businesses.");
      })
      .finally(() => {
        if (id === requestId.current) {
          setLoading(false);
        }
      });
  }, [query, category, city, serverSort, pageSize, sort, reloadKey]);

  const loadMore = async () => {
    const id = requestId.current;
    const nextPage = page + 1;

    setLoadingMore(true);

    try {
      const data = await businessesApi.list({
        q: query,
        category,
        city,
        sort: serverSort,
        page: nextPage,
        limit: PAGE_SIZE,
      });

      if (id !== requestId.current) {
        return;
      }

      setBusinesses((previous) => dedupeById([...previous, ...data]));
      setPage(nextPage);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      setHasMore(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const directory = useMemo(() => {
    const unique = dedupeById(businesses);

    if (sort !== "nearest" || !coords) {
      return unique.map((business) => ({ business, distance: undefined as number | undefined }));
    }

    return unique
      .map((business) => ({
        business,
        distance: hasCoordinates(business)
          ? distanceKm(coords.lat, coords.lng, business.latitude!, business.longitude!)
          : undefined,
      }))
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [businesses, sort, coords]);

  /* --------------------------------------------------------------------------
     SPOTLIGHT + RECENT (only on the unfiltered landing view)
  -------------------------------------------------------------------------- */

  const [spotlight, setSpotlight] = useState<Business[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [recent, setRecent] = useState<Business[]>([]);

  useEffect(() => {
    let mounted = true;

    businessesApi
      .getSpotlight()
      .then((data) => mounted && setSpotlight(data))
      .catch(() => mounted && setSpotlight([]))
      .finally(() => mounted && setSpotlightLoading(false));

    businessesApi
      .list({ sort: "newest", limit: 8 })
      .then((data) => mounted && setRecent(data))
      .catch(() => mounted && setRecent([]));

    return () => {
      mounted = false;
    };
  }, []);

  // Only show "New on Fockis" when the directory is large enough that the
  // rail adds something the grid below does not already show.
  const showRecent =
    !hasFilters && sort === "featured" && hasMore && recent.length >= 4;

  const dealBusinesses = useMemo(
    () =>
      dedupeById([...spotlight, ...businesses]).filter(
        (business) => getActiveDeals(business).length > 0,
      ),
    [spotlight, businesses],
  );

  /* --------------------------------------------------------------------------
     FOCKIS SHOP STORES (first page only)
  -------------------------------------------------------------------------- */

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    listStores({ page: 1, pageSize: 8 })
      .then((result) => {
        if (mounted) {
          setStores(
            dedupeById(result.items ?? [])
              .filter(
                (store) =>
                  Boolean(store.slug) &&
                  store.status !== "suspended" &&
                  store.status !== "closed",
              )
              .slice(0, 8),
          );
        }
      })
      .catch(() => mounted && setStores([]))
      .finally(() => mounted && setStoresLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  const resultLabel = loading
    ? "Loading businesses…"
    : `${directory.length}${hasMore ? "+" : ""} ${directory.length === 1 ? "business" : "businesses"}`;

  const directoryTitle = category
    ? getCategoryLabel(category)
    : hasFilters
      ? "Search results"
      : "All businesses";

  return (
    <main className="fkb fkb-page fkb-discover">
      <div className="fkb-container">
        {/* ==============================================================
            HEADER
        ============================================================== */}

        <header className="fkb-discover__header">
          <div className="fkb-discover__intro">
            <span className="fkb-eyebrow">Fockis Businesses</span>
            <h1>Discover Businesses</h1>
            <p>
              Find local services, retailers, restaurants and companies on
              Fockis — see what they offer, their current deals and where to
              shop.
            </p>
          </div>

          <div className="fkb-discover__header-actions">
            <Link to={BUSINESS_MANAGER_ROUTE} className="fkb-btn fkb-btn--secondary">
              <Settings size={16} aria-hidden="true" />
              Manage my businesses
            </Link>
            <Link to={CREATE_BUSINESS_ROUTE} className="fkb-btn fkb-btn--dark">
              <Plus size={16} aria-hidden="true" />
              Add a business
            </Link>
          </div>
        </header>

        {/* ==============================================================
            SEARCH & FILTERS
        ============================================================== */}

        <section className="fkb-discover__filters" aria-label="Search and filter businesses">
          <div className="fkb-discover__search-row">
            <div className="fkb-input-group fkb-discover__search">
              <Search size={18} aria-hidden="true" />
              <label htmlFor="fkb-search" className="fkb-visually-hidden">
                Search businesses
              </label>
              <input
                id="fkb-search"
                type="search"
                className="fkb-input"
                placeholder="Search by name, description or service"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                maxLength={100}
                autoComplete="off"
              />
            </div>

            <form className="fkb-input-group fkb-discover__city" onSubmit={submitCity} role="search">
              <MapPin size={18} aria-hidden="true" />
              <label htmlFor="fkb-city" className="fkb-visually-hidden">
                City
              </label>
              <input
                id="fkb-city"
                type="text"
                className="fkb-input"
                placeholder="City"
                value={cityInput}
                onChange={(event) => setCityInput(event.target.value)}
                onBlur={() => {
                  if (cityInput.trim() !== city) {
                    updateParams({ city: cityInput.trim() || undefined });
                  }
                }}
                maxLength={100}
                autoComplete="address-level2"
              />
            </form>

            <div className="fkb-discover__sort">
              <label htmlFor="fkb-sort" className="fkb-visually-hidden">
                Sort businesses
              </label>
              <select
                id="fkb-sort"
                className="fkb-input"
                value={sort}
                onChange={(event) =>
                  updateParams({
                    sort: event.target.value === "featured" ? undefined : event.target.value,
                  })
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="fkb-discover__chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              className="fkb-chip"
              aria-pressed={!category}
              onClick={() => updateParams({ category: undefined })}
            >
              <LayoutGrid size={15} aria-hidden="true" />
              All
            </button>

            {BUSINESS_CATEGORIES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className="fkb-chip"
                aria-pressed={category === value}
                onClick={() =>
                  updateParams({ category: category === value ? undefined : value })
                }
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {sort === "nearest" && (locating || locationError) && (
            <div
              className={`fkb-alert ${locationError ? "fkb-alert--warning" : "fkb-alert--info"}`}
              role="status"
            >
              {locating ? (
                <Loader2 size={16} className="fkb-spin" aria-hidden="true" />
              ) : (
                <LocateFixed size={16} aria-hidden="true" />
              )}
              <span>{locationError ?? "Finding your location…"}</span>
            </div>
          )}
        </section>

        {/* ==============================================================
            SPOTLIGHT
        ============================================================== */}

        {!hasFilters && (
          <div className="fkb-section">
            <BusinessSpotlight
              businesses={spotlight}
              loading={spotlightLoading}
              description="Businesses featured by Fockis."
              showViewAll={false}
            />
          </div>
        )}

        {/* ==============================================================
            DEALS
        ============================================================== */}

        {!hasFilters && dealBusinesses.length > 0 && (
          <div className="fkb-section">
            <SpotlightDealsRail
              businesses={dealBusinesses}
              title="Deals & promotions"
              eyebrow="Current offers"
              dealsOnly
            />
          </div>
        )}

        {/* ==============================================================
            RECENTLY ADDED
        ============================================================== */}

        {showRecent && <RecentRail businesses={recent} />}

        {/* ==============================================================
            DIRECTORY
        ============================================================== */}

        <section className="fkb-section" aria-labelledby="fkb-directory-title">
          <div className="fkb-section-head">
            <div>
              <h2 id="fkb-directory-title">{directoryTitle}</h2>
              <p aria-live="polite">
                {resultLabel}
                {query && ` for “${query}”`}
                {city && ` in ${city}`}
              </p>
            </div>

            {hasFilters && (
              <div className="fkb-section-head__actions">
                <button type="button" className="fkb-btn fkb-btn--ghost fkb-btn--sm" onClick={clearFilters}>
                  <X size={16} aria-hidden="true" />
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <BusinessCardSkeletonGrid count={6} />
          ) : error ? (
            <ErrorState
              title="Businesses could not be loaded"
              message="Check your connection and try again."
              onRetry={() => setReloadKey((value) => value + 1)}
            />
          ) : directory.length === 0 ? (
            <EmptyState
              icon={<Building2 size={24} />}
              title={hasFilters ? "No businesses match your search" : "No businesses yet"}
              message={
                hasFilters
                  ? "Try a different name, category or city."
                  : "Published businesses will appear here. Be the first to add yours."
              }
              actions={
                hasFilters ? (
                  <button type="button" className="fkb-btn fkb-btn--secondary" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : (
                  <Link to={CREATE_BUSINESS_ROUTE} className="fkb-btn fkb-btn--primary">
                    <Plus size={16} aria-hidden="true" />
                    Add your business
                  </Link>
                )
              }
            />
          ) : (
            <>
              <div className="fkb-grid">
                {directory.map(({ business, distance }) => (
                  <BusinessSpotlightCard
                    key={business.id}
                    business={business}
                    distanceLabel={distance !== undefined ? formatDistance(distance) : undefined}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="fkb-discover__more">
                  <button
                    type="button"
                    className="fkb-btn fkb-btn--secondary fkb-btn--lg"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
                    {loadingMore ? "Loading…" : "Load more businesses"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ==============================================================
            FOCKIS SHOP STORES
        ============================================================== */}

        {!hasFilters && (storesLoading || stores.length > 0) && (
          <section className="fkb-section" aria-labelledby="fkb-stores-title">
            <div className="fkb-section-head">
              <div>
                <span className="fkb-eyebrow">Fockis Shop</span>
                <h2 id="fkb-stores-title">Shop from businesses</h2>
                <p>Storefronts selling on Fockis Shop.</p>
              </div>

              <div className="fkb-section-head__actions">
                <Link to="/shop/stores" className="fkb-link">
                  Browse all stores
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {storesLoading ? (
              <div className="fkb-store-grid" role="status" aria-label="Loading stores">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="fkb-skeleton fkb-store-tile--skeleton" />
                ))}
              </div>
            ) : (
              <div className="fkb-store-grid">
                {stores.map((store) => (
                  <StoreTile key={store.id} store={store} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}


/* ============================================================================
   RECENTLY ADDED RAIL
============================================================================ */

function RecentRail({ businesses }: { businesses: Business[] }) {
  const { trackRef, canPrev, canNext, scrollBy } = useRailScroll();

  return (
    <section className="fkb-section" aria-labelledby="fkb-recent-title">
      <div className="fkb-section-head">
        <div>
          <h2 id="fkb-recent-title">New on Fockis</h2>
          <p>Recently added businesses.</p>
        </div>
        <div className="fkb-section-head__actions">
          <RailNav label="new businesses" canPrev={canPrev} canNext={canNext} onScroll={scrollBy} />
        </div>
      </div>

      <div className="fkb-rail">
        <div ref={trackRef} className="fkb-rail__track">
          {dedupeById(businesses).map((business) => (
            <BusinessSpotlightCard key={business.id} business={business} variant="compact" />
          ))}
        </div>
      </div>
    </section>
  );
}


/* ============================================================================
   STORE TILE
============================================================================ */

function StoreTile({ store }: { store: Store }) {
  const logo = getUsableImageUrl(resolveProductImageUrl(store.logoUrl));
  const location = [store.location?.city, store.location?.country].filter(Boolean).join(", ");

  return (
    <Link to={getStoreRoute(store.slug)} className="fkb-store-tile">
      <span className="fkb-store-tile__logo" aria-hidden="true">
        {logo ? <img src={logo} alt="" loading="lazy" /> : <ShoppingBag size={20} />}
      </span>

      <span className="fkb-store-tile__text">
        <strong>{store.name}</strong>
        <span>
          {[
            location,
            store.productCount > 0
              ? `${store.productCount} ${store.productCount === 1 ? "product" : "products"}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ") || "Fockis Shop store"}
        </span>
      </span>

      <ArrowRight size={16} aria-hidden="true" className="fkb-store-tile__arrow" />
    </Link>
  );
}
