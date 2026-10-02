import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import {
  AlertCircle,
  Building2,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  Filter,
  Hotel,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Store,
  Ticket,
  Trash2,
  Utensils,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { travelApi } from "../services/travelApi";

/* ============================================================================
   TYPES
============================================================================ */

type ListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "published"
  | "rejected"
  | "suspended"
  | string;

interface TravelListing {
  _id?: string;
  id?: string;

  partnerId?: string;
  userId?: string;

  title?: string;
  name?: string;
  businessName?: string;

  category?: string;
  categories?: string[];

  description?: string;

  status?: ListingStatus;

  city?: string;
  state?: string;
  country?: string;
  address?: string;

  price?: number;
  priceFrom?: number;
  currency?: string;
  priceUnit?: string;

  image?: string;
  imageUrl?: string;
  coverImage?: string;
  images?: string[];

  rejectionReason?: string;
  reviewNote?: string;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

interface ListingsResponse {
  listings?: TravelListing[];
  data?: TravelListing[] | { listings?: TravelListing[] };
  items?: TravelListing[];
}

/* ============================================================================
   CATEGORY CONFIGURATION
============================================================================ */

const CATEGORY_CONFIG: Record<
  string,
  {
    label: string;
    icon: ElementType;
    aliases: string[];
  }
> = {
  hotels: {
    label: "Hotels & Stays",
    icon: Hotel,
    aliases: [
      "Hotels & Stays",
      "Hotel",
      "Hotels",
      "Stay",
      "Stays",
      "Lodging",
    ],
  },

  vacation_rentals: {
    label: "Vacation Rentals",
    icon: Building2,
    aliases: [
      "Vacation Rentals",
      "Vacation Rental",
      "Airbnb",
      "Airbnb / Vacation Rental",
      "Short-Term Rental",
      "Apartment",
      "Villa",
    ],
  },

  restaurants: {
    label: "Restaurants",
    icon: Utensils,
    aliases: [
      "Restaurants",
      "Restaurant",
      "Dining",
      "Food",
    ],
  },

  cars: {
    label: "Car Rental",
    icon: Car,
    aliases: [
      "Car Rental",
      "Car Rentals",
      "Cars",
      "Vehicle Rental",
      "Vehicles",
    ],
  },

  experiences: {
    label: "Experiences",
    icon: Ticket,
    aliases: [
      "Experiences",
      "Experience",
      "Tours",
      "Tour",
      "Activities",
      "Activity",
    ],
  },

  meetings: {
    label: "Meeting Spaces",
    icon: Building2,
    aliases: [
      "Meeting Spaces",
      "Meeting Space",
      "Meetings",
      "Conference Space",
      "Conference Spaces",
    ],
  },

  transportation: {
    label: "Transportation",
    icon: MapPin,
    aliases: [
      "Transportation",
      "Transport",
      "Transfers",
      "Transfer",
      "Airport Transfer",
      "Shuttle",
    ],
  },

  flights: {
    label: "Flights / Air Travel",
    icon: Store,
    aliases: [
      "Flights",
      "Flight",
      "Air Travel",
      "Airline",
    ],
  },

  events: {
    label: "Events",
    icon: Ticket,
    aliases: [
      "Events",
      "Event",
      "Entertainment",
    ],
  },

  resorts: {
    label: "Resorts",
    icon: Hotel,
    aliases: [
      "Resorts",
      "Resort",
    ],
  },

  cruises: {
    label: "Cruises",
    icon: Store,
    aliases: [
      "Cruises",
      "Cruise",
    ],
  },

  camping: {
    label: "Camping & Outdoor",
    icon: MapPin,
    aliases: [
      "Camp",
      "Camping",
      "Camping & Outdoor",
      "Outdoor Stay",
    ],
  },
};

/* ============================================================================
   STATUS CONFIGURATION
============================================================================ */

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: ElementType;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: Edit3,
    className: "draft",
  },

  pending_review: {
    label: "Pending Review",
    icon: Clock3,
    className: "pending",
  },

  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "approved",
  },

  published: {
    label: "Published",
    icon: CheckCircle2,
    className: "published",
  },

  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "rejected",
  },

  suspended: {
    label: "Suspended",
    icon: AlertCircle,
    className: "suspended",
  },
};

/* ============================================================================
   HELPERS
============================================================================ */

