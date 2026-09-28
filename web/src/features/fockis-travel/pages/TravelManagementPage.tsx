import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Globe2,
  Hotel,
  MapPinned,
  Package,
  Plane,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Ticket,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import { Link } from "react-router-dom";

import { travelApi } from "../services/travelApi";
import type { ListingType, TravelListing } from "../services/listingsApi";
import "../styles/TravelManagementPage.scss";

/* ============================================================================
   FOCKIS TRAVEL — MANAGEMENT PAGE
   ============================================================================ */

interface ManagementCard {
  title: string;
  description: string;
  icon: ElementType;
  href: string;
  type: ListingType;
  statLabel: string;
}

const MANAGEMENT_CARDS: ManagementCard[] = [
  {
    title: "Manage Stays",
    description:
      "Create and manage hotels, apartments, villas, rooms, rates, availability and reservations.",
    icon: Hotel,
    href: "/travel/stays",
    type: "stay",
    statLabel: "Active listings",
  },
  {
    title: "Manage Restaurants",
    description:
      "Manage restaurants, menus, dining availability, reservations and customer bookings.",
    icon: Utensils,
    href: "/travel/restaurants",
    type: "restaurant",
    statLabel: "Restaurants",
  },
  {
    title: "Manage Cars",
    description:
      "Manage rental vehicles, pricing, availability, locations and reservations.",
    icon: Car,
    href: "/travel/cars",
    type: "car",
    statLabel: "Vehicles",
  },
  {
    title: "Manage Experiences",
    description:
      "Create tours, activities and experiences with schedules, pricing and capacity.",
    icon: Ticket,
    href: "/travel/experiences",
    type: "experience",
    statLabel: "Experiences",
  },
  {
    title: "Manage Meetings",
    description:
      "Manage meeting rooms, conference spaces, equipment, schedules and bookings.",
    icon: BriefcaseBusiness,
    href: "/travel/meetings",
    type: "meeting",
    statLabel: "Meeting spaces",
  },
  {
    title: "Manage Transportation",
    description:
      "Manage airport transfers, private drivers, shuttles, routes and transportation services.",
    icon: Plane,
    href: "/travel/transfers",
    type: "transfer",
    statLabel: "Services",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Add a listing",
    description: "Create a new travel listing",
    icon: Plus,
    href: "/travel/partner/listings/new",
  },
  {
    title: "My listings",
    description: "View and manage your published listings",
    icon: Package,
    href: "/travel/partner/listings",
  },
  {
    title: "Reservations",
    description: "Manage customer reservations and bookings",
    icon: ClipboardList,
    href: "/travel/partner/reservations",
  },
  {
    title: "Business dashboard",
    description: "Manage your travel business",
    icon: Store,
    href: "/travel/business",
  },
  {
    title: "Partner management",
    description: "Manage your Fockis Travel partnership",
    icon: Users,
    href: "/travel/partner",
  },
];

/* ============================================================================
   API RESPONSE SHAPES
   ============================================================================ */

interface ListingResponse {
  items?: TravelListing[];
  data?: TravelListing[] | ListingResponse;
  listings?: TravelListing[];
  total?: number;
  count?: number;
}

interface PartnerResponse {
  id?: string;
  _id?: string;
  userId?: string;
  ownerId?: string;
  businessName?: string;
  status?: string;
  active?: boolean;
  verified?: boolean;
  data?: PartnerResponse;
}

interface BookingRecord {
  id?: string;
  _id?: string;
  status?: string;
  total?: number;
  grandTotal?: number;
  amount?: number;
  subtotal?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BookingResponse {
  items?: BookingRecord[];
  bookings?: BookingRecord[];
  data?: BookingRecord[] | BookingResponse;
  total?: number;
  count?: number;
}

interface DashboardState {
  loading: boolean;
  error: string | null;
  listings: TravelListing[];
  listingTotals: Partial<Record<ListingType, number>>;
  reservations: number;
  customers: number;
  revenue: number | null;
  revenueCurrency: string;
  revenueGrowth: number | null;
  partner: PartnerResponse | null;
}

const INITIAL_DASHBOARD: DashboardState = {
  loading: true,
  error: null,
  listings: [],
  listingTotals: {},
  reservations: 0,
  customers: 0,
  revenue: null,
  revenueCurrency: "USD",
  revenueGrowth: null,
  partner: null,
};

/* ============================================================================
   HELPERS
   ============================================================================ */

function unwrapData<T>(value: unknown): T {
  if (
    value !== null &&
    typeof value === "object" &&
    "data" in value
  ) {
    return unwrapData<T>(
      (value as { data: unknown }).data,
    );
  }

  return value as T;
}

function normalizeListings(response: unknown): TravelListing[] {
  const raw = unwrapData<ListingResponse | TravelListing[]>(
    response,
  );

  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw.items)) {
    return raw.items;
  }

  if (Array.isArray(raw.listings)) {
    return raw.listings;
  }

  return [];
}

