import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Building2, LayoutGrid, Loader2, LocateFixed, Plus, ShoppingBag, X } from "lucide-react";

import { businessesApi } from "../services/businessesApi";
import { listStores } from "../../fockis-shop/services/storeApi";
import { resolveProductImageUrl } from "../../fockis-shop/utils/productImage";

import type { Business, BusinessCategory, BusinessSort } from "../types/business.types";
import type { Store } from "../../fockis-shop/types/store.types";

import SpotlightDealsRail from "../components/SpotlightDealsRail";
import { BusinessCardSkeletonGrid, EmptyState, ErrorState } from "../components/BusinessUi";
import BusinessesShell from "../components/discover/BusinessesShell";
import BusinessesHero from "../components/discover/BusinessesHero";
import BusinessCategoryBar from "../components/discover/BusinessCategoryBar";
import BusinessFilterBar, { type DiscoverSort } from "../components/discover/BusinessFilterBar";
import FeaturedBusinessesRail from "../components/discover/FeaturedBusinessesRail";
import FeaturedBusinessCard from "../components/discover/FeaturedBusinessCard";
import NearbyBusinesses, { type NearbyItem } from "../components/discover/NearbyBusinesses";
import {
  JoinBusinessCard,
  MyBusinessesCard,
  PromoteBusinessCard,
  TrendingCategoriesCard,
} from "../components/discover/BusinessRailCards";
import { openLabel, shortDistance } from "../components/discover/discoverUtils";

import {
  CREATE_BUSINESS_ROUTE,
  dedupeById,
  distanceKm,
  getActiveDeals,
  getCategoryLabel,
  getStoreRoute,
  getUsableImageUrl,
  hasCoordinates,
  isBusinessCategory,
} from "../utils/businessUtils";

/* ============================================================================
   BUSINESSES DISCOVERY PAGE

   Data sources (all existing endpoints):
   - GET /businesses             directory (server search/category/city/sort,
                                 paging) and a 100-item sample used for the
                                 city list, Nearby, and Trending Categories
   - GET /businesses/spotlight   Featured Businesses
   - GET /businesses/mine        My Businesses (signed-in owners)
   - GET /stores                 Fockis Shop storefronts

   Filters live in the URL (?q=&category=&city=&sort=&open=1) so a view can
   be shared and the back button restores it. The API has no geo, rating or
   popularity query: "Nearby" sorts by distance and "Most Popular" by profile
   views on the client, over the largest page the API allows (100).
============================================================================ */

const PAGE_SIZE = 24;
const SAMPLE_SIZE = 100;
const SORTS: DiscoverSort[] = ["featured", "popular", "newest", "name", "nearest"];

interface Coordinates {
  lat: number;
  lng: number;
}

function hasToken(): boolean {
  try {
    return Boolean(localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("jwt"));
  } catch {
    return false;
  }
}

