import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import LanguageSelector from "../../../i18n/components/LanguageSelector";
import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import { travelApi, unwrapApiData } from "../services/travelApi";
import partnersApi from "../services/partnersApi";
import "../styles/TravelHomePage.scss";

/* ============================================================
 * MEDIA URL RESOLUTION
 * ============================================================
 *
 * FIX (Sep 2026): Business cover images / logos / listing images
 * are stored as relative paths (e.g. "/uploads/cover-123.jpg").
 * They must be resolved against the API origin before being used
 * in an <img src> or a CSS `url(...)`, otherwise the browser
 * resolves them against the frontend's own origin and the image
 * silently fails to load (no error, just a blank box).
 *
 * This mirrors the resolveMediaUrl()/getApiOrigin() helpers in
 * TravelPartnerPage.tsx. If/when those are moved into a shared
 * util (e.g. services/travelApi.ts), delete this copy and import
 * from there instead so both stay in sync.
 * ============================================================ */

function getApiOrigin(): string {
  const configured = String(
    import.meta.env.VITE_API_URL ??
      import.meta.env.VITE_API_BASE_URL ??
      "",
  ).trim();

  if (configured) {
    return configured
      .replace(/\/travel\/?$/i, "")
      .replace(/\/+$/, "");
  }

  return FOCKIS_API_URL;
}

function resolveMediaUrl(value?: string | null): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const origin = getApiOrigin();

  return `${origin}/${trimmed.replace(/^\/+/, "")}`;
}

interface TravelListing {
  _id: string;
  id?: string;
  name?: string;
  title?: string;
  type?: string;
  category?: string;
  description?: string;
  country?: string;
  state?: string;
  department?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  images?: string[];
  currency?: string;
  price?: number;
  priceUnit?: string;
  active?: boolean;
  status?: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  amenities?: string[];
  partnerId?: string;
  partner_id?: string;
  businessId?: string;
  business_id?: string;
  userId?: string;
  user_id?: string;
  partnerUserId?: string;
  partner_user_id?: string;
  metadata?: Record<string, unknown>;
}

interface ListingResponse {
  items?: TravelListing[];
  listings?: TravelListing[];
  data?: TravelListing[];
  total?: number;
  page?: number;
  limit?: number;
}

interface TravelBusiness {
  _id: string;
  id?: string;
  userId?: string;

  businessName?: string;
  name?: string;

  category?: string;
  categories?: string[];

  description?: string;

  country?: string;
  city?: string;
  state?: string;
  department?: string;
  address?: string;
  postalCode?: string;

  addressInfo?: {
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    department?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };

  logo?: string;
  coverImage?: string;
  images?: string[];

  services?: Array<{
    name?: string;
    description?: string;
    active?: boolean;
  }>;

  amenities?: string[];
  features?: string[];

  status?: string;
  active?: boolean;
  acceptingBookings?: boolean;
  featured?: boolean;
  verifiedAt?: string;

  listingCount?: number;
}

interface BusinessResponse {
  items?: TravelBusiness[];
  businesses?: TravelBusiness[];
  partners?: TravelBusiness[];
  data?: TravelBusiness[];
  total?: number;
  page?: number;
  limit?: number;
}

const SEARCH_CATEGORIES = [
  {
    id: "all",
    emoji: "🌎",
    label: "All",
    type: "",
  },
  {
    id: "stays",
    emoji: "🏨",
    label: "Stays",
    type: "stay",
  },
  {
    id: "rentals",
    emoji: "🏠",
    label: "Vacation Rentals",
    type: "rental",
  },
  {
    id: "restaurants",
    emoji: "🍽️",
    label: "Restaurants",
    type: "restaurant",
  },
  {
    id: "cars",
    emoji: "🚗",
    label: "Cars",
    type: "car",
  },
  {
    id: "meetings",
    emoji: "💼",
    label: "Meetings",
    type: "meeting",
  },
  {
    id: "events",
    emoji: "🎉",
    label: "Events",
    type: "event",
  },
  {
    id: "experiences",
    emoji: "🏝️",
    label: "Experiences",
    type: "experience",
  },
  {
    id: "transfers",
    emoji: "🚐",
    label: "Transfers",
    type: "transfer",
  },
  {
    id: "attractions",
    emoji: "🎟️",
    label: "Attractions",
    type: "attraction",
  },
  {
    id: "things",
    emoji: "🗺️",
    label: "Things to Do",
    type: "thing",
  },
];

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200",
];

const TRUST_ITEMS = [
  {
    title: "Verified businesses",
    body: "Travel partners are reviewed before they can appear publicly on Fockis Travel.",
  },
  {
    title: "Secure booking",
    body: "Your booking is connected directly to your Fockis account.",
  },
  {
    title: "Real inventory",
    body: "Listings shown here come from the Fockis Travel backend.",
  },
  {
    title: "Clear pricing",
    body: "Prices and booking totals are calculated from listing information.",
  },
  {
    title: "Global locations",
    body: "Search by country, department, state, city, area, or property.",
  },
  {
    title: "One Travel account",
    body: "Keep your bookings organized in My Trips.",
  },
];

function getListingId(listing: TravelListing): string {
  return String(listing._id || listing.id || "");
}

function getListingName(listing: TravelListing): string {
  return listing.name || listing.title || "Untitled travel listing";
}

function getListingLocation(listing: TravelListing): string {
  const administrativeArea = listing.department || listing.state || "";

  const parts = [
    listing.city,
    administrativeArea,
    listing.country,
  ].filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return listing.address || "Location not provided";
}

/*
 * FIX: resolve the raw stored path (e.g. "/uploads/xyz.jpg")
 * against the API origin before handing it back for use in
 * <img src> or CSS url(...). If resolution yields nothing
 * (empty/invalid value), fall back to a default stock image
 * exactly as before.
 */
function getListingImage(
  listing: TravelListing,
  index = 0,
): string {
  if (
    Array.isArray(listing.images) &&
    listing.images.length > 0 &&
    typeof listing.images[0] === "string" &&
    listing.images[0].trim()
  ) {
    const resolved = resolveMediaUrl(listing.images[0]);

    if (resolved) {
      return resolved;
    }
  }

  return DEFAULT_IMAGES[index % DEFAULT_IMAGES.length];
}

function getPriceUnit(listing: TravelListing): string {
  const unit = String(listing.priceUnit || "night").toLowerCase();

  switch (unit) {
    case "hour":
      return "hour";
    case "day":
      return "day";
    case "person":
      return "person";
    case "night":
      return "night";
    default:
      return unit;
  }
}

function formatCurrency(
  amount: number,
  currency = "USD",
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency).toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return (
      String(currency).toUpperCase() +
      " " +
      amount.toFixed(2)
    );
  }
}

function normalizeSearchValue(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getSearchableText(listing: TravelListing): string {
  return [
    listing.name,
    listing.title,
    listing.type,
    listing.category,
    listing.description,
    listing.country,
    listing.state,
    listing.department,
    listing.city,
    listing.address,
    listing.postalCode,
    ...(Array.isArray(listing.amenities)
      ? listing.amenities
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getBusinessId(business: TravelBusiness): string {
  return String(business._id || business.id || "");
}

function getBusinessName(business: TravelBusiness): string {
  return business.businessName || business.name || "Travel business";
}

function getBusinessCategory(business: TravelBusiness): string {
  if (
    typeof business.category === "string" &&
    business.category.trim()
  ) {
    return business.category.trim();
  }

  if (
    Array.isArray(business.categories) &&
    business.categories.length > 0
  ) {
    return String(business.categories[0]);
  }

  return "Travel business";
}

function getBusinessLocation(business: TravelBusiness): string {
  const city =
    business.city ||
    business.addressInfo?.city ||
    "";

  const country =
    business.country ||
    business.addressInfo?.country ||
    "";

  const administrativeArea =
    business.department ||
    business.state ||
    business.addressInfo?.department ||
    business.addressInfo?.state ||
    "";

  const parts = [
    city,
    administrativeArea,
    country,
  ].filter(
    (value): value is string =>
      typeof value === "string" &&
      value.trim().length > 0,
  );

  if (parts.length > 0) {
    return parts.join(", ");
  }

  return (
    business.address ||
    business.addressInfo?.address ||
    "Location not provided"
  );
}

function getBusinessAdministrativeArea(
  business: TravelBusiness,
): string {
  return String(
    business.department ||
      business.state ||
      business.addressInfo?.department ||
      business.addressInfo?.state ||
      "",
  ).trim();
}

function getBusinessCountry(
  business: TravelBusiness,
): string {
  return String(
    business.country ||
      business.addressInfo?.country ||
      "",
  ).trim();
}

function getBusinessCity(
  business: TravelBusiness,
): string {
  return String(
    business.city ||
      business.addressInfo?.city ||
      "",
  ).trim();
}

/*
 * FIX: this previously returned the raw stored value
 * (e.g. "/uploads/business-cover-123.jpg") which the browser
 * resolved against the frontend's own origin when used in a
 * CSS `background-image: url(...)`, causing it to silently
 * 404 and render as a blank/gray box. Now resolved against the
 * API origin via resolveMediaUrl(), same as TravelPartnerPage.tsx.
 */
function getBusinessImage(
  business: TravelBusiness,
): string | null {
  if (
    typeof business.coverImage === "string" &&
    business.coverImage.trim()
  ) {
    const resolved = resolveMediaUrl(business.coverImage.trim());

    if (resolved) {
      return resolved;
    }
  }

  if (
    typeof business.logo === "string" &&
    business.logo.trim()
  ) {
    const resolved = resolveMediaUrl(business.logo.trim());

    if (resolved) {
      return resolved;
    }
  }

  if (
    Array.isArray(business.images) &&
    typeof business.images[0] === "string" &&
    business.images[0].trim()
  ) {
    const resolved = resolveMediaUrl(business.images[0].trim());

    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function getBusinessInitials(
  business: TravelBusiness,
): string {
  const words = getBusinessName(business)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "FT";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0].charAt(0) +
    words[1].charAt(0)
  ).toUpperCase();
}

function getBusinessCategoryType(
  business: TravelBusiness,
): string {
  const values = [
    business.category,
    ...(Array.isArray(business.categories)
      ? business.categories
      : []),
  ]
    .filter(Boolean)
    .map(normalizeSearchValue);

  for (const value of values) {
    if (
      value.includes("hotel") ||
      value.includes("stay") ||
      value.includes("lodging")
    ) {
      return "stay";
    }

    if (
      value.includes("vacation") ||
      value.includes("rental")
    ) {
      return "rental";
    }

    if (value.includes("restaurant")) {
      return "restaurant";
    }

    if (
      value.includes("car") ||
      value.includes("auto")
    ) {
      return "car";
    }

    if (
      value.includes("meeting") ||
      value.includes("conference")
    ) {
      return "meeting";
    }

    if (value.includes("event")) {
      return "event";
    }

    if (value.includes("experience")) {
      return "experience";
    }

    if (
      value.includes("transport") ||
      value.includes("transfer")
    ) {
      return "transfer";
    }

    if (value.includes("attraction")) {
      return "attraction";
    }

    if (
      value.includes("thing") ||
      value.includes("activity")
    ) {
      return "thing";
    }
  }

  return "";
}

function getSearchableBusinessText(
  business: TravelBusiness,
): string {
  return [
    business.businessName,
    business.name,
    business.category,
    ...(Array.isArray(business.categories)
      ? business.categories
      : []),
    business.description,
    business.country,
    business.state,
    business.department,
    business.city,
    business.address,
    business.postalCode,
    business.addressInfo?.country,
    business.addressInfo?.state,
    business.addressInfo?.department,
    business.addressInfo?.city,
    business.addressInfo?.address,
    ...(Array.isArray(business.services)
      ? business.services.flatMap(
          (service) => [
            service.name,
            service.description,
          ],
        )
      : []),
    ...(Array.isArray(business.amenities)
      ? business.amenities
      : []),
    ...(Array.isArray(business.features)
      ? business.features
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isPublicBusiness(
  business: TravelBusiness,
): boolean {
  const status = normalizeSearchValue(
    business.status,
  );

  if (
    status &&
    status !== "verified"
  ) {
    return false;
  }

  if (business.active === false) {
    return false;
  }

  return true;
}

function isPublicListing(
  listing: TravelListing,
): boolean {
  if (listing.active === false) {
    return false;
  }

  const status = normalizeSearchValue(
    listing.status,
  );

  if (
    status &&
    ![
      "published",
      "active",
      "verified",
    ].includes(status)
  ) {
    return false;
  }

  return true;
}

function extractListings(
  value: unknown,
): TravelListing[] {
  if (Array.isArray(value)) {
    return value as TravelListing[];
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const data =
      value as ListingResponse;

    if (Array.isArray(data.items)) {
      return data.items;
    }

    if (Array.isArray(data.listings)) {
      return data.listings;
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }
  }

  return [];
}

function extractBusinesses(
  value: unknown,
): TravelBusiness[] {
  if (Array.isArray(value)) {
    return value as TravelBusiness[];
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const data =
      value as BusinessResponse;

    if (Array.isArray(data.items)) {
      return data.items;
    }

    if (Array.isArray(data.businesses)) {
      return data.businesses;
    }

    if (Array.isArray(data.partners)) {
      return data.partners;
    }

    if (Array.isArray(data.data)) {
      return data.data;
    }
  }

  return [];
}

function GlobePanel() {
  return (
    <div
      className="globe-panel"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 460 520"
        fill="none"
      >
        <path
          className="route-path"
          d="M60,120 Q160,60 250,140 T400,110"
        />

        <path
          className="route-path"
          d="M60,120 Q120,260 220,300 T380,340"
        />

        <path
          className="route-path"
          d="M220,300 Q260,400 180,460"
        />

        <path
          className="route-path"
          d="M250,140 Q300,220 380,340"
        />

        <circle
          className="node-ring"
          cx="60"
          cy="120"
          r="11"
        />

        <circle
          className="node"
          cx="60"
          cy="120"
          r="4"
        />

        <text
          className="node-label"
          x="74"
          y="124"
        >
          PAP
        </text>

        <circle
          className="node-ring"
          cx="250"
          cy="140"
          r="11"
        />

        <circle
          className="node"
          cx="250"
          cy="140"
          r="4"
        />

        <text
          className="node-label"
          x="264"
          y="144"
        >
          MIA
        </text>

        <circle
          className="node-ring"
          cx="400"
          cy="110"
          r="11"
        />

        <circle
          className="node"
          cx="400"
          cy="110"
          r="4"
        />

        <text
          className="node-label"
          x="360"
          y="94"
        >
          CDG
        </text>

        <circle
          className="node-ring"
          cx="220"
          cy="300"
          r="11"
        />

        <circle
          className="node"
          cx="220"
          cy="300"
          r="4"
        />

        <text
          className="node-label"
          x="234"
          y="304"
        >
          GIG
        </text>

        <circle
          className="node-ring"
          cx="380"
          cy="340"
          r="11"
        />

        <circle
          className="node"
          cx="380"
          cy="340"
          r="4"
        />

        <text
          className="node-label"
          x="340"
          y="364"
        >
          NRT
        </text>

        <circle
          className="node-ring"
          cx="180"
          cy="460"
          r="11"
        />

        <circle
          className="node"
          cx="180"
          cy="460"
          r="4"
        />

        <text
          className="node-label"
          x="194"
          y="464"
        >
          SCL
        </text>
      </svg>
    </div>
  );
}

function ListingCard({
  listing,
  index,
}: {
  listing: TravelListing;
  index: number;
}) {
  const id = getListingId(listing);
  const name = getListingName(listing);
  const location = getListingLocation(listing);
  const image = getListingImage(listing, index);

  const price = Number(listing.price || 0);
  const currency = listing.currency || "USD";
  const priceUnit = getPriceUnit(listing);

  const rating = Number(listing.rating || 0);
  const reviewCount = Number(listing.reviewCount || 0);

  const amenities =
    Array.isArray(listing.amenities) &&
    listing.amenities.length > 0
      ? listing.amenities
          .slice(0, 4)
          .join(" · ")
      : listing.category ||
        "Travel experience";

  return (
    <article className="stay-card">
      <div
        className="thumb"
        style={{
          backgroundImage:
            'url("' +
            image +
            '")',
        }}
      >
        <button
          className="fav"
          aria-label={
            "Save " + name
          }
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Heart size={17} />
        </button>

        {listing.featured && (
          <span className="featured-badge">
            <Sparkles size={12} />
            Featured
          </span>
        )}
      </div>

      <div className="body">
        <div className="row1">
          <h4>{name}</h4>

          {rating > 0 && (
            <div className="rating">
              <span className="star">
                ★
              </span>

              {rating.toFixed(1)}

              {reviewCount > 0 && (
                <span className="review-count">
                  ({reviewCount})
                </span>
              )}
            </div>
          )}
        </div>

        <div className="loc">
          <MapPin size={14} />
          {location}
        </div>

        <div className="amenities">
          {amenities}
        </div>

        <div className="price-row">
          <div className="price">
            {price > 0
              ? formatCurrency(
                  price,
                  currency,
                )
              : "Contact for price"}

            {price > 0 && (
              <span>
                /{priceUnit}
              </span>
            )}
          </div>

          {id ? (
            <Link
              to={`/travel/stays/${encodeURIComponent(
                id,
              )}`}
              className="view-link"
            >
              View stay
              <ArrowRight size={14} />
            </Link>
          ) : (
            <span className="view-link">
              View details
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function BusinessCard({
  business,
  listingCount,
}: {
  business: TravelBusiness;
  listingCount: number;
}) {
  const id = getBusinessId(business);
  const name = getBusinessName(business);
  const category = getBusinessCategory(business);
  const location = getBusinessLocation(business);
  const image = getBusinessImage(business);
  const initials = getBusinessInitials(business);

  const actualListingCount =
    typeof business.listingCount === "number"
      ? business.listingCount
      : listingCount;

  const businessUrl = id
    ? `/travel/businesses/${encodeURIComponent(id)}`
    : "/travel";

  return (
    <article className="stay-card">
      <Link
        to={businessUrl}
        aria-label={"Visit " + name}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
        }}
      >
        <div
          className="thumb"
          style={
            image
              ? {
                  backgroundImage:
                    'url("' +
                    image +
                    '")',
                }
              : undefined
          }
        >
          {!image && (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "42px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                background:
                  "linear-gradient(135deg, var(--petrol), var(--ink-2))",
                color: "var(--paper)",
              }}
            >
              {initials}
            </div>
          )}

          <span className="featured-badge">
            <ShieldCheck size={12} />
            Verified
          </span>
        </div>

        <div className="body">
          <div className="row1">
            <h4>{name}</h4>

            {business.featured && (
              <span className="rating">
                <Sparkles size={14} />
                Featured
              </span>
            )}
          </div>

          <div className="loc">
            <MapPin size={14} />
            {category} · {location}
          </div>

          <div className="amenities">
            {actualListingCount === 0
              ? "0 listings available"
              : actualListingCount === 1
                ? "1 listing available"
                : String(actualListingCount) +
                  " listings available"}
          </div>

          <div className="price-row">
            <div className="price">
              <span>
                Verified business
              </span>
            </div>

            <span className="view-link">
              Visit business
              <ArrowRight size={14} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default function TravelHomePage() {
  const navigate = useNavigate();

  const [listings, setListings] =
    useState<TravelListing[]>([]);

  const [businesses, setBusinesses] =
    useState<TravelBusiness[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    businessLoading,
    setBusinessLoading,
  ] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [
    businessError,
    setBusinessError,
  ] = useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [
    activeCategory,
    setActiveCategory,
  ] = useState("all");

  const [checkIn, setCheckIn] =
    useState("");

  const [checkOut, setCheckOut] =
    useState("");

  const [guests, setGuests] =
    useState(2);

  const catTabsRef =
    useRef<HTMLDivElement>(null);

  const [
    canScrollLeft,
    setCanScrollLeft,
  ] = useState(false);

  const [
    canScrollRight,
    setCanScrollRight,
  ] = useState(false);

  const updateCatTabsScrollState =
    useCallback(() => {
      const element =
        catTabsRef.current;

      if (!element) {
        return;
      }

      setCanScrollLeft(
        element.scrollLeft > 4,
      );

      setCanScrollRight(
        element.scrollLeft +
          element.clientWidth <
          element.scrollWidth - 4,
      );
    }, []);

  useEffect(() => {
    updateCatTabsScrollState();

    window.addEventListener(
      "resize",
      updateCatTabsScrollState,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateCatTabsScrollState,
      );
    };
  }, [
    updateCatTabsScrollState,
  ]);

  const scrollCatTabs =
    useCallback(
      (
        direction:
          | "left"
          | "right",
      ) => {
        const element =
          catTabsRef.current;

        if (!element) {
          return;
        }

        const amount =
          Math.max(
            element.clientWidth *
              0.7,
            240,
          );

        element.scrollBy({
          left:
            direction === "left"
              ? -amount
              : amount,
          behavior: "smooth",
        });
      },
      [],
    );

  const loadBusinesses =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setBusinessLoading(true);
        }

        setBusinessError(null);

        try {
          const response =
            await partnersApi.listPublicBusinesses();

          const unwrapped =
            unwrapApiData(
              response,
            );

          const publicBusinesses =
            extractBusinesses(
              unwrapped,
            ).filter(
              isPublicBusiness,
            );

          setBusinesses(
            publicBusinesses,
          );
        } catch (reason) {
          console.error(
            "Unable to load verified Travel businesses:",
            reason,
          );

          setBusinessError(
            "Verified Travel businesses could not be loaded right now.",
          );

          setBusinesses([]);
        } finally {
          if (!showRefresh) {
            setBusinessLoading(false);
          }

          if (showRefresh) {
            setRefreshing(false);
          }
        }
      },
      [],
    );

  const loadListings =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        try {
          const response =
            await travelApi.get<
              ListingResponse |
                TravelListing[]
            >(
              "/travel/listings?limit=100",
            );

          const unwrapped =
            unwrapApiData(
              response,
            );

          setListings(
            extractListings(
              unwrapped,
            ),
          );
        } catch (reason) {
          console.error(
            "Unable to load Travel listings:",
            reason,
          );

          setError(
            "Unable to load Travel listings right now.",
          );

          setListings([]);
        } finally {
          if (!showRefresh) {
            setLoading(false);
          }

          if (showRefresh) {
            setRefreshing(false);
          }
        }
      },
      [],
    );

  const loadTravelData =
    useCallback(
      async (
        showRefresh = false,
      ) => {
        if (showRefresh) {
          setRefreshing(true);
        }

        try {
          await Promise.all([
            loadBusinesses(false),
            loadListings(false),
          ]);
        } finally {
          if (showRefresh) {
            setRefreshing(false);
          }
        }
      },
      [
        loadBusinesses,
        loadListings,
      ],
    );

  useEffect(() => {
    void loadBusinesses();
    void loadListings();
  }, [
    loadBusinesses,
    loadListings,
  ]);

  const publicListings =
    useMemo(
      () =>
        listings.filter(
          isPublicListing,
        ),
      [listings],
    );

  const publicBusinesses =
    useMemo(
      () =>
        businesses.filter(
          isPublicBusiness,
        ),
      [businesses],
    );

  const activeType =
    useMemo(() => {
      return (
        SEARCH_CATEGORIES.find(
          (category) =>
            category.id ===
            activeCategory,
        )?.type || ""
      );
    }, [activeCategory]);

  const filteredListings =
    useMemo(() => {
      const normalizedSearch =
        normalizeSearchValue(
          search,
        );

      return publicListings.filter(
        (listing) => {
          const listingType =
            normalizeSearchValue(
              listing.type,
            );

          if (
            activeType &&
            listingType !== activeType
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return getSearchableText(
            listing,
          ).includes(
            normalizedSearch,
          );
        },
      );
    }, [
      publicListings,
      activeType,
      search,
    ]);

  const filteredBusinesses =
    useMemo(() => {
      const normalizedSearch =
        normalizeSearchValue(
          search,
        );

      return publicBusinesses.filter(
        (business) => {
          const businessType =
            getBusinessCategoryType(
              business,
            );

          if (
            activeType &&
            businessType &&
            businessType !== activeType
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return getSearchableBusinessText(
            business,
          ).includes(
            normalizedSearch,
          );
        },
      );
    }, [
      publicBusinesses,
      activeType,
      search,
    ]);

  const listingCountsByBusiness =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      publicListings.forEach(
        (listing) => {
          const metadata =
            listing.metadata;

          const metadataRecord =
            metadata &&
            typeof metadata ===
              "object"
              ? (metadata as Record<
                  string,
                  unknown
                >)
              : {};

          const possibleIds = [
            listing.partnerId,
            listing.partner_id,
            listing.businessId,
            listing.business_id,
            listing.userId,
            listing.user_id,
            listing.partnerUserId,
            listing.partner_user_id,
            metadataRecord.partnerId,
            metadataRecord.partner_id,
            metadataRecord.businessId,
            metadataRecord.business_id,
            metadataRecord.userId,
            metadataRecord.user_id,
            metadataRecord.partnerUserId,
            metadataRecord.partner_user_id,
          ]
            .filter(Boolean)
            .map(String);

          const uniqueIds =
            Array.from(
              new Set(
                possibleIds,
              ),
            );

          uniqueIds.forEach(
            (id) => {
              counts.set(
                id,
                (counts.get(id) || 0) +
                  1,
              );
            },
          );
        },
      );

      return counts;
    }, [publicListings]);

  const getBusinessListingCount =
    useCallback(
      (
        business: TravelBusiness,
      ): number => {
        if (
          typeof business.listingCount ===
          "number"
        ) {
          return business.listingCount;
        }

        const ids = [
          business._id,
          business.id,
          business.userId,
        ]
          .filter(Boolean)
          .map(String);

        return ids.reduce(
          (total, id) =>
            Math.max(
              total,
              listingCountsByBusiness.get(
                id,
              ) || 0,
            ),
          0,
        );
      },
      [listingCountsByBusiness],
    );

  const homeBusinesses =
    useMemo(() => {
      return [...filteredBusinesses]
        .sort(
          (a, b) =>
            Number(
              b.featured === true,
            ) -
              Number(
                a.featured === true,
              ) ||
            getBusinessName(
              a,
            ).localeCompare(
              getBusinessName(
                b,
              ),
            ),
        )
        .slice(0, 8);
    }, [filteredBusinesses]);

  const homeListings =
    useMemo(() => {
      if (
        search.trim() ||
        activeType
      ) {
        return filteredListings.slice(
          0,
          8,
        );
      }

      return [...publicListings]
        .sort(
          (a, b) =>
            Number(
              b.featured === true,
            ) -
              Number(
                a.featured === true,
              ) ||
            Number(
              b.rating || 0,
            ) -
              Number(
                a.rating || 0,
              ),
        )
        .slice(0, 8);
    }, [
      publicListings,
      filteredListings,
      search,
      activeType,
    ]);

  const destinations =
    useMemo(() => {
      const map =
        new Map<
          string,
          {
            country: string;
            city: string;
            state: string;
            count: number;
            image: string | null;
          }
        >();

      publicBusinesses.forEach(
        (business) => {
          const country =
            getBusinessCountry(
              business,
            );

          const city =
            getBusinessCity(
              business,
            );

          const state =
            getBusinessAdministrativeArea(
              business,
            );

          if (!country && !city) {
            return;
          }

          const key = [
            country,
            state,
            city,
          ]
            .join("|")
            .toLowerCase();

          const existing =
            map.get(key);

          if (existing) {
            existing.count += 1;
            return;
          }

          map.set(key, {
            country:
              country ||
              "Unknown country",
            city:
              city ||
              "Multiple locations",
            state,
            count: 1,
            image:
              getBusinessImage(
                business,
              ),
          });
        },
      );

      publicListings.forEach(
        (
          listing,
          index,
        ) => {
          const country =
            String(
              listing.country ||
                "",
            ).trim();

          const city =
            String(
              listing.city ||
                "",
            ).trim();

          const state =
            String(
              listing.department ||
                listing.state ||
                "",
            ).trim();

          if (!country && !city) {
            return;
          }

          const key = [
            country,
            state,
            city,
          ]
            .join("|")
            .toLowerCase();

          const existing =
            map.get(key);

          if (existing) {
            existing.count += 1;

            if (!existing.image) {
              existing.image =
                getListingImage(
                  listing,
                  index,
                );
            }

            return;
          }

          map.set(key, {
            country:
              country ||
              "Unknown country",
            city:
              city ||
              "Multiple locations",
            state,
            count: 1,
            image:
              getListingImage(
                listing,
                index,
              ),
          });
        },
      );

      return Array.from(
        map.values(),
      )
        .sort(
          (a, b) =>
            b.count - a.count,
        )
        .slice(0, 8);
    }, [
      publicBusinesses,
      publicListings,
    ]);

  const categoryCounts =
    useMemo(() => {
      const counts =
        new Map<string, number>();

      publicListings.forEach(
        (listing) => {
          const type =
            normalizeSearchValue(
              listing.type,
            );

          if (!type) {
            return;
          }

          counts.set(
            type,
            (counts.get(type) || 0) +
              1,
          );
        },
      );

      return counts;
    }, [publicListings]);

  function handleSearchSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim(),
      );
    }

    if (activeType) {
      params.set(
        "type",
        activeType,
      );
    }

    if (checkIn) {
      params.set(
        "startAt",
        checkIn +
          "T15:00:00",
      );
    }

    if (checkOut) {
      params.set(
        "endAt",
        checkOut +
          "T11:00:00",
      );
    }

    params.set(
      "guests",
      String(guests),
    );

    const query =
      params.toString();

    navigate(
      query
        ? "/travel/stays?" +
            query
        : "/travel/stays",
    );
  }

  function handleCategory(
    categoryId: string,
  ) {
    setActiveCategory(
      categoryId,
    );

    window.setTimeout(() => {
      document
        .getElementById(
          "live-listings",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  function handleDestinationSearch(
    destination: {
      country: string;
      city: string;
      state: string;
    },
  ) {
    const searchValue = [
      destination.city,
      destination.state,
      destination.country,
    ]
      .filter(Boolean)
      .join(", ");

    setSearch(searchValue);
    setActiveCategory("all");

    window.setTimeout(() => {
      document
        .getElementById(
          "live-listings",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 0);
  }

  return (
    <div className="fockis-travel-root">
      <div className="fockis-travel-language-row">
        <div className="wrap fockis-travel-language-row__inner">
          <LanguageSelector />
        </div>
      </div>

      <main>
        <section
          className="hero"
          style={{
            paddingBottom: 0,
          }}
        >
          <div className="hero-grid">
            <div>
              <div
                className="eyebrow"
                style={{
                  color:
                    "var(--amber)",
                }}
              >
                GLOBAL TRAVEL MARKETPLACE
              </div>

              <h1>
                Travel anywhere.
                <br />
                Book{" "}
                <span className="accent">
                  everything.
                </span>
              </h1>

              <p className="lede">
                Discover verified
                businesses and real
                travel listings from
                businesses listed on
                Fockis Travel.
              </p>

              <div className="hero-cta-row">
                <a
                  href="#search"
                  className="btn btn-amber"
                >
                  Start exploring{" "}
                  <ArrowRight size={17} />
                </a>

                <a
                  href="#business"
                  className="btn btn-ghost-dark"
                >
                  Travel for business
                </a>
              </div>

              <div className="hero-stats">
                <div className="stat">
                  <b>
                    {
                      publicBusinesses.length
                    }
                  </b>

                  <span>
                    Verified businesses
                  </span>
                </div>

                <div className="stat">
                  <b>
                    {
                      publicListings.length
                    }
                  </b>

                  <span>
                    Live listings
                  </span>
                </div>

                <div className="stat">
                  <b>
                    {
                      new Set(
                        [
                          ...publicBusinesses.map(
                            (
                              business,
                            ) =>
                              getBusinessCountry(
                                business,
                              ),
                          ),
                          ...publicListings.map(
                            (
                              listing,
                            ) =>
                              listing.country,
                          ),
                        ].filter(Boolean),
                      ).size
                    }
                  </b>

                  <span>
                    Countries
                  </span>
                </div>
              </div>
            </div>

            <GlobePanel />
          </div>

          <div
            className="wrap"
            style={{
              position: "relative",
            }}
          >
            <form
              className="hero-search-panel"
              id="search"
              onSubmit={
                handleSearchSubmit
              }
            >
              <div
                className={
                  "cat-tabs-wrap" +
                  (canScrollLeft
                    ? " can-scroll-left"
                    : "") +
                  (canScrollRight
                    ? " can-scroll-right"
                    : "")
                }
              >
                <button
                  type="button"
                  className={
                    "cat-tabs-arrow cat-tabs-arrow-left" +
                    (canScrollLeft
                      ? ""
                      : " is-hidden")
                  }
                  onClick={() =>
                    scrollCatTabs(
                      "left",
                    )
                  }
                  aria-label="Scroll categories left"
                  tabIndex={
                    canScrollLeft
                      ? 0
                      : -1
                  }
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>

                <div
                  className="cat-tabs"
                  ref={catTabsRef}
                  onScroll={
                    updateCatTabsScrollState
                  }
                >
                  {SEARCH_CATEGORIES.map(
                    (
                      category,
                    ) => {
                      const count =
                        category.type
                          ? categoryCounts.get(
                              category.type,
                            ) || 0
                          : publicListings.length;

                      return (
                        <button
                          key={
                            category.id
                          }
                          type="button"
                          className={
                            "cat-tab" +
                            (category.id ===
                            activeCategory
                              ? " active"
                              : "")
                          }
                          onClick={() =>
                            handleCategory(
                              category.id,
                            )
                          }
                        >
                          {
                            category.emoji
                          }{" "}
                          {
                            category.label
                          }

                          {count > 0 && (
                            <span className="category-count">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>

                <button
                  type="button"
                  className={
                    "cat-tabs-arrow cat-tabs-arrow-right" +
                    (canScrollRight
                      ? ""
                      : " is-hidden")
                  }
                  onClick={() =>
                    scrollCatTabs(
                      "right",
                    )
                  }
                  aria-label="Scroll categories right"
                  tabIndex={
                    canScrollRight
                      ? 0
                      : -1
                  }
                >
                  <ChevronRight
                    size={18}
                  />
                </button>
              </div>

              <div className="search-fields">
                <label className="field">
                  <span>
                    Where are you going?
                  </span>

                  <div className="travel-search-input">
                    <MapPin size={17} />

                    <input
                      type="search"
                      value={search}
                      onChange={(
                        event,
                      ) =>
                        setSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Country, department, city, area or property"
                      aria-label="Search destination, country, department, city, or property"
                    />
                  </div>
                </label>

                <label className="field">
                  <span>
                    Check-in
                  </span>

                  <div className="travel-search-input">
                    <CalendarDays
                      size={17}
                    />

                    <input
                      type="date"
                      value={checkIn}
                      onChange={(
                        event,
                      ) =>
                        setCheckIn(
                          event.target
                            .value,
                        )
                      }
                    />
                  </div>
                </label>

                <label className="field">
                  <span>
                    Check-out
                  </span>

                  <div className="travel-search-input">
                    <CalendarDays
                      size={17}
                    />

                    <input
                      type="date"
                      value={checkOut}
                      min={
                        checkIn ||
                        undefined
                      }
                      onChange={(
                        event,
                      ) =>
                        setCheckOut(
                          event.target
                            .value,
                        )
                      }
                    />
                  </div>
                </label>

                <label className="field">
                  <span>
                    Travelers
                  </span>

                  <div className="travel-search-input">
                    <Users size={17} />

                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={guests}
                      onChange={(
                        event,
                      ) =>
                        setGuests(
                          Math.max(
                            1,
                            Number(
                              event
                                .target
                                .value,
                            ) || 1,
                          ),
                        )
                      }
                    />
                  </div>
                </label>

                <button
                  className="search-submit"
                  type="submit"
                >
                  <Search size={17} />
                  Search
                </button>
              </div>
            </form>
          </div>
        </section>

        <section
          className="tight"
          id="explore"
        >
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Explore Fockis Travel
                </div>

                <h2>
                  Everything in one
                  marketplace
                </h2>

                <p>
                  Search verified
                  businesses and real
                  travel inventory by
                  service, destination,
                  country, department,
                  state, city, or
                  property.
                </p>
              </div>
            </div>

            <div className="category-tile-grid">
              {SEARCH_CATEGORIES.filter(
                (category) =>
                  category.id !==
                  "all",
              ).map(
                (category) => {
                  const count =
                    categoryCounts.get(
                      category.type,
                    ) || 0;

                  return (
                    <button
                      type="button"
                      className="category-tile"
                      key={
                        category.id
                      }
                      onClick={() =>
                        handleCategory(
                          category.id,
                        )
                      }
                    >
                      <span className="category-tile-icon">
                        {
                          category.emoji
                        }
                      </span>

                      <span className="category-tile-name">
                        {
                          category.label
                        }
                      </span>

                      <span className="category-tile-count">
                        {count}{" "}
                        {count === 1
                          ? "listing"
                          : "listings"}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </section>

        <section
          className="tight"
          id="businesses"
        >
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Verified Travel businesses
                </div>

                <h2>
                  Discover businesses
                  before they list
                </h2>

                <p>
                  Approved and active
                  Travel businesses are
                  publicly discoverable
                  even when they have not
                  published their first
                  listing yet.
                </p>
              </div>

              <div className="listing-actions">
                {refreshing ? (
                  <span className="refreshing">
                    <Loader2
                      size={14}
                      className="travel-booking-spinner"
                    />
                    Refreshing
                  </span>
                ) : (
                  <button
                    type="button"
                    className="section-link section-button"
                    onClick={() =>
                      void loadTravelData(
                        true,
                      )
                    }
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>

            {businessError && (
              <div
                className="travel-error"
                role="alert"
              >
                <AlertCircle
                  size={21}
                />

                <div>
                  <strong>
                    Verified businesses
                    could not be loaded
                  </strong>

                  <p>
                    {businessError}
                  </p>
                </div>
              </div>
            )}

            {businessLoading ? (
              <div className="travel-loading">
                <Loader2
                  size={34}
                  className="travel-booking-spinner"
                />

                <strong>
                  Loading verified
                  businesses...
                </strong>

                <span>
                  Connecting to the
                  Fockis Travel partner
                  marketplace.
                </span>
              </div>
            ) : homeBusinesses.length >
              0 ? (
              <div className="grid-cards">
                {homeBusinesses.map(
                  (
                    business,
                  ) => (
                    <BusinessCard
                      key={getBusinessId(
                        business,
                      )}
                      business={
                        business
                      }
                      listingCount={getBusinessListingCount(
                        business,
                      )}
                    />
                  ),
                )}
              </div>
            ) : !businessError ? (
              <div className="empty-listings">
                <MapPin size={34} />

                <h3>
                  No verified businesses
                  yet
                </h3>

                <p>
                  Approved Travel
                  businesses will appear
                  here automatically.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section id="live-listings">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Live marketplace
                </div>

                <h2>
                  {search.trim()
                    ? 'Results for "' +
                      search.trim() +
                      '"'
                    : activeType
                      ? SEARCH_CATEGORIES.find(
                          (
                            category,
                          ) =>
                            category.type ===
                            activeType,
                        )?.label ||
                        "Travel listings"
                      : "Discover places to book"}
                </h2>

                <p>
                  These listings are
                  loaded directly from
                  Fockis Travel inventory.
                </p>
              </div>

              <div className="listing-actions">
                {refreshing ? (
                  <span className="refreshing">
                    <Loader2
                      size={14}
                      className="travel-booking-spinner"
                    />
                    Refreshing
                  </span>
                ) : (
                  <button
                    type="button"
                    className="section-link section-button"
                    onClick={() =>
                      void loadTravelData(
                        true,
                      )
                    }
                  >
                    Refresh
                  </button>
                )}

                <Link
                  to="/travel/stays"
                  className="section-link"
                >
                  View all stays{" "}
                  <ArrowRight
                    size={14}
                  />
                </Link>
              </div>
            </div>

            {error && (
              <div
                className="travel-error"
                role="alert"
              >
                <AlertCircle
                  size={21}
                />

                <div>
                  <strong>
                    Travel listings
                    could not be loaded
                  </strong>

                  <p>{error}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="travel-loading">
                <Loader2
                  size={34}
                  className="travel-booking-spinner"
                />

                <strong>
                  Loading Fockis Travel...
                </strong>

                <span>
                  Connecting to the Fockis
                  Travel marketplace.
                </span>
              </div>
            ) : homeListings.length >
              0 ? (
              <div className="grid-cards">
                {homeListings.map(
                  (
                    listing,
                    index,
                  ) => (
                    <ListingCard
                      key={
                        getListingId(
                          listing,
                        ) ||
                        getListingName(
                          listing,
                        ) +
                          "-" +
                          index
                      }
                      listing={
                        listing
                      }
                      index={
                        index
                      }
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="empty-listings">
                <MapPin size={34} />

                <h3>
                  No matching
                  listings yet
                </h3>

                <p>
                  Try another country,
                  department, state,
                  city, property name,
                  or travel category.
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory(
                      "all",
                    );
                  }}
                >
                  Show all listings
                </button>
              </div>
            )}
          </div>
        </section>

        <section
          className="tight"
          id="destinations"
        >
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Destinations
                </div>

                <h2>
                  Search by location
                </h2>

                <p>
                  Destinations are
                  generated from verified
                  businesses and real
                  listings.
                </p>
              </div>

              <Link
                to="/travel/destinations"
                className="section-link"
              >
                View destinations{" "}
                <ArrowRight size={14} />
              </Link>
            </div>

            {destinations.length >
            0 ? (
              <div className="world-strip">
                {destinations.map(
                  (
                    destination,
                  ) => (
                    <button
                      type="button"
                      className="world-card"
                      key={[
                        destination.country,
                        destination.state,
                        destination.city,
                      ].join("-")}
                      onClick={() =>
                        handleDestinationSearch(
                          destination,
                        )
                      }
                      style={
                        destination.image
                          ? {
                              backgroundImage:
                                'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.72)), url("' +
                                destination.image +
                                '")',
                            }
                          : undefined
                      }
                    >
                      <div>
                        <div className="flag">
                          📍
                        </div>

                        <div className="name">
                          {
                            destination.city
                          }
                        </div>

                        <div className="count">
                          {
                            destination.country
                          }

                          {destination.state
                            ? " · " +
                              destination.state
                            : ""}

                          {" · "}

                          {
                            destination.count
                          }{" "}
                          {destination.count ===
                          1
                            ? "business/listing"
                            : "businesses/listings"}
                        </div>
                      </div>
                    </button>
                  ),
                )}
              </div>
            ) : (
              <div className="destination-empty">
                Destinations will appear
                here as verified Travel
                businesses and real
                listings become available.
              </div>
            )}
          </div>
        </section>

        <section
          className="dark-band"
          id="business"
        >
          <div className="wrap">
            <div className="biz-grid">
              <div>
                <div className="eyebrow">
                  Business Travel
                </div>

                <h2>
                  Travel for business
                </h2>

                <p>
                  Find hotels, meeting
                  spaces,
                  transportation,
                  restaurants, and other
                  services for your next
                  business trip.
                </p>

                <Link
                  to="/travel/business"
                  className="btn btn-amber"
                >
                  Explore business
                  travel{" "}
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="boarding-card">
                <div className="boarding-top">
                  <div>
                    <div className="k">
                      Fockis Travel
                    </div>

                    <div className="v">
                      Business trip
                    </div>
                  </div>

                  <div>
                    <div className="k">
                      Marketplace
                    </div>

                    <div className="v mono">
                      Live inventory
                    </div>
                  </div>
                </div>

                <div className="perforation" />

                <div className="boarding-body">
                  <div className="stub-row">
                    <span className="lbl">
                      Hotel
                    </span>

                    <span className="val">
                      Stay
                    </span>
                  </div>

                  <div className="stub-row">
                    <span className="lbl">
                      Meeting space
                    </span>

                    <span className="val">
                      Hourly
                    </span>
                  </div>

                  <div className="stub-row">
                    <span className="lbl">
                      Transportation
                    </span>

                    <span className="val">
                      Local
                    </span>
                  </div>

                  <div className="stub-row">
                    <span className="lbl">
                      Restaurant
                    </span>

                    <span className="val">
                      Dining
                    </span>
                  </div>

                  <div className="stub-total">
                    <span className="lbl mono">
                      One marketplace
                    </span>

                    <span className="amt">
                      FOCKIS
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Plan your trip
                </div>

                <h2>
                  From search to booking
                </h2>

                <p>
                  Find a real listing,
                  review its details, and
                  continue to the Fockis
                  Travel booking flow.
                </p>
              </div>
            </div>

            <div className="globe-grid">
              <div className="globe-tile">
                <div className="ic">
                  <Search size={23} />
                </div>

                <div className="t">
                  Search
                </div>

                <p>
                  Search by country,
                  department, city, or
                  property.
                </p>
              </div>

              <div className="globe-tile">
                <div className="ic">
                  <MapPin size={23} />
                </div>

                <div className="t">
                  Choose
                </div>

                <p>
                  Open a verified Travel
                  business or a real
                  listing.
                </p>
              </div>

              <div className="globe-tile">
                <div className="ic">
                  <CalendarDays
                    size={23}
                  />
                </div>

                <div className="t">
                  Book
                </div>

                <p>
                  Select your dates,
                  travelers, quantity, and
                  notes when a listing is
                  available.
                </p>
              </div>

              <div className="globe-tile">
                <div className="ic">
                  <CheckCircle2
                    size={23}
                  />
                </div>

                <div className="t">
                  My Trips
                </div>

                <p>
                  Keep your confirmed
                  bookings in one place.
                </p>
              </div>
            </div>

            <div className="center-action">
              <Link
                to="/travel/stays"
                className="btn btn-primary"
              >
                Browse all stays{" "}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        <section
          className="tight"
          id="partner"
        >
          <div className="wrap">
            <div className="partner-band">
              <div>
                <h2>
                  Grow your business
                  with Fockis Travel
                </h2>

                <p>
                  Hotels, restaurants,
                  experiences, meeting
                  spaces, transportation
                  providers, and other
                  travel businesses can
                  create listings and reach
                  Fockis travelers.
                </p>

                <Link
                  to="/travel/partner"
                  className="btn btn-primary"
                >
                  Become a travel
                  partner{" "}
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="partner-icons">
                <span>🏨</span>
                <span>🏠</span>
                <span>🍽️</span>
                <span>🚗</span>
                <span>🚐</span>
                <span>💼</span>
                <span>🎉</span>
                <span>🏝️</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="eyebrow">
                  Trust & Safety
                </div>

                <h2>
                  Book with confidence
                </h2>
              </div>
            </div>

            <div className="trust-grid">
              {TRUST_ITEMS.map(
                (item) => (
                  <div
                    className="trust-item"
                    key={
                      item.title
                    }
                  >
                    <div className="check">
                      <ShieldCheck
                        size={18}
                      />
                    </div>

                    <div>
                      <h5>
                        {item.title}
                      </h5>

                      <p>
                        {item.body}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}