function getListingId(listing: TravelListing): string {
  const id = listing._id ?? listing.id ?? "";

  return typeof id === "string" || typeof id === "number"
    ? String(id)
    : "";
}

function getListingTitle(listing: TravelListing): string {
  const candidates = [
    listing.title,
    listing.name,
    listing.businessName,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "Untitled listing";
}

function getListingCategory(listing: TravelListing): string {
  if (
    Array.isArray(listing.categories) &&
    listing.categories.length > 0
  ) {
    const first = listing.categories.find(
      (category) =>
        typeof category === "string" &&
        category.trim().length > 0,
    );

    if (first) {
      return first.trim();
    }
  }

  if (
    typeof listing.category === "string" &&
    listing.category.trim()
  ) {
    return listing.category.trim();
  }

  return "Other";
}

function getCategoryConfig(category: string) {
  const normalized = category.trim().toLowerCase();

  for (const config of Object.values(CATEGORY_CONFIG)) {
    const matches = config.aliases.some(
      (alias) =>
        alias.trim().toLowerCase() === normalized,
    );

    if (matches) {
      return config;
    }
  }

  return {
    label: category || "Other",
    icon: Store,
    aliases: [],
  };
}

function getStatusConfig(status?: string) {
  const normalizedStatus =
    typeof status === "string" && status.trim()
      ? status.trim().toLowerCase()
      : "draft";

  return (
    STATUS_CONFIG[normalizedStatus] ?? {
      label: normalizedStatus
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) =>
          char.toUpperCase(),
        ),
      icon: Clock3,
      className: "draft",
    }
  );
}

function normalizeMediaUrl(value?: string): string | null {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const normalized = value.trim();

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  return `/${normalized}`;
}

function getListingImage(
  listing: TravelListing,
): string | null {
  const candidates = [
    listing.coverImage,
    listing.imageUrl,
    listing.image,
    ...(Array.isArray(listing.images)
      ? listing.images
      : []),
  ];

  for (const value of candidates) {
    const normalized = normalizeMediaUrl(
      typeof value === "string"
        ? value
        : undefined,
    );

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function formatPrice(
  listing: TravelListing,
): string | null {
  const rawPrice =
    listing.priceFrom ??
    listing.price ??
    null;

  if (
    typeof rawPrice !== "number" ||
    !Number.isFinite(rawPrice)
  ) {
    return null;
  }

  const currency =
    typeof listing.currency === "string" &&
    listing.currency.trim()
      ? listing.currency.trim().toUpperCase()
      : "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(rawPrice);
  } catch {
    return `${currency} ${rawPrice.toFixed(2)}`;
  }
}

function formatDate(value?: string): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = error.message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  return fallback;
}