export default function BusinessesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category");
  const category: BusinessCategory | undefined = isBusinessCategory(categoryParam) ? categoryParam : undefined;
  const city = searchParams.get("city") ?? "";
  const sortParam = searchParams.get("sort") as DiscoverSort | null;
  const sort: DiscoverSort = sortParam && SORTS.includes(sortParam) ? sortParam : "featured";
  const openNow = searchParams.get("open") === "1";
  const hasFilters = Boolean(query || category || city || openNow);
  const directoryRef = useRef<HTMLElement>(null);

  const updateParams = useCallback(
    (changes: Record<string, string | undefined>) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          for (const [key, value] of Object.entries(changes)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const scrollTo = (element: HTMLElement | null) =>
    window.requestAnimationFrame(() => element?.scrollIntoView({ behavior: "smooth", block: "start" }));

  /* ------------------------------------------------------------- search box */

  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => setSearchInput(query), [query]);

  const submitSearch = (text = searchInput) => {
    updateParams({ q: text.trim() || undefined });
    scrollTo(directoryRef.current);
  };

  const clearFilters = () => {
    setSearchInput("");
    updateParams({ q: undefined, category: undefined, city: undefined, open: undefined });
  };

  /* ---------------------------------------------- location (on request only) */

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (coords || locating) return;

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
        setLocationError("Location access was not granted, so results aren't sorted by distance.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [coords, locating]);

  useEffect(() => {
    if (sort === "nearest") requestLocation();
  }, [sort, requestLocation]);

  const distanceTo = useCallback(
    (business: Business) =>
      coords && hasCoordinates(business)
        ? distanceKm(coords.lat, coords.lng, business.latitude!, business.longitude!)
        : undefined,
    [coords],
  );

  /* -------------------------------------------------------------- directory */

  const clientSort = sort === "nearest" || sort === "popular";
  const serverSort: BusinessSort = clientSort ? "featured" : sort;
  const pageSize = clientSort ? SAMPLE_SIZE : PAGE_SIZE;

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;

    setLoading(true);
    setError(null);

    businessesApi
      .list({ q: query, category, city, sort: serverSort, page: 1, limit: pageSize })
      .then((data) => {
        if (id !== requestId.current) return;

        setBusinesses(data);
        setPage(1);
        setHasMore(!clientSort && data.length === pageSize);
      })
      .catch((err: unknown) => {
        if (id !== requestId.current) return;

        setBusinesses([]);
        setHasMore(false);
        setError(err instanceof Error ? err.message : "Unable to load businesses.");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [query, category, city, serverSort, pageSize, clientSort, reloadKey]);

  const loadMore = async () => {
    const id = requestId.current;
    const nextPage = page + 1;

    setLoadingMore(true);

    try {
      const data = await businessesApi.list({ q: query, category, city, sort: serverSort, page: nextPage, limit: PAGE_SIZE });

      if (id !== requestId.current) return;

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
    let list = dedupeById(businesses);

    if (openNow) list = list.filter((business) => openLabel(business)?.status === "open");

    if (sort === "popular") {
      list = [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    } else if (sort === "nearest" && coords) {
      list = [...list].sort((a, b) => (distanceTo(a) ?? Infinity) - (distanceTo(b) ?? Infinity));
    }

    return list;
  }, [businesses, openNow, sort, coords, distanceTo]);

  /* ------------------------------------------------- spotlight + sample */

  const [spotlight, setSpotlight] = useState<Business[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(true);
  const [sample, setSample] = useState<Business[]>([]);
  const [sampleLoading, setSampleLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    businessesApi
      .getSpotlight()
      .then((data) => mounted && setSpotlight(data))
      .catch(() => mounted && setSpotlight([]))
      .finally(() => mounted && setSpotlightLoading(false));

    businessesApi
      .list({ sort: "featured", limit: SAMPLE_SIZE })
      .then((data) => mounted && setSample(dedupeById(data)))
      .catch(() => mounted && setSample([]))
      .finally(() => mounted && setSampleLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();

    sample.forEach((business) => {
      const name = business.city?.trim();

      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    });

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  }, [sample]);

  const trending = useMemo(() => {
    const counts = new Map<BusinessCategory, number>();

    sample.forEach((business) => counts.set(business.category, (counts.get(business.category) ?? 0) + 1));

    return [...counts.entries()]
      .filter(([value]) => value !== "OTHER")
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ category: value, count }));
  }, [sample]);

  const matches = useCallback(
    (business: Business) =>
      (!category || business.category === category) &&
      (!city || business.city?.toLowerCase() === city.toLowerCase()) &&
      (!openNow || openLabel(business)?.status === "open") &&
      (!query ||
        [business.name, business.tagline, business.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query.toLowerCase()))),
    [category, city, openNow, query],
  );

  // Spotlight first, topped up with verified businesses from the sample.
  const featured = useMemo(() => {
    const pool = dedupeById([...spotlight, ...sample.filter((business) => business.verified)]);

    return pool.filter(matches).slice(0, 12);
  }, [spotlight, sample, matches]);

  const nearby: NearbyItem[] = useMemo(() => {
    const withPlace = sample.filter(
      (business) => matches(business) && (hasCoordinates(business) || business.city || business.address),
    );

    if (!coords) return withPlace.map((business) => ({ business }));

    return withPlace
      .map((business) => ({ business, distanceKm: distanceTo(business) }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [sample, matches, coords, distanceTo]);

  const [nearbyView, setNearbyView] = useState<"list" | "map">("list");

  const dealBusinesses = useMemo(
    () => dedupeById([...spotlight, ...sample, ...businesses]).filter((business) => getActiveDeals(business).length > 0),
    [spotlight, sample, businesses],
  );

  /* ------------------------------------------------------------ mine */

  const signedIn = hasToken();
  const [mine, setMine] = useState<Business[]>([]);
  const [mineLoading, setMineLoading] = useState(signedIn);

  useEffect(() => {
    if (!signedIn) return;

    let mounted = true;

    businessesApi
      .getMine()
      .then((data) => mounted && setMine(data))
      .catch(() => mounted && setMine([]))
      .finally(() => mounted && setMineLoading(false));

    return () => {
      mounted = false;
    };
  }, [signedIn]);

  /* ------------------------------------------------------------- stores */

  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    listStores({ page: 1, pageSize: 8 })
      .then((result) => {
        if (mounted) {
          setStores(
            dedupeById(result.items ?? [])
              .filter((store) => Boolean(store.slug) && store.status !== "suspended" && store.status !== "closed")
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

  /* ------------------------------------------------------------- render */

  const distanceLabel = (business: Business) => {
    const km = distanceTo(business);

    return km !== undefined ? shortDistance(km) : undefined;
  };

  const directoryTitle = category ? getCategoryLabel(category) : hasFilters ? "Search Results" : "All Businesses";
  const resultLabel = loading
    ? "Loading businesses…"
    : `${directory.length}${hasMore ? "+" : ""} ${directory.length === 1 ? "business" : "businesses"}`;

  const rightRail = (
    <>
      <JoinBusinessCard />
      <MyBusinessesCard businesses={mine} loading={mineLoading} signedIn={signedIn} />
      <TrendingCategoriesCard
        counts={trending}
        complete={!sampleLoading && sample.length < SAMPLE_SIZE}
        onSelect={(value) => {
          updateParams({ category: value });
          scrollTo(directoryRef.current);
        }}
      />
      <PromoteBusinessCard />
    </>
  );

  return (
    <BusinessesShell
      rightRail={rightRail}
      onSearch={(text) => {
        setSearchInput(text);
        submitSearch(text);
      }}
    >
      <BusinessesHero
        query={searchInput}
        onQueryChange={setSearchInput}
        onSubmit={() => submitSearch()}
        city={city}
        cities={cities}
        onCityChange={(value) => updateParams({ city: value || undefined, sort: sort === "nearest" ? undefined : searchParams.get("sort") ?? undefined })}
        nearMe={sort === "nearest" && Boolean(coords)}
        locating={locating}
        onNearMe={() => {
          updateParams({ sort: "nearest", city: undefined });
          requestLocation();
        }}
        // No backgroundUrl: business covers carry their own branding (logos,
        // storefront text), so the hero keeps the plain Fockis design.
      />

      <BusinessCategoryBar value={category} onChange={(value) => updateParams({ category: value })} />

      <BusinessFilterBar
        city={city}
        cities={cities}
        onCityChange={(value) => updateParams({ city: value || undefined })}
        sort={sort}
        onSortChange={(value) => updateParams({ sort: value === "featured" ? undefined : value })}
        openNow={openNow}
        onOpenNowChange={(value) => updateParams({ open: value ? "1" : undefined })}
      />

      {sort === "nearest" && locationError && (
        <div className="fkb-alert fkb-alert--warning" role="status">
          <LocateFixed size={16} aria-hidden="true" />
          <span>{locationError}</span>
        </div>
      )}

      <FeaturedBusinessesRail
        businesses={featured}
        loading={spotlightLoading && sampleLoading}
        distanceFor={distanceLabel}
        onViewAll={() => {
          updateParams({ sort: undefined });
          scrollTo(directoryRef.current);
        }}
      />

      <NearbyBusinesses
        items={nearby}
        loading={sampleLoading}
        view={nearbyView}
        onViewChange={setNearbyView}
        hasLocation={Boolean(coords)}
        locating={locating}
        locationError={locationError}
        onRequestLocation={requestLocation}
        center={coords}
        onViewAll={() => {
          updateParams({ sort: "nearest" });
          scrollTo(directoryRef.current);
        }}
      />

      {!hasFilters && dealBusinesses.length > 0 && (
        <div className="fkbd-section fkbd-deals">
          <SpotlightDealsRail businesses={dealBusinesses} title="Deals & Promotions" eyebrow="Current offers" dealsOnly />
        </div>
      )}

      <section className="fkbd-section fkbd-directory" aria-labelledby="fkbd-directory-title" ref={directoryRef}>
        <header className="fkbd-section__head">
          <span className="fkbd-section__box" aria-hidden="true">
            <LayoutGrid size={20} />
          </span>
          <div>
            <h2 id="fkbd-directory-title">{directoryTitle}</h2>
            <p aria-live="polite">
              {resultLabel}
              {query && ` for “${query}”`}
              {city && ` in ${city}`}
              {openNow && " · open now"}
            </p>
          </div>
          {hasFilters && (
            <button type="button" className="fkbd-viewall" onClick={clearFilters}>
              <X size={15} aria-hidden="true" /> Clear filters
            </button>
          )}
        </header>

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
              openNow && !query && !category && !city
                ? "Nothing is open right now among businesses that list their hours."
                : hasFilters
                  ? "Try a different name, category or city."
                  : "Published businesses will appear here. Be the first to add yours."
            }
            actions={
              hasFilters ? (
                <button type="button" className="fkbd-btn fkbd-btn--outline" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to={CREATE_BUSINESS_ROUTE} className="fkbd-btn fkbd-btn--blue">
                  <Plus size={16} aria-hidden="true" /> Add your business
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="fkbd-grid">
              {directory.map((business) => (
                <FeaturedBusinessCard key={business.id} business={business} distance={distanceLabel(business)} />
              ))}
            </div>

            {hasMore && (
              <div className="fkbd-more">
                <button type="button" className="fkbd-loadmore" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore && <Loader2 size={16} className="fkb-spin" aria-hidden="true" />}
                  {loadingMore ? "Loading…" : "Load more businesses"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {!hasFilters && (storesLoading || stores.length > 0) && (
        <section className="fkbd-section" aria-labelledby="fkbd-stores-title">
          <header className="fkbd-section__head">
            <span className="fkbd-section__box" aria-hidden="true">
              <ShoppingBag size={20} />
            </span>
            <div>
              <h2 id="fkbd-stores-title">Shop from Businesses</h2>
              <p>Storefronts selling on Fockis Shop.</p>
            </div>
            <Link to="/shop/stores" className="fkbd-viewall">
              Browse all stores <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </header>

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
    </BusinessesShell>
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
          {[location, store.productCount > 0 ? `${store.productCount} ${store.productCount === 1 ? "product" : "products"}` : ""]
            .filter(Boolean)
            .join(" · ") || "Fockis Shop store"}
        </span>
      </span>

      <ArrowRight size={16} aria-hidden="true" className="fkb-store-tile__arrow" />
    </Link>
  );
}