function getListingType(
  listing: TravelListing,
): ListingType | null {
  const type = String(
    listing.type ?? "",
  ).toLowerCase();

  const supported: ListingType[] = [
    "stay",
    "rental",
    "meeting",
    "event",
    "restaurant",
    "car",
    "flight",
    "transfer",
    "experience",
    "attraction",
    "thing",
  ];

  if (
    supported.includes(
      type as ListingType,
    )
  ) {
    return type as ListingType;
  }

  return null;
}

function isActiveListing(
  listing: TravelListing,
): boolean {
  if (listing.active === false) {
    return false;
  }

  const status = String(
    listing.status ?? "",
  ).toLowerCase();

  if (
    status === "inactive" ||
    status === "disabled" ||
    status === "archived" ||
    status === "rejected"
  ) {
    return false;
  }

  return true;
}

function getBookingRecords(
  response: unknown,
): BookingRecord[] {
  const raw = unwrapData<
    BookingResponse | BookingRecord[]
  >(response);

  if (Array.isArray(raw)) {
    return raw;
  }

  if (Array.isArray(raw.items)) {
    return raw.items;
  }

  if (Array.isArray(raw.bookings)) {
    return raw.bookings;
  }

  return [];
}

function getBookingTotal(
  response: unknown,
): number | null {
  const raw = unwrapData<BookingResponse>(
    response,
  );

  if (
    typeof raw.total === "number" &&
    Number.isFinite(raw.total)
  ) {
    return raw.total;
  }

  if (
    typeof raw.count === "number" &&
    Number.isFinite(raw.count)
  ) {
    return raw.count;
  }

  return null;
}

function getPartnerStatus(
  partner: PartnerResponse | null,
): string {
  if (!partner) {
    return "Business workspace";
  }

  if (partner.verified === true) {
    return "Verified partner";
  }

  const status = String(
    partner.status ?? "",
  ).toLowerCase();

  if (status === "verified") {
    return "Verified partner";
  }

  if (status === "pending") {
    return "Application pending";
  }

  if (status === "suspended") {
    return "Partner suspended";
  }

  if (status === "rejected") {
    return "Application needs attention";
  }

  return "Business workspace";
}

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    "en-US",
  ).format(value);
}

function formatCurrency(
  value: number | null,
  currency = "USD",
): string {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      },
    ).format(value);
  } catch {
    return `${currency} ${Math.round(
      value,
    ).toLocaleString()}`;
  }
}

function extractCustomerKey(
  booking: BookingRecord,
): string | null {
  const source =
    booking as BookingRecord & {
      userId?: string;
      customerId?: string;
      travelerId?: string;
      guestId?: string;
      user?: {
        id?: string;
        _id?: string;
      };
      customer?: {
        id?: string;
        _id?: string;
      };
    };

  return (
    source.customerId ??
    source.userId ??
    source.travelerId ??
    source.guestId ??
    source.customer?.id ??
    source.customer?._id ??
    source.user?.id ??
    source.user?._id ??
    null
  );
}

function getBookingRevenue(
  bookings: BookingRecord[],
): {
  revenue: number | null;
  currency: string;
} {
  let revenue = 0;
  let foundAmount = false;
  let currency = "USD";

  for (const booking of bookings) {
    const status = String(
      booking.status ?? "",
    ).toLowerCase();

    if (
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected" ||
      status === "failed"
    ) {
      continue;
    }

    let amount: number | null = null;

    if (
      typeof booking.grandTotal ===
      "number"
    ) {
      amount = booking.grandTotal;
    } else if (
      typeof booking.total === "number"
    ) {
      amount = booking.total;
    } else if (
      typeof booking.amount === "number"
    ) {
      amount = booking.amount;
    } else if (
      typeof booking.subtotal === "number"
    ) {
      amount = booking.subtotal;
    }

    if (
      amount !== null &&
      Number.isFinite(amount)
    ) {
      revenue += amount;
      foundAmount = true;
    }

    if (
      typeof booking.currency ===
        "string" &&
      booking.currency.trim().length > 0
    ) {
      currency =
        booking.currency.toUpperCase();
    }
  }

  return {
    revenue: foundAmount
      ? revenue
      : null,
    currency,
  };
}