function extractListings(
  result: unknown,
): TravelListing[] {
  if (Array.isArray(result)) {
    return result as TravelListing[];
  }

  if (!result || typeof result !== "object") {
    return [];
  }

  const response = result as ListingsResponse;

  if (Array.isArray(response.listings)) {
    return response.listings;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  if (Array.isArray(response.data)) {
    return response.data as TravelListing[];
  }

  if (
    response.data &&
    typeof response.data === "object" &&
    Array.isArray(response.data.listings)
  ) {
    return response.data.listings;
  }

  return [];
}

/* ============================================================================
   PAGE
============================================================================ */

export default function TravelPartnerListingsPage() {
  const [listings, setListings] = useState<
    TravelListing[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadListings = useCallback(
    async (options?: { refresh?: boolean }) => {
      const isRefresh =
        options?.refresh === true;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setNotice("");

      try {
        const result = await travelApi.get<
          TravelListing[] | ListingsResponse
        >(
          "/travel/partners/listings",
        );

        setListings(
          extractListings(result),
        );
      } catch (err) {
        console.error(
          "Unable to load travel listings:",
          err,
        );

        setError(
          getErrorMessage(
            err,
            "Unable to load your travel listings. Please try again.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const availableCategories = useMemo(() => {
    const values = new Set<string>();

    listings.forEach((listing) => {
      if (
        Array.isArray(listing.categories)
      ) {
        listing.categories.forEach(
          (category) => {
            if (
              typeof category === "string" &&
              category.trim()
            ) {
              values.add(
                category.trim(),
              );
            }
          },
        );
      }

      if (
        typeof listing.category === "string" &&
        listing.category.trim()
      ) {
        values.add(
          listing.category.trim(),
        );
      }
    });

    return Array.from(values).sort(
      (a, b) =>
        a.localeCompare(b),
    );
  }, [listings]);

  const availableStatuses = useMemo(() => {
    const values = new Set<string>();

    listings.forEach((listing) => {
      const status =
        typeof listing.status === "string"
          ? listing.status.trim()
          : "";

      if (status) {
        values.add(status);
      }
    });

    return Array.from(values).sort(
      (a, b) =>
        a.localeCompare(b),
    );
  }, [listings]);

  const filteredListings = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return listings.filter(
      (listing) => {
        const title =
          getListingTitle(listing);

        const category =
          getListingCategory(listing);

        const searchableText = [
          title,
          category,
          listing.city,
          listing.state,
          listing.country,
          listing.address,
          listing.description,
          listing.businessName,
        ]
          .filter(
            (
              value,
            ): value is string =>
              typeof value === "string",
          )
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query ||
          searchableText.includes(
            query,
          );

        const matchesCategory =
          categoryFilter === "all" ||
          category.toLowerCase() ===
            categoryFilter.toLowerCase();

        const normalizedStatus =
          typeof listing.status ===
            "string" &&
          listing.status.trim()
            ? listing.status
                .trim()
                .toLowerCase()
            : "draft";

        const matchesStatus =
          statusFilter === "all" ||
          normalizedStatus ===
            statusFilter.toLowerCase();

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );
      },
    );
  }, [
    listings,
    search,
    categoryFilter,
    statusFilter,
  ]);

  const stats = useMemo(() => {
    let drafts = 0;
    let pending = 0;
    let published = 0;
    let rejected = 0;

    listings.forEach(
      (listing) => {
        const status =
          typeof listing.status ===
            "string"
            ? listing.status
                .trim()
                .toLowerCase()
            : "draft";

        switch (status) {
          case "pending_review":
            pending += 1;
            break;

          case "published":
          case "approved":
            published += 1;
            break;

          case "rejected":
            rejected += 1;
            break;

          case "draft":
          default:
            drafts += 1;
            break;
        }
      },
    );

    return {
      total: listings.length,
      drafts,
      pending,
      published,
      rejected,
    };
  }, [listings]);

  async function handleDelete(
    listing: TravelListing,
  ) {
    const id =
      getListingId(listing);

    if (!id) {
      setError(
        "This listing does not have a valid ID.",
      );
      return;
    }

    const title =
      getListingTitle(listing);

    const confirmed =
      window.confirm(
        `Delete "${title}"?\n\nThis action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      await travelApi.delete(
        `/travel/partners/listings/${encodeURIComponent(
          id,
        )}`,
      );

      setListings(
        (previous) =>
          previous.filter(
            (item) =>
              getListingId(item) !== id,
          ),
      );

      setNotice(
        `"${title}" was deleted successfully.`,
      );
    } catch (err) {
      console.error(
        "Unable to delete listing:",
        err,
      );

      setError(
        getErrorMessage(
          err,
          "Unable to delete this listing. Please try again.",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    categoryFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="travel-partner-listings-page">
      <section
        style={{
          padding: "46px 0 30px",
          background:
            "linear-gradient(135deg, var(--paper) 0%, #f7f1e5 100%)",
          borderBottom:
            "1px solid rgba(22, 47, 48, 0.12)",
        }}
      >
        <div className="wrap">
          <Link
            to="/travel/management"
            className="section-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 22,
            }}
          >
            <ChevronRight
              size={16}
              style={{
                transform:
                  "rotate(180deg)",
              }}
            />

            Back to Management
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent:
                "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                maxWidth: 760,
              }}
            >
              <div className="eyebrow">
                FOCKIS TRAVEL PARTNER
              </div>

              <h1
                style={{
                  marginTop: 9,
                  fontSize:
                    "clamp(34px, 5vw, 54px)",
                  lineHeight: 1.03,
                  letterSpacing:
                    "-0.04em",
                }}
              >
                My listings
              </h1>

              <p
                style={{
                  marginTop: 14,
                  maxWidth: 690,
                  color: "var(--slate)",
                  fontSize: 16,
                  lineHeight: 1.6,
                }}
              >
                Create, edit, review and
                manage all of your Fockis
                Travel listings from one
                place.
              </p>
            </div>

            <Link
              to="/travel/partner/listings/new"
              className="btn btn-amber"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Plus size={17} />
              Add a listing
            </Link>
          </div>
        </div>
      </section>

      <section className="tight">
        <div className="wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(175px, 1fr))",
              gap: 14,
            }}
          >
            <ListingStat
              value={stats.total}
              label="Total listings"
            />

            <ListingStat
              value={stats.published}
              label="Published"
            />

            <ListingStat
              value={stats.pending}
              label="Pending review"
            />

            <ListingStat
              value={stats.drafts}
              label="Drafts"
            />

            <ListingStat
              value={stats.rejected}
              label="Rejected"
            />
          </div>
        </div>
      </section>

      {(error || notice) && (
        <section
          style={{
            paddingTop: 0,
          }}
        >
          <div className="wrap">
            {error && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems:
                    "flex-start",
                  gap: 10,
                  padding: 14,
                  borderRadius: 12,
                  background: "#fff4f4",
                  border:
                    "1px solid #efb8b8",
                  color: "#9b2226",
                  marginBottom: 12,
                }}
              >
                <AlertCircle
                  size={18}
                  style={{
                    flexShrink: 0,
                  }}
                />

                <span>{error}</span>

                <button
                  type="button"
                  onClick={() =>
                    setError("")
                  }
                  aria-label="Dismiss error"
                  style={{
                    marginLeft: "auto",
                    border: 0,
                    background:
                      "transparent",
                    cursor: "pointer",
                    color: "inherit",
                  }}
                >
                  <XCircle size={17} />
                </button>
              </div>
            )}

            {notice && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 10,
                  padding: 14,
                  borderRadius: 12,
                  background: "#f1faf4",
                  border:
                    "1px solid rgba(47,125,85,0.25)",
                  color: "#2f7d55",
                  marginBottom: 12,
                }}
              >
                <CheckCircle2
                  size={18}
                />

                <span>{notice}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="tight">
        <div className="wrap">
          <div
            className="panel"
            style={{
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 8,
                marginBottom: 14,
                fontWeight: 700,
              }}
            >
              <Filter size={17} />
              Filter listings
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 2fr) repeat(2, minmax(170px, 1fr)) auto",
                gap: 10,
                alignItems:
                  "center",
              }}
            >
              <div
                style={{
                  position:
                    "relative",
                }}
              >
                <Search
                  size={17}
                  style={{
                    position:
                      "absolute",
                    left: 13,
                    top: "50%",
                    transform:
                      "translateY(-50%)",
                    color:
                      "var(--slate)",
                    pointerEvents:
                      "none",
                  }}
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search listings..."
                  aria-label="Search listings"
                  style={{
                    width: "100%",
                    paddingLeft: 39,
                  }}
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value,
                  )
                }
                aria-label="Filter by category"
              >
                <option value="all">
                  All categories
                </option>

                {availableCategories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {
                        getCategoryConfig(
                          category,
                        ).label
                      }
                    </option>
                  ),
                )}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                aria-label="Filter by status"
              >
                <option value="all">
                  All statuses
                </option>

                {availableStatuses.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {
                        getStatusConfig(
                          status,
                        ).label
                      }
                    </option>
                  ),
                )}
              </select>

              {hasActiveFilters ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={
                    clearFilters
                  }
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: 7,
                    minHeight: 44,
                  }}
                >
                  <XCircle size={16} />
                  Clear
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    void loadListings({
                      refresh: true,
                    })
                  }
                  disabled={refreshing}
                  style={{
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    gap: 7,
                    minHeight: 44,
                  }}
                >
                  {refreshing ? (
                    <Loader2
                      size={16}
                      className="spin"
                    />
                  ) : (
                    <RefreshCw
                      size={16}
                    />
                  )}

                  Refresh
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: 12,
                color:
                  "var(--slate)",
                fontSize: 12,
              }}
            >
              Showing{" "}
              <strong>
                {
                  filteredListings.length
                }
              </strong>{" "}
              of{" "}
              <strong>
                {listings.length}
              </strong>{" "}
              listings
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          {loading ? (
            <div
              className="panel"
              style={{
                minHeight: 280,
                display: "grid",
                placeItems:
                  "center",
                textAlign:
                  "center",
              }}
            >
              <div>
                <Loader2
                  size={30}
                  className="spin"
                  style={{
                    margin:
                      "0 auto 12px",
                  }}
                />

                <strong>
                  Loading your
                  listings...
                </strong>

                <p
                  style={{
                    marginTop: 5,
                    color:
                      "var(--slate)",
                    fontSize: 13,
                  }}
                >
                  Getting your latest
                  Fockis Travel
                  inventory.
                </p>
              </div>
            </div>
          ) : filteredListings.length ===
            0 ? (
            <EmptyListings
              hasListings={
                listings.length > 0
              }
              hasFilters={
                hasActiveFilters
              }
              onClearFilters={
                clearFilters
              }
            />
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {filteredListings.map(
                (
                  listing,
                  index,
                ) => {
                  const id =
                    getListingId(
                      listing,
                    );

                  return (
                    <ListingCard
                      key={
                        id ||
                        `listing-${index}`
                      }
                      listing={
                        listing
                      }
                      deleting={
                        deletingId ===
                        id
                      }
                      onDelete={() =>
                        void handleDelete(
                          listing,
                        )
                      }
                    />
                  );
                },
              )}
            </div>
          )}
        </div>
      </section>

      <section className="tight">
        <div className="wrap">
          <div
            className="panel"
            style={{
              padding: 28,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 20,
              flexWrap: "wrap",
              background:
                "linear-gradient(135deg, rgba(22,47,48,0.97), rgba(22,47,48,0.9))",
              color: "#fff",
            }}
          >
            <div>
              <div
                className="eyebrow"
                style={{
                  color:
                    "var(--amber, #E8A33D)",
                }}
              >
                Fockis Travel
              </div>

              <h3
                style={{
                  marginTop: 6,
                  color: "#fff",
                  fontSize: 23,
                }}
              >
                Add another travel
                service
              </h3>

              <p
                style={{
                  marginTop: 6,
                  color:
                    "rgba(250,246,238,0.65)",
                  fontSize: 13.5,
                }}
              >
                Hotels, vacation
                rentals, restaurants,
                cars, experiences,
                meetings and
                transportation.
              </p>
            </div>

            <Link
              to="/travel/partner/listings/new"
              className="btn btn-amber"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
              }}
            >
              <Plus size={17} />
              Create listing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   LISTING STAT
============================================================================ */

function ListingStat({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="panel"
      style={{
        padding: 18,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 25,
          fontWeight: 800,
          color:
            "var(--petrol)",
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 3,
          color:
            "var(--slate)",
          fontSize: 12,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ============================================================================
   LISTING CARD
============================================================================ */

function ListingCard({
  listing,
  deleting,
  onDelete,
}: {
  listing: TravelListing;
  deleting: boolean;
  onDelete: () => void;
}) {
  const id =
    getListingId(listing);

  const title =
    getListingTitle(listing);

  const category =
    getListingCategory(
      listing,
    );

  const categoryConfig =
    getCategoryConfig(
      category,
    );

  const CategoryIcon =
    categoryConfig.icon;

  const statusConfig =
    getStatusConfig(
      listing.status,
    );

  const StatusIcon =
    statusConfig.icon;

  const image =
    getListingImage(
      listing,
    );

  const price =
    formatPrice(listing);

  const location = [
    listing.city,
    listing.state,
    listing.country,
  ]
    .filter(
      (value): value is string =>
        typeof value ===
          "string" &&
        value.trim()
          .length > 0,
    )
    .join(", ");

  const editHref = id
    ? `/travel/partner/listings/${encodeURIComponent(
        id,
      )}/edit`
    : "/travel/partner/listings";

  const viewHref = id
    ? `/travel/partner/listings/${encodeURIComponent(
        id,
      )}`
    : "/travel/partner/listings";

  const normalizedStatus =
    typeof listing.status ===
      "string" &&
    listing.status.trim()
      ? listing.status
          .trim()
          .toLowerCase()
      : "draft";

  return (
    <article
      className="panel"
      style={{
        padding: 0,
        overflow:
          "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "190px minmax(0, 1fr)",
          minHeight: 185,
        }}
      >
        <div
          style={{
            minHeight: 185,
            background:
              "linear-gradient(135deg, rgba(22,47,48,0.09), rgba(232,163,61,0.09))",
            position:
              "relative",
            overflow:
              "hidden",
          }}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                minHeight: 185,
                objectFit:
                  "cover",
                display: "block",
              }}
              onError={(
                event,
              ) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: 185,
                display: "grid",
                placeItems:
                  "center",
                color:
                  "var(--petrol)",
              }}
            >
              <div
                style={{
                  textAlign:
                    "center",
                }}
              >
                <CategoryIcon
                  size={42}
                />

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color:
                      "var(--slate)",
                  }}
                >
                  {
                    categoryConfig.label
                  }
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              position:
                "absolute",
              left: 10,
              top: 10,
            }}
          >
            <span
              className={`travel-listing-status ${statusConfig.className}`}
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 5,
                padding:
                  "6px 9px",
                borderRadius:
                  999,
                background:
                  "#fff",
                boxShadow:
                  "0 3px 12px rgba(0,0,0,0.12)",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <StatusIcon
                size={13}
              />

              {
                statusConfig.label
              }
            </span>
          </div>
        </div>

        <div
          style={{
            padding: 20,
            minWidth: 0,
            display: "flex",
            flexDirection:
              "column",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 14,
            }}
          >
            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 6,
                  color:
                    "var(--slate)",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform:
                    "uppercase",
                  letterSpacing:
                    ".04em",
                }}
              >
                <CategoryIcon
                  size={13}
                />

                {
                  categoryConfig.label
                }
              </div>

              <h3
                style={{
                  marginTop: 6,
                  fontSize: 21,
                  lineHeight:
                    1.15,
                  overflowWrap:
                    "anywhere",
                }}
              >
                {title}
              </h3>
            </div>

            {price && (
              <div
                style={{
                  flexShrink: 0,
                  textAlign:
                    "right",
                }}
              >
                <strong
                  className="mono"
                  style={{
                    fontSize: 16,
                    color:
                      "var(--petrol)",
                  }}
                >
                  {price}
                </strong>

                {typeof listing.priceUnit ===
                  "string" &&
                  listing.priceUnit.trim() && (
                    <div
                      style={{
                        color:
                          "var(--slate)",
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      {
                        listing.priceUnit
                      }
                    </div>
                  )}
              </div>
            )}
          </div>

          {typeof listing.description ===
            "string" &&
            listing.description.trim() && (
              <p
                style={{
                  marginTop: 8,
                  color:
                    "var(--slate)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  display:
                    "-webkit-box",
                  WebkitLineClamp:
                    2,
                  WebkitBoxOrient:
                    "vertical",
                  overflow:
                    "hidden",
                }}
              >
                {
                  listing.description
                }
              </p>
            )}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 14,
              flexWrap:
                "wrap",
              marginTop: 11,
              fontSize: 12,
              color:
                "var(--slate)",
            }}
          >
            {location && (
              <span
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 5,
                }}
              >
                <MapPin
                  size={14}
                />

                {location}
              </span>
            )}

            <span>
              Updated{" "}
              {formatDate(
                listing.updatedAt,
              )}
            </span>
          </div>

          {normalizedStatus ===
            "rejected" &&
            (listing.rejectionReason ||
              listing.reviewNote) && (
              <div
                style={{
                  marginTop: 12,
                  padding: 10,
                  borderRadius: 9,
                  background:
                    "#fff4f4",
                  border:
                    "1px solid #efb8b8",
                  color:
                    "#9b2226",
                  fontSize: 12,
                }}
              >
                <strong>
                  Review feedback:
                </strong>{" "}
                {listing.rejectionReason ||
                  listing.reviewNote}
              </div>
            )}

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 8,
              flexWrap:
                "wrap",
              marginTop:
                "auto",
              paddingTop: 15,
            }}
          >
            <Link
              to={viewHref}
              className="btn btn-outline"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 6,
                textDecoration:
                  "none",
                minHeight: 38,
                padding:
                  "8px 12px",
                fontSize: 12,
              }}
            >
              <Eye size={14} />
              View
            </Link>

            <Link
              to={editHref}
              className="btn btn-primary"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 6,
                textDecoration:
                  "none",
                minHeight: 38,
                padding:
                  "8px 12px",
                fontSize: 12,
              }}
            >
              <Edit3 size={14} />
              Edit
            </Link>

            <button
              type="button"
              className="btn btn-outline"
              onClick={onDelete}
              disabled={
                deleting
              }
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 6,
                minHeight: 38,
                padding:
                  "8px 12px",
                fontSize: 12,
                color:
                  "#9b2226",
                borderColor:
                  "rgba(155,34,38,0.25)",
              }}
            >
              {deleting ? (
                <Loader2
                  size={14}
                  className="spin"
                />
              ) : (
                <Trash2
                  size={14}
                />
              )}

              {deleting
                ? "Deleting..."
                : "Delete"}
            </button>

            {normalizedStatus ===
              "draft" && (
              <span
                style={{
                  marginLeft:
                    "auto",
                  fontSize: 11,
                  color:
                    "var(--slate)",
                }}
              >
                Finish and
                submit for
                review
              </span>
            )}

            {normalizedStatus ===
              "pending_review" && (
              <span
                style={{
                  marginLeft:
                    "auto",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 5,
                  fontSize: 11,
                  color:
                    "var(--slate)",
                }}
              >
                <Clock3
                  size={13}
                />

                Awaiting
                review
              </span>
            )}

            {normalizedStatus ===
              "published" && (
              <span
                style={{
                  marginLeft:
                    "auto",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 5,
                  fontSize: 11,
                  color:
                    "#2f7d55",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2
                  size={13}
                />

                Live on Fockis
                Travel
              </span>
            )}

            {normalizedStatus ===
              "approved" && (
              <span
                style={{
                  marginLeft:
                    "auto",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 5,
                  fontSize: 11,
                  color:
                    "#2f7d55",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2
                  size={13}
                />

                Approved
              </span>
            )}

            {normalizedStatus ===
              "suspended" && (
              <span
                style={{
                  marginLeft:
                    "auto",
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 5,
                  fontSize: 11,
                  color:
                    "#9b2226",
                  fontWeight: 700,
                }}
              >
                <AlertCircle
                  size={13}
                />

                Listing
                suspended
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============================================================================
   EMPTY STATE
============================================================================ */

function EmptyListings({
  hasListings,
  hasFilters,
  onClearFilters,
}: {
  hasListings: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (
    hasListings &&
    hasFilters
  ) {
    return (
      <div
        className="panel"
        style={{
          minHeight: 280,
          display: "grid",
          placeItems:
            "center",
          textAlign:
            "center",
          padding: 30,
        }}
      >
        <div>
          <div
            style={{
              width: 58,
              height: 58,
              margin:
                "0 auto",
              borderRadius: 16,
              display: "grid",
              placeItems:
                "center",
              background:
                "rgba(22,47,48,0.07)",
              color:
                "var(--petrol)",
            }}
          >
            <Search size={25} />
          </div>

          <h3
            style={{
              marginTop: 15,
            }}
          >
            No matching
            listings
          </h3>

          <p
            style={{
              marginTop: 6,
              maxWidth: 420,
              color:
                "var(--slate)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            We couldn't find
            a listing matching
            your current search
            and filters.
          </p>

          <button
            type="button"
            className="btn btn-outline"
            onClick={
              onClearFilters
            }
            style={{
              marginTop: 16,
            }}
          >
            Clear filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="panel"
      style={{
        minHeight: 340,
        display: "grid",
        placeItems:
          "center",
        textAlign:
          "center",
        padding: 30,
      }}
    >
      <div>
        <div
          style={{
            width: 68,
            height: 68,
            margin:
              "0 auto",
            borderRadius: 18,
            display: "grid",
            placeItems:
              "center",
            background:
              "rgba(232,163,61,0.13)",
            color:
              "var(--amber-dark, #9A6700)",
          }}
        >
          <Store size={29} />
        </div>

        <h3
          style={{
            marginTop: 16,
          }}
        >
          {hasListings
            ? "No listings found"
            : "You don't have any listings yet"}
        </h3>

        <p
          style={{
            marginTop: 7,
            maxWidth: 500,
            color:
              "var(--slate)",
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          {hasListings
            ? "Try changing your filters to find your listings."
            : "Create your first Fockis Travel listing and start building your travel business inventory."}
        </p>

        {!hasListings && (
          <Link
            to="/travel/partner/listings/new"
            className="btn btn-amber"
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: 7,
              marginTop: 18,
              textDecoration:
                "none",
            }}
          >
            <Plus size={17} />
            Create your first
            listing
          </Link>
        )}

        {hasListings &&
          !hasFilters && (
            <Link
              to="/travel/partner/listings/new"
              className="btn btn-amber"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 7,
                marginTop: 18,
                textDecoration:
                  "none",
              }}
            >
              <Plus size={17} />
              Add a listing
            </Link>
          )}
      </div>
    </div>
  );
}