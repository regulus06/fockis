import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  SlidersHorizontal,
  Map as MapIcon,
  List,
} from "lucide-react";

import CategoryTabs from "../components/CategoryTabs";
import StayCard from "../components/StayCard";
import RestaurantCard from "../components/RestaurantCard";
import CarCard from "../components/CarCard";
import MapDiscovery from "../components/MapDiscovery";

import {
  listingsApi,
  type ListingType,
  type TravelListing,
} from "../services/listingsApi";

import "../styles/TravelSearchPage.scss";

/* ============================================================
   TYPES
   ============================================================ */

type SearchCategory =
  | "stays"
  | "restaurants"
  | "cars";

type ViewMode = "list" | "map";

interface SearchListing extends TravelListing {
  id: string;
}

interface MapResult {
  id: string;
  type: string;
  name: string;
  meta: string;
  image: string;
  top: string;
  left: string;
  pinEmoji: string;
  amber?: boolean;
}

interface ListingSearchResponse {
  items?: unknown;
  total?: number;
  page?: number;
  limit?: number;
  data?: unknown;
}

/* ============================================================
   CATEGORIES
   ============================================================ */

const CATEGORIES: Array<{
  id: SearchCategory;
  label: string;
}> = [
  {
    id: "stays",
    label: "🏨 Stays",
  },
  {
    id: "restaurants",
    label: "🍽️ Restaurants",
  },
  {
    id: "cars",
    label: "🚗 Cars",
  },
];

/* ============================================================
   DEFAULT IMAGES
   ============================================================ */

const DEFAULT_STAY_IMAGE =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500";

const DEFAULT_RESTAURANT_IMAGE =
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500";

const DEFAULT_CAR_IMAGE =
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=500";

/* ============================================================
   SAFE VALUE HELPERS
   ============================================================ */

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function getMetadata(
  listing: TravelListing,
): Record<string, unknown> {
  return isRecord(listing.metadata)
    ? listing.metadata
    : {};
}

function getMetadataValue(
  listing: TravelListing,
  key: string,
): unknown {
  return getMetadata(listing)[key];
}

function getMetadataString(
  listing: TravelListing,
  key: string,
): string | undefined {
  const value = getMetadataValue(
    listing,
    key,
  );

  return typeof value === "string"
    ? value
    : undefined;
}

function getMetadataNumber(
  listing: TravelListing,
  key: string,
): number | undefined {
  const value = getMetadataValue(
    listing,
    key,
  );

  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(
    numberValue,
  )
    ? numberValue
    : undefined;
}

function getMetadataStringArray(
  listing: TravelListing,
  key: string,
): string[] {
  const value = getMetadataValue(
    listing,
    key,
  );

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item === "string",
  );
}

function toStringArray(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item === "string",
  );
}

function getListingFeatures(
  listing: TravelListing,
): string[] {
  const value = (
    listing as TravelListing & {
      features?: unknown;
    }
  ).features;

  return toStringArray(value);
}

/* ============================================================
   LISTING HELPERS
   ============================================================ */

function getListingId(
  listing: TravelListing,
): string {
  return String(
    listing._id ??
      listing.id ??
      "",
  );
}

function getListingImage(
  listing: TravelListing,
  fallback: string,
): string {
  if (
    Array.isArray(listing.images)
  ) {
    const image =
      listing.images.find(
        (
          value,
        ): value is string =>
          typeof value === "string" &&
          value.trim().length > 0,
      );

    if (image) {
      return image;
    }
  }

  const metadataImage =
    getMetadataString(
      listing,
      "image",
    );

  if (metadataImage) {
    return metadataImage;
  }

  const coverImage =
    getMetadataString(
      listing,
      "coverImage",
    );

  if (coverImage) {
    return coverImage;
  }

  return fallback;
}

function getListingPrice(
  listing: TravelListing,
): number {
  const price =
    Number(listing.price);

  return Number.isFinite(price)
    ? price
    : 0;
}