/* ============================================================================
   PAGE
   ============================================================================ */

export default function TravelManagementPage() {
  const [dashboard, setDashboard] =
    useState<DashboardState>(
      INITIAL_DASHBOARD,
    );

  const loadDashboard =
    useCallback(async () => {
      if (!travelApi.hasAuthToken()) {
        setDashboard({
          ...INITIAL_DASHBOARD,
          loading: false,
          error:
            "Sign in to load your travel business data.",
        });

        return;
      }

      setDashboard((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const [
          listingsResult,
          partnerResult,
          bookingsResult,
        ] = await Promise.allSettled([
          travelApi.get(
            "/travel/listings",
            {
              limit: 100,
              skip: 0,
            },
          ),
          travelApi.get(
            "/travel/partners/me/profile",
          ),
          travelApi.get(
            "/travel/bookings",
          ),
        ]);

        const listings =
          listingsResult.status ===
          "fulfilled"
            ? normalizeListings(
                listingsResult.value,
              )
            : [];

        const partner =
          partnerResult.status ===
          "fulfilled"
            ? unwrapData<PartnerResponse>(
                partnerResult.value,
              )
            : null;

        const bookingPayload =
          bookingsResult.status ===
          "fulfilled"
            ? bookingsResult.value
            : null;

        const bookings =
          bookingPayload !== null
            ? getBookingRecords(
                bookingPayload,
              )
            : [];

        const bookingTotal =
          bookingPayload !== null
            ? getBookingTotal(
                bookingPayload,
              )
            : null;

        const listingTotals: Partial<
          Record<ListingType, number>
        > = {};

        for (const listing of listings) {
          if (
            !isActiveListing(listing)
          ) {
            continue;
          }

          const type =
            getListingType(listing);

          if (type === null) {
            continue;
          }

          listingTotals[type] =
            (listingTotals[type] ?? 0) +
            1;
        }

        const customers = new Set(
          bookings
            .map(extractCustomerKey)
            .filter(
              (
                value,
              ): value is string =>
                Boolean(value),
            ),
        ).size;

        const revenueData =
          getBookingRevenue(
            bookings,
          );

        const errors: string[] = [];

        if (
          listingsResult.status ===
          "rejected"
        ) {
          errors.push(
            "Inventory data could not be loaded.",
          );
        }

        if (
          partnerResult.status ===
          "rejected"
        ) {
          errors.push(
            "Partner information could not be loaded.",
          );
        }

        if (
          bookingsResult.status ===
          "rejected"
        ) {
          errors.push(
            "Booking data could not be loaded.",
          );
        }

        setDashboard({
          loading: false,
          error:
            errors.length > 0
              ? errors.join(" ")
              : null,
          listings,
          listingTotals,
          reservations:
            bookingTotal ??
            bookings.length,
          customers,
          revenue:
            revenueData.revenue,
          revenueCurrency:
            revenueData.currency,
          revenueGrowth: null,
          partner,
        });
      } catch (error) {
        setDashboard({
          ...INITIAL_DASHBOARD,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load travel management data.",
        });
      }
    }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activeListings =
    useMemo(
      () =>
        dashboard.listings.filter(
          isActiveListing,
        ).length,
      [dashboard.listings],
    );

  const managementCards =
    useMemo(
      () =>
        MANAGEMENT_CARDS.map(
          (card) => ({
            ...card,
            stat: dashboard.loading
              ? "…"
              : formatNumber(
                  dashboard
                    .listingTotals[
                    card.type
                  ] ?? 0,
                ),
          }),
        ),
      [
        dashboard.loading,
        dashboard.listingTotals,
      ],
    );

  const partnerStatus =
    getPartnerStatus(
      dashboard.partner,
    );

  return (
    <div className="travel-management-page">
      {/* =====================================================================
          HERO
          ===================================================================== */}

      <section
        style={{
          padding: "48px 0 30px",
          background:
            "linear-gradient(135deg, #ffffff 0%, #f1f4f8 52%, #e8edf3 100%)",
          borderBottom:
            "1px solid #d5dde7",
        }}
      >
        <div className="wrap">
          <Link
            to="/travel"
            className="section-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={16} />
            Back to Travel
          </Link>

          <div
            style={{
              display: "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 30,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                maxWidth: 720,
              }}
            >
              <div className="eyebrow">
                FOCKIS TRAVEL MANAGEMENT
              </div>

              <h1
                style={{
                  marginTop: 10,
                  fontSize:
                    "clamp(34px, 5vw, 56px)",
                  lineHeight: 1.02,
                  letterSpacing:
                    "-0.04em",
                  color: "#07182f",
                  fontWeight: 800,
                }}
              >
                Manage your
                <br />
                <span
                  style={{
                    color: "#b97812",
                  }}
                >
                  travel business.
                </span>
              </h1>

              <p
                style={{
                  maxWidth: 650,
                  marginTop: 18,
                  color: "#35485f",
                  fontSize: 16,
                  lineHeight: 1.65,
                }}
              >
                One professional
                workspace for
                managing stays,
                restaurants, vehicles,
                experiences, meeting
                spaces, transportation,
                listings, bookings and
                your Fockis Travel
                business.
              </p>
            </div>

            <div
              className="panel"
              style={{
                minWidth: 250,
                maxWidth: 320,
                flex: "1 1 250px",
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background:
                      "#163a5f",
                    color: "#ffffff",
                  }}
                >
                  <ShieldCheck
                    size={23}
                  />
                </div>

                <div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "#43546b",
                      textTransform:
                        "uppercase",
                    }}
                  >
                    Management status
                  </div>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 3,
                      color: "#0a1830",
                    }}
                  >
                    {dashboard.loading
                      ? "Loading workspace…"
                      : partnerStatus}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 7,
                  marginTop: 18,
                  color:
                    dashboard.loading
                      ? "#43546b"
                      : "#2f7d55",
                  fontSize: 13,
                  fontWeight: 750,
                }}
              >
                <CheckCircle2
                  size={16}
                />

                {dashboard.loading
                  ? "Loading real business data"
                  : "Connected to Fockis Travel"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ERROR
          ===================================================================== */}

      {dashboard.error && (
        <section
          className="tight"
          style={{
            paddingBottom: 0,
          }}
        >
          <div className="wrap">
            <div
              className="panel"
              style={{
                padding: "13px 16px",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  color: "#43546b",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {dashboard.error}
              </div>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() =>
                  void loadDashboard()
                }
                disabled={
                  dashboard.loading
                }
              >
                Refresh
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          BUSINESS OVERVIEW
          ===================================================================== */}

      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Business Overview
              </div>

              <h2>
                Everything in one place
              </h2>

              <p>
                Monitor your travel
                inventory and move
                quickly between the
                services you operate.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
            }}
          >
            <OverviewStat
              icon={Package}
              value={
                dashboard.loading
                  ? "…"
                  : formatNumber(
                      activeListings,
                    )
              }
              label="Active listings"
            />

            <OverviewStat
              icon={ClipboardList}
              value={
                dashboard.loading
                  ? "…"
                  : formatNumber(
                      dashboard.reservations,
                    )
              }
              label="Reservations"
            />

            <OverviewStat
              icon={Users}
              value={
                dashboard.loading
                  ? "…"
                  : formatNumber(
                      dashboard.customers,
                    )
              }
              label="Customers"
            />

            <OverviewStat
              icon={
                CircleDollarSign
              }
              value={
                dashboard.loading
                  ? "…"
                  : formatCurrency(
                      dashboard.revenue,
                      dashboard.revenueCurrency,
                    )
              }
              label="Booking revenue"
            />

            <OverviewStat
              icon={TrendingUp}
              value={
                dashboard.loading
                  ? "…"
                  : dashboard.revenueGrowth ===
                      null
                    ? "—"
                    : `${
                        dashboard.revenueGrowth >
                        0
                          ? "+"
                          : ""
                      }${dashboard.revenueGrowth.toFixed(
                        1,
                      )}%`
              }
              label="Revenue growth"
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          RESERVATIONS
          ===================================================================== */}

      <section
        className="tight"
        style={{
          paddingTop: 0,
        }}
      >
        <div className="wrap">
          <Link
            to="/travel/partner/reservations"
            className="panel"
            style={{
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 20,
              padding: 20,
              textDecoration:
                "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "rgba(22, 58, 95, 0.09)",
                  color: "#163a5f",
                  flexShrink: 0,
                }}
              >
                <ClipboardList
                  size={23}
                />
              </div>

              <div>
                <div
                  className="eyebrow"
                  style={{
                    marginBottom: 3,
                  }}
                >
                  Reservation Management
                </div>

                <strong
                  style={{
                    display: "block",
                    fontSize: 18,
                    color: "#0a1830",
                  }}
                >
                  Manage Reservations
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#43546b",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  View customer
                  reservations, open
                  reservation details,
                  contact customers and
                  manage booking status.
                </span>
              </div>
            </div>

            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 8,
                flexShrink: 0,
                padding:
                  "11px 15px",
                borderRadius: 9,
                background:
                  "#163a5f",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Open Reservations
              <ChevronRight
                size={17}
              />
            </div>
          </Link>
        </div>
      </section>

      {/* =====================================================================
          CREATE INVENTORY
          ===================================================================== */}

      <section className="tight">
        <div className="wrap">
          <div
            className="panel"
            style={{
              padding: 26,
              background:
                "linear-gradient(135deg, #07182f 0%, #0a1830 48%, #163a5f 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "rgba(240, 169, 62, 0.16)",
                  color: "#f0a93e",
                  flexShrink: 0,
                }}
              >
                <Plus size={25} />
              </div>

              <div>
                <div
                  className="eyebrow"
                  style={{
                    color: "#f0a93e",
                  }}
                >
                  Create inventory
                </div>

                <h2
                  style={{
                    marginTop: 5,
                    color: "#ffffff",
                    fontSize: 25,
                  }}
                >
                  Add a new travel
                  listing
                </h2>

                <p
                  style={{
                    marginTop: 6,
                    color:
                      "rgba(255, 255, 255, 0.82)",
                    fontSize: 13.5,
                  }}
                >
                  Publish a hotel,
                  restaurant, vehicle,
                  experience, meeting
                  space or
                  transportation
                  service.
                </p>
              </div>
            </div>

            <Link
              to="/travel/partner/listings/new"
              className="btn btn-amber"
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 8,
              }}
            >
              Create listing
              <ChevronRight
                size={16}
              />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          MANAGEMENT CENTER
          ===================================================================== */}

      <section>
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Management Center
              </div>

              <h2>
                Manage your travel
                services
              </h2>

              <p>
                Select a service below
                to manage its listings,
                inventory, availability
                and reservations.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 18,
            }}
          >
            {managementCards.map(
              (card) => {
                const Icon =
                  card.icon;

                return (
                  <Link
                    key={card.title}
                    to={card.href}
                    style={{
                      textDecoration:
                        "none",
                    }}
                  >
                    <div
                      className="panel"
                      style={{
                        height: "100%",
                        padding: 22,
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
                          gap: 16,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            display:
                              "grid",
                            placeItems:
                              "center",
                            background:
                              "rgba(22, 58, 95, 0.09)",
                            color:
                              "#163a5f",
                          }}
                        >
                          <Icon
                            size={23}
                          />
                        </div>

                        <ChevronRight
                          size={19}
                          color="#718096"
                        />
                      </div>

                      <h3
                        style={{
                          marginTop: 20,
                          fontSize: 19,
                          color:
                            "#0a1830",
                        }}
                      >
                        {card.title}
                      </h3>

                      <p
                        style={{
                          marginTop: 8,
                          color:
                            "#43546b",
                          fontSize:
                            13.5,
                          lineHeight:
                            1.55,
                        }}
                      >
                        {
                          card.description
                        }
                      </p>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 9,
                          marginTop: 20,
                          paddingTop: 16,
                          borderTop:
                            "1px solid #dce2e9",
                        }}
                      >
                        <strong
                          className="mono"
                          style={{
                            fontSize: 18,
                            color:
                              "#163a5f",
                          }}
                        >
                          {
                            card.stat
                          }
                        </strong>

                        <span
                          style={{
                            color:
                              "#43546b",
                            fontSize:
                              12,
                          }}
                        >
                          {
                            card.statLabel
                          }
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          QUICK ACTIONS
          ===================================================================== */}

      <section className="tight">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Quick Actions
              </div>

              <h2>
                Get things done faster
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {QUICK_ACTIONS.map(
              (action) => {
                const Icon =
                  action.icon;

                return (
                  <Link
                    key={action.title}
                    to={action.href}
                    className="btn btn-outline"
                    style={{
                      minHeight: 86,
                      justifyContent:
                        "flex-start",
                      textAlign:
                        "left",
                      padding:
                        "16px 18px",
                      gap: 13,
                      textDecoration:
                        "none",
                    }}
                  >
                    <Icon
                      size={21}
                    />

                    <span>
                      <strong
                        style={{
                          display:
                            "block",
                          fontSize: 14,
                          color:
                            "#0a1830",
                        }}
                      >
                        {
                          action.title
                        }
                      </strong>

                      <small
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                          color:
                            "#43546b",
                          fontSize:
                            11.5,
                        }}
                      >
                        {
                          action.description
                        }
                      </small>
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          PROFESSIONAL TOOLS
          ===================================================================== */}

      <section className="dark-band">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">
                Built for Travel
                Businesses
              </div>

              <h2
                style={{
                  fontSize: 32,
                  color: "#ffffff",
                }}
              >
                Professional tools
                for every operation
              </h2>

              <p
                style={{
                  color:
                    "rgba(255, 255, 255, 0.78)",
                  maxWidth: 650,
                }}
              >
                Fockis Travel
                management is designed
                to give businesses a
                single place to organize
                inventory, customers,
                reservations and
                operations.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <Feature
              icon={BarChart3}
              title="Business analytics"
              text="Track reservations, revenue and performance."
            />

            <Feature
              icon={MapPinned}
              title="Global locations"
              text="Manage services across multiple destinations."
            />

            <Feature
              icon={Globe2}
              title="International customers"
              text="Serve local and international travelers."
            />

            <Feature
              icon={Settings}
              title="Operations"
              text="Keep inventory and availability organized."
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          FINAL CTA
          ===================================================================== */}

      <section>
        <div className="wrap">
          <div
            className="panel"
            style={{
              padding:
                "32px 28px",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="eyebrow">
                Fockis Travel
              </div>

              <h3
                style={{
                  fontSize: 23,
                  marginTop: 6,
                  color:
                    "#0a1830",
                }}
              >
                Ready to grow your
                travel business?
              </h3>

              <p
                style={{
                  marginTop: 7,
                  color:
                    "#43546b",
                  fontSize: 13.5,
                }}
              >
                Add services, manage
                your listings and start
                accepting reservations.
              </p>
            </div>

            <div
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/travel/partner/reservations"
                className="btn btn-outline"
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  gap: 7,
                }}
              >
                Reservations
                <ClipboardList
                  size={16}
                />
              </Link>

              <Link
                to="/travel/partner/listings/new"
                className="btn btn-amber"
              >
                Add a listing →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
   OVERVIEW STAT
   ============================================================================ */

function OverviewStat({
  icon: Icon,
  value,
  label,
}: {
  icon: ElementType;
  value: string;
  label: string;
}) {
  return (
    <div
      className="panel"
      style={{
        padding: 19,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems:
            "center",
          gap: 11,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background:
              "rgba(22, 58, 95, 0.09)",
            color: "#163a5f",
          }}
        >
          <Icon size={19} />
        </div>

        <div>
          <div
            className="mono"
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0a1830",
            }}
          >
            {value}
          </div>

          <div
            style={{
              marginTop: 2,
              color: "#43546b",
              fontSize: 11.5,
            }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   FEATURE
   ============================================================================ */

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        padding: 20,
        border:
          "1px solid rgba(255, 255, 255, 0.12)",
        background:
          "rgba(255, 255, 255, 0.055)",
        borderRadius: 14,
      }}
    >
      <Icon
        size={22}
        color="#f0a93e"
      />

      <h4
        style={{
          marginTop: 14,
          color: "#ffffff",
        }}
      >
        {title}
      </h4>

      <p
        style={{
          marginTop: 6,
          color:
            "rgba(255, 255, 255, 0.72)",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {text}
      </p>
    </div>
  );
}