function getListingRating(
  listing: TravelListing,
): number {
  const rating =
    Number(listing.rating);

  return Number.isFinite(rating)
    ? rating
    : 0;
}

function getListingLocation(
  listing: TravelListing,
): string {
  const city =
    typeof listing.city === "string"
      ? listing.city.trim()
      : "";

  const country =
    typeof listing.country === "string"
      ? listing.country.trim()
      : "";

  if (city && country) {
    return `${city}, ${country}`;
  }

  if (city) {
    return city;
  }

  if (country) {
    return country;
  }

  if (
    typeof listing.address ===
      "string" &&
    listing.address.trim()
  ) {
    return listing.address.trim();
  }

  return "Location unavailable";
}

function getListingCategory(
  listing: TravelListing,
): string {
  const listingWithCategory =
    listing as TravelListing & {
      category?: unknown;
    };

  if (
    typeof listingWithCategory.category ===
      "string" &&
    listingWithCategory.category.trim()
  ) {
    return listingWithCategory.category.trim();
  }

  const metadataCategory =
    getMetadataString(
      listing,
      "category",
    );

  if (metadataCategory) {
    return metadataCategory;
  }

  const vehicleCategory =
    getMetadataString(
      listing,
      "vehicleCategory",
    );

  if (vehicleCategory) {
    return vehicleCategory;
  }

  return "Vehicle";
}

function getAmenities(
  listing: TravelListing,
): string {
  const amenities =
    toStringArray(
      listing.amenities,
    );

  if (amenities.length > 0) {
    return amenities
      .slice(0, 3)
      .join(" · ");
  }

  const features =
    getListingFeatures(
      listing,
    );

  if (features.length > 0) {
    return features
      .slice(0, 3)
      .join(" · ");
  }

  const tags =
    toStringArray(
      listing.tags,
    );

  if (tags.length > 0) {
    return tags
      .slice(0, 3)
      .join(" · ");
  }

  return "Travel services available";
}

function getSearchableAttributes(
  listing: TravelListing,
): string {
  const amenities =
    toStringArray(
      listing.amenities,
    );

  const features =
    getListingFeatures(
      listing,
    );

  const tags =
    toStringArray(
      listing.tags,
    );

  return [
    ...amenities,
    ...features,
    ...tags,
  ]
    .join(" ")
    .toLowerCase();
}

/* ============================================================
   PRICE FORMATTING
   ============================================================ */

function formatPrice(
  listing: TravelListing,
  fallbackUnit: string,
): string {
  const price =
    getListingPrice(listing);

  if (price <= 0) {
    return "Price unavailable";
  }

  const currency =
    typeof listing.currency ===
      "string" &&
    listing.currency.trim()
      ? listing.currency.trim()
      : "USD";

  let formatted: string;

  try {
    formatted =
      new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        },
      ).format(price);
  } catch {
    formatted =
      `$${Math.round(price)}`;
  }

  const priceUnit =
    typeof listing.priceUnit ===
      "string" &&
    listing.priceUnit.trim()
      ? listing.priceUnit.trim()
      : getMetadataString(
          listing,
          "priceUnit",
        ) || fallbackUnit;

  return priceUnit
    ? `${formatted}/${priceUnit}`
    : formatted;
}

/* ============================================================
   RESPONSE NORMALIZATION
   ============================================================ */

function normalizeListings(
  value: unknown,
): SearchListing[] {
  if (Array.isArray(value)) {
    return value
      .filter(
        (
          item,
        ): item is TravelListing =>
          isRecord(item),
      )
      .map(
        (
          listing,
        ): SearchListing => ({
          ...listing,
          id: getListingId(
            listing,
          ),
        }),
      )
      .filter(
        (
          listing,
        ) =>
          listing.id.length > 0,
      );
  }

  if (isRecord(value)) {
    const response =
      value as ListingSearchResponse;

    if (
      Array.isArray(
        response.items,
      )
    ) {
      return normalizeListings(
        response.items,
      );
    }

    if (
      response.data !== undefined
    ) {
      return normalizeListings(
        response.data,
      );
    }
  }

  return [];
}

function normalizeTotal(
  value: unknown,
): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const response =
    value as ListingSearchResponse;

  if (
    typeof response.total ===
      "number" &&
    Number.isFinite(
      response.total,
    )
  ) {
    return response.total;
  }

  if (
    isRecord(response.data)
  ) {
    const nested =
      response.data as ListingSearchResponse;

    if (
      typeof nested.total ===
        "number" &&
      Number.isFinite(
        nested.total,
      )
    ) {
      return nested.total;
    }
  }

  return null;
}

/* ============================================================
   CATEGORY MAPPING
   ============================================================ */

function getListingTypeForCategory(
  category: SearchCategory,
): ListingType {
  switch (category) {
    case "restaurants":
      return "restaurant";

    case "cars":
      return "car";

    case "stays":
    default:
      return "stay";
  }
}

/* ============================================================
   CARD PROPS
   ============================================================ */

function buildStayProps(
  listing: SearchListing,
) {
  return {
    id: listing.id,
    name: listing.name,
    rating:
      getListingRating(
        listing,
      ),
    location:
      getListingLocation(
        listing,
      ),
    amenities:
      getAmenities(listing),
    price:
      getListingPrice(listing),
    image:
      getListingImage(
        listing,
        DEFAULT_STAY_IMAGE,
      ),
  };
}

function buildRestaurantProps(
  listing: SearchListing,
) {
  const cuisine =
    getMetadataString(
      listing,
      "cuisine",
    ) ||
    getMetadataString(
      listing,
      "cuisineType",
    ) ||
    getMetadataString(
      listing,
      "cuisineName",
    ) ||
    toStringArray(
      listing.tags,
    )
      .slice(0, 2)
      .join(" · ") ||
    "Restaurant";

  const priceRange =
    getMetadataString(
      listing,
      "priceRange",
    ) ||
    getMetadataString(
      listing,
      "priceLevel",
    ) ||
    "$$";

  const availableTimes =
    getMetadataStringArray(
      listing,
      "availableTimes",
    );

  const times =
    availableTimes.length > 0
      ? availableTimes
      : getMetadataStringArray(
          listing,
          "times",
        );

  return {
    id: listing.id,
    name: listing.name,
    cuisine,
    location:
      typeof listing.city ===
        "string" &&
      listing.city.trim()
        ? listing.city.trim()
        : getListingLocation(
            listing,
          ),
    image:
      getListingImage(
        listing,
        DEFAULT_RESTAURANT_IMAGE,
      ),
    rating:
      getListingRating(
        listing,
      ),
    priceRange,
    times,
  };
}

function buildCarProps(
  listing: SearchListing,
) {
  const category =
    getListingCategory(
      listing,
    );

  const metadataSeats =
    getMetadataNumber(
      listing,
      "seats",
    ) ??
    getMetadataNumber(
      listing,
      "seatCount",
    );

  const listingCapacity =
    Number(listing.capacity);

  const seats =
    metadataSeats ??
    (Number.isFinite(
      listingCapacity,
    )
      ? listingCapacity
      : 5);

  const transmissionValue =
    getMetadataString(
      listing,
      "transmission",
    );

  const transmission =
    transmissionValue
      ?.toLowerCase()
      .includes("manual")
      ? ("Manual" as const)
      : ("Automatic" as const);

  const bags =
    getMetadataNumber(
      listing,
      "bags",
    ) ??
    getMetadataNumber(
      listing,
      "luggage",
    ) ??
    2;

  return {
    id: listing.id,
    name: listing.name,
    category,
    emoji: "🚗",
    seats,
    transmission,
    bags,
    pricePerDay:
      getListingPrice(
        listing,
      ),
  };
}

/* ============================================================
   MAP
   ============================================================ */

function getMapPosition(
  index: number,
): {
  top: string;
  left: string;
} {
  const positions: Array<
    [string, string]
  > = [
    ["38%", "32%"],
    ["55%", "52%"],
    ["28%", "60%"],
    ["65%", "24%"],
    ["70%", "68%"],
    ["42%", "75%"],
    ["22%", "48%"],
    ["76%", "40%"],
    ["35%", "58%"],
    ["58%", "20%"],
  ];

  const position =
    positions[
      index % positions.length
    ];

  return {
    top: position[0],
    left: position[1],
  };
}

function buildMapResults(
  listings: SearchListing[],
): MapResult[] {
  return listings
    .slice(0, 20)
    .map(
      (
        listing,
        index,
      ): MapResult => {
        const position =
          getMapPosition(
            index,
          );

        if (
          listing.type ===
          "restaurant"
        ) {
          return {
            id: listing.id,
            type: "🍽️ Restaurant",
            name: listing.name,
            meta: `${getListingLocation(
              listing,
            )} · ${
              getMetadataString(
                listing,
                "priceRange",
              ) || "$$"
            }`,
            image:
              getListingImage(
                listing,
                DEFAULT_RESTAURANT_IMAGE,
              ),
            top: position.top,
            left: position.left,
            pinEmoji: "🍽️",
            amber: true,
          };
        }

        if (
          listing.type ===
          "car"
        ) {
          return {
            id: listing.id,
            type: "🚗 Car rental",
            name: listing.name,
            meta: `${getListingLocation(
              listing,
            )} · ${formatPrice(
              listing,
              "day",
            )}`,
            image:
              getListingImage(
                listing,
                DEFAULT_CAR_IMAGE,
              ),
            top: position.top,
            left: position.left,
            pinEmoji: "🚗",
          };
        }

        return {
          id: listing.id,
          type: "🏨 Stay",
          name: listing.name,
          meta: `${getListingLocation(
            listing,
          )} · ${formatPrice(
            listing,
            "night",
          )}`,
          image:
            getListingImage(
              listing,
              DEFAULT_STAY_IMAGE,
            ),
          top: position.top,
          left: position.left,
          pinEmoji: "🏨",
        };
      },
    );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function TravelSearchPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const initialCategory =
    searchParams.get(
      "category",
    );

  const getInitialCategory =
    (): SearchCategory => {
      if (
        initialCategory ===
        "restaurants"
      ) {
        return "restaurants";
      }

      if (
        initialCategory ===
        "cars"
      ) {
        return "cars";
      }

      return "stays";
    };

  const [
    category,
    setCategory,
  ] =
    useState<SearchCategory>(
      getInitialCategory,
    );

  const [
    view,
    setView,
  ] = useState<ViewMode>(
    "list",
  );

  const [
    listings,
    setListings,
  ] = useState<SearchListing[]>(
    [],
  );

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    price,
    setPrice,
  ] = useState(500);

  const [
    rating45,
    setRating45,
  ] = useState(false);

  const [
    rating40,
    setRating40,
  ] = useState(false);

  const [
    wifiOnly,
    setWifiOnly,
  ] = useState(false);

  const [
    poolOnly,
    setPoolOnly,
  ] = useState(false);

  const destination =
    searchParams.get(
      "destination",
    )?.trim() ||
    "Pétion-Ville, Haiti";

  const city =
    searchParams.get(
      "city",
    )?.trim() || undefined;

  const country =
    searchParams.get(
      "country",
    )?.trim() || undefined;

  /* ==========================================================
     LOAD REAL BACKEND DATA
     ========================================================== */

  const loadListings =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const type =
            getListingTypeForCategory(
              category,
            );

          const response =
            await listingsApi.search(
              {
                type,
                city,
                country,
                limit: 50,
                skip: 0,
              },
            );

          const normalized =
            normalizeListings(
              response,
            );

          const responseTotal =
            normalizeTotal(
              response,
            );

          setListings(
            normalized,
          );

          setTotal(
            responseTotal ??
              normalized.length,
          );
        } catch (err) {
          console.error(
            "[Fockis Travel] Failed to load listings:",
            err,
          );

          setListings([]);
          setTotal(0);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load travel listings.",
          );
        } finally {
          setLoading(false);
        }
      },
      [
        category,
        city,
        country,
      ],
    );

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  /* ==========================================================
     KEEP URL CATEGORY IN SYNC
     ========================================================== */

  useEffect(() => {
    const currentCategory =
      searchParams.get(
        "category",
      );

    if (
      currentCategory ===
      category
    ) {
      return;
    }

    const next =
      new URLSearchParams(
        searchParams,
      );

    next.set(
      "category",
      category,
    );

    setSearchParams(
      next,
      {
        replace: true,
      },
    );
  }, [
    category,
    searchParams,
    setSearchParams,
  ]);

  /* ==========================================================
     LOCAL FILTERING
     ========================================================== */

  const filteredListings =
    useMemo(() => {
      return listings.filter(
        (listing) => {
          const listingPrice =
            getListingPrice(
              listing,
            );

          if (
            listingPrice >
            price
          ) {
            return false;
          }

          const rating =
            getListingRating(
              listing,
            );

          if (
            rating45 &&
            rating < 4.5
          ) {
            return false;
          }

          if (
            rating40 &&
            rating < 4.0
          ) {
            return false;
          }

          const searchable =
            getSearchableAttributes(
              listing,
            );

          if (
            wifiOnly &&
            !searchable.includes(
              "wifi",
            ) &&
            !searchable.includes(
              "wi-fi",
            )
          ) {
            return false;
          }

          if (
            poolOnly &&
            !searchable.includes(
              "pool",
            )
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      listings,
      price,
      rating45,
      rating40,
      wifiOnly,
      poolOnly,
    ]);

  const mapResults =
    useMemo(
      () =>
        buildMapResults(
          filteredListings,
        ),
      [filteredListings],
    );

  const resultsCount =
    filteredListings.length;

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div className="travel-search-page">
      <section className="search-page-head tight">
        <div className="wrap">
          <div className="eyebrow">
            Search results
          </div>

          <h1 className="search-page-title">
            {destination}
          </h1>
        </div>
      </section>

      <section>
        <div className="wrap">
          <CategoryTabs
            categories={
              CATEGORIES
            }
            activeId={category}
            onChange={(id) =>
              setCategory(
                id as SearchCategory,
              )
            }
            bordered
          />

          <div className="search-page-body">
            {/* ==================================================
                FILTERS
            ================================================== */}

            <aside className="filters-panel ft-hide-mobile">
              <div className="filters-panel__group">
                <h4>
                  Price range
                </h4>

                <input
                  className="price-range"
                  type="range"
                  min={0}
                  max={500}
                  value={price}
                  onChange={(
                    event,
                  ) =>
                    setPrice(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  aria-label="Maximum price"
                />

                <div className="price-range-values">
                  <span>
                    $0
                  </span>

                  <span>
                    ${price}
                  </span>
                </div>
              </div>

              <div className="filters-panel__group">
                <h4>
                  Rating
                </h4>

                <label className="ft-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      rating45
                    }
                    onChange={(
                      event,
                    ) =>
                      setRating45(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    4.5+
                  </span>
                </label>

                <label className="ft-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      rating40
                    }
                    onChange={(
                      event,
                    ) =>
                      setRating40(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    4.0+
                  </span>
                </label>
              </div>

              <div className="filters-panel__group filters-panel__group--last">
                <h4>
                  Amenities
                </h4>

                <label className="ft-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      wifiOnly
                    }
                    onChange={(
                      event,
                    ) =>
                      setWifiOnly(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    Free Wi-Fi
                  </span>
                </label>

                <label className="ft-checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      poolOnly
                    }
                    onChange={(
                      event,
                    ) =>
                      setPoolOnly(
                        event.target.checked,
                      )
                    }
                  />

                  <span>
                    Pool
                  </span>
                </label>
              </div>
            </aside>

            {/* ==================================================
                RESULTS
            ================================================== */}

            <div className="search-results">
              <div className="results-toolbar">
                <span className="results-count">
                  {loading
                    ? "Loading results..."
                    : `${resultsCount}${
                        total >
                          resultsCount
                          ? ` of ${total}`
                          : ""
                      } results`}
                </span>

                <div className="results-view-controls">
                  <span className="ft-pill">
                    <SlidersHorizontal
                      size={13}
                      aria-hidden="true"
                    />

                    Filters
                  </span>

                  <button
                    type="button"
                    className={`ft-pill${
                      view ===
                      "list"
                        ? " ft-badge--petrol"
                        : ""
                    }`}
                    onClick={() =>
                      setView(
                        "list",
                      )
                    }
                    aria-pressed={
                      view ===
                      "list"
                    }
                    aria-label="Show list view"
                  >
                    <List
                      size={13}
                      aria-hidden="true"
                    />

                    <span>
                      List
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`ft-pill${
                      view ===
                      "map"
                        ? " ft-badge--petrol"
                        : ""
                    }`}
                    onClick={() =>
                      setView(
                        "map",
                      )
                    }
                    aria-pressed={
                      view ===
                      "map"
                    }
                    aria-label="Show map view"
                  >
                    <MapIcon
                      size={13}
                      aria-hidden="true"
                    />

                    <span>
                      Map
                    </span>
                  </button>
                </div>
              </div>

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div
                  className="search-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* =================================================
                  MAP
              ================================================= */}

              {view === "map" ? (
                <MapDiscovery
                  areaLabel={
                    destination
                  }
                  results={
                    mapResults
                  }
                />
              ) : loading ? (
                /* ===============================================
                   LOADING
                =============================================== */

                <div
                  className="results-grid"
                  aria-busy="true"
                  aria-label="Loading travel listings"
                >
                  {[1, 2, 3].map(
                    (item) => (
                      <div
                        key={item}
                        className="search-loading-card"
                      />
                    ),
                  )}
                </div>
              ) : filteredListings.length ===
                0 ? (
                /* ===============================================
                   EMPTY
                =============================================== */

                <div className="search-empty-state">
                  <div
                    className="search-empty-state__icon"
                    aria-hidden="true"
                  >
                    🔎
                  </div>

                  <h3>
                    No results found
                  </h3>

                  <p>
                    Try changing
                    your filters
                    or searching
                    another
                    destination.
                  </p>
                </div>
              ) : (
                /* ===============================================
                   LIVE RESULTS
                =============================================== */

                <div className="results-grid">
                  {category ===
                    "stays" &&
                    filteredListings.map(
                      (
                        listing,
                      ) => (
                        <StayCard
                          key={
                            listing.id
                          }
                          {...buildStayProps(
                            listing,
                          )}
                        />
                      ),
                    )}

                  {category ===
                    "restaurants" &&
                    filteredListings.map(
                      (
                        listing,
                      ) => {
                        const props =
                          buildRestaurantProps(
                            listing,
                          );

                        return (
                          <RestaurantCard
                            key={
                              listing.id
                            }
                            {...props}
                            availableTimes={
                              props.times
                            }
                          />
                        );
                      },
                    )}

                  {category ===
                    "cars" &&
                    filteredListings.map(
                      (
                        listing,
                      ) => (
                        <CarCard
                          key={
                            listing.id
                          }
                          {...buildCarProps(
                            listing,
                          )}
                        />
                      ),
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}