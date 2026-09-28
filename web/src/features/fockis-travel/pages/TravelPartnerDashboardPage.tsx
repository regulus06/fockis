import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  FileText,
  Globe2,
  ListChecks,
  MapPin,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Store,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { partnersApi } from "../services/partnersApi";
import { travelApi } from "../services/travelApi";
import "../styles/TravelPartnerDashboard.scss";

type PartnerStatus =
  | "pending"
  | "verified"
  | "suspended"
  | "rejected"
  | string;

interface Partner {
  _id?: string;
  id?: string;
  userId?: string;

  businessName?: string;
  category?: string;
  categories?: string[];
  description?: string;
  businessType?: string;

  phone?: string;
  email?: string;
  website?: string;

  address?: string;
  country?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  services?: string[];
  amenities?: string[];
  features?: string[];

  businessHours?: Record<string, unknown>;

  images?: string[];
  logo?: string;
  coverImage?: string;

  status?: PartnerStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  verifiedAt?: string;

  acceptingBookings?: boolean;
  active?: boolean;
  featured?: boolean;
  instantBooking?: boolean;

  cancellationPolicy?: string;
  bookingPolicy?: string;
  payoutCurrency?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface PartnerListing {
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

  status?: string;
  active?: boolean;

  city?: string;
  country?: string;
  address?: string;

  price?: number;
  priceFrom?: number;
  currency?: string;
  priceUnit?: string;

  image?: string;
  imageUrl?: string;
  thumbnail?: string;
  coverImage?: string;
  images?: string[];

  rejectionReason?: string;
  reviewNote?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface DashboardState {
  partner: Partner | null;
  listings: PartnerListing[];
}

function unwrapData<T>(response: unknown): T {
  if (
    response &&
    typeof response === "object" &&
    "data" in response
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

function extractListings(
  response: unknown,
): PartnerListing[] {
  const data = unwrapData<unknown>(response);

  if (Array.isArray(data)) {
    return data as PartnerListing[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const object =
    data as Record<string, unknown>;

  const candidates = [
    object.listings,
    object.items,
    object.results,
    object.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as PartnerListing[];
    }
  }

  return [];
}

function getListingId(
  listing: PartnerListing,
): string {
  return String(
    listing._id ?? listing.id ?? "",
  );
}

function getListingName(
  listing: PartnerListing,
): string {
  return (
    listing.title ||
    listing.name ||
    listing.businessName ||
    "Untitled listing"
  );
}

function getListingStatus(
  listing: PartnerListing,
): string {
  return String(
    listing.status || "",
  ).toLowerCase();
}

function isPublished(
  listing: PartnerListing,
): boolean {
  const status =
    getListingStatus(listing);

  return (
    status === "published" ||
    status === "approved" ||
    listing.active === true
  );
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatStatus(
  status?: string,
): string {
  const value = String(
    status || "draft",
  )
    .replace(/_/g, " ")
    .trim();

  if (!value) {
    return "Draft";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function statusClass(
  status?: string,
): string {
  const value = String(
    status || "",
  ).toLowerCase();

  if (
    value === "published" ||
    value === "approved"
  ) {
    return "is-success";
  }

  if (
    value === "pending_review" ||
    value === "pending" ||
    value === "under_review"
  ) {
    return "is-warning";
  }

  if (
    value === "rejected" ||
    value === "suspended"
  ) {
    return "is-danger";
  }

  return "is-neutral";
}

function initials(
  name?: string,
): string {
  const value = String(
    name || "Business",
  ).trim();

  if (!value) {
    return "B";
  }

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function TravelPartnerDashboardPage() {
  const [state, setState] =
    useState<DashboardState>({
      partner: null,
      listings: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(
      async (
        isRefresh = false,
      ) => {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const [
            partnerResponse,
            listingsResponse,
          ] = await Promise.all([
            partnersApi.getMine(),
            travelApi.get(
              "/travel/partners/listings",
            ),
          ]);

          const partner =
            unwrapData<Partner>(
              partnerResponse,
            );

          const listings =
            extractListings(
              listingsResponse,
            );

          setState({
            partner:
              partner || null,
            listings,
          });
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to load your Fockis Travel dashboard.";

          setError(message);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const partner = state.partner;
  const listings = state.listings;

  const stats = useMemo(() => {
    const drafts =
      listings.filter(
        (listing) =>
          getListingStatus(
            listing,
          ) === "draft",
      ).length;

    const pending =
      listings.filter(
        (listing) => {
          const status =
            getListingStatus(
              listing,
            );

          return (
            status ===
              "pending_review" ||
            status === "pending" ||
            status ===
              "under_review"
          );
        },
      ).length;

    const published =
      listings.filter(
        isPublished,
      ).length;

    const rejected =
      listings.filter(
        (listing) =>
          getListingStatus(
            listing,
          ) === "rejected",
      ).length;

    const suspended =
      listings.filter(
        (listing) =>
          getListingStatus(
            listing,
          ) === "suspended",
      ).length;

    return {
      total: listings.length,
      drafts,
      pending,
      published,
      rejected,
      suspended,
    };
  }, [listings]);

  const recentListings =
    useMemo(() => {
      return [...listings]
        .sort((a, b) => {
          const first =
            new Date(
              a.updatedAt ||
                a.createdAt ||
                0,
            ).getTime();

          const second =
            new Date(
              b.updatedAt ||
                b.createdAt ||
                0,
            ).getTime();

          return second - first;
        })
        .slice(0, 5);
    }, [listings]);

  const partnerStatus =
    String(
      partner?.status || "",
    ).toLowerCase();

  const isVerified =
    partnerStatus ===
      "verified" ||
    partnerStatus ===
      "approved";

  const isPending =
    partnerStatus === "pending";

  const isSuspended =
    partnerStatus === "suspended";

  const isRejected =
    partnerStatus === "rejected";

  const location = [
    partner?.city,
    partner?.state,
    partner?.country,
  ]
    .filter(Boolean)
    .join(", ");

  if (loading) {
    return (
      <div className="fockis-travel-root">
        <section className="travel-partner-dashboard">
          <div className="travel-partner-dashboard__loading">
            <RefreshCw
              size={24}
              className="travel-partner-dashboard__spin"
            />

            <span>
              Loading your partner
              dashboard...
            </span>
          </div>
        </section>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="fockis-travel-root">
        <section className="travel-partner-dashboard">
          <div className="travel-partner-dashboard__empty">
            <div className="travel-partner-dashboard__empty-icon">
              <Building2
                size={34}
              />
            </div>

            <h1>
              Become a Fockis
              Travel Partner
            </h1>

            <p>
              You need a Fockis
              Travel partner profile
              before you can manage
              listings and operate
              your business through
              Travel.
            </p>

            <Link
              to="/travel/partner"
              className="travel-partner-dashboard__primary-button"
            >
              Start partner
              application
              <ArrowRight
                size={18}
              />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fockis-travel-root">
      <section className="travel-partner-dashboard">
        <div className="travel-partner-dashboard__container">
          <div className="travel-partner-dashboard__topbar">
            <div>
              <div className="travel-partner-dashboard__eyebrow">
                FOCKIS TRAVEL
                PARTNER
              </div>

              <h1>
                Partner Dashboard
              </h1>

              <p>
                Manage your travel
                business, listings,
                and booking operations
                from one place.
              </p>
            </div>

            <div
              className="travel-partner-dashboard__topbar-actions"
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <Link
                to="/travel/management"
                className="travel-partner-dashboard__secondary-button"
                style={{
                  display:
                    "inline-flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: "8px",
                  textDecoration:
                    "none",
                }}
              >
                <Settings
                  size={17}
                />

                Access Management
                Page

                <ArrowRight
                  size={16}
                />
              </Link>

              <button
                type="button"
                onClick={() =>
                  void loadDashboard(
                    true,
                  )
                }
                disabled={
                  refreshing
                }
                className="travel-partner-dashboard__refresh"
              >
                <RefreshCw
                  size={17}
                  className={
                    refreshing
                      ? "travel-partner-dashboard__spin"
                      : undefined
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            </div>
          </div>

          {error && (
            <div className="travel-partner-dashboard__alert travel-partner-dashboard__alert--error">
              <AlertCircle
                size={20}
              />

              <div>
                <strong>
                  Dashboard update
                  failed
                </strong>

                <span>
                  {error}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  void loadDashboard(
                    true,
                  )
                }
              >
                Try again
              </button>
            </div>
          )}

          <div className="travel-partner-dashboard__business-card">
            <div className="travel-partner-dashboard__business-identity">
              <div className="travel-partner-dashboard__business-avatar">
                {partner.logo ? (
                  <img
                    src={partner.logo}
                    alt={
                      partner.businessName ||
                      "Business logo"
                    }
                  />
                ) : (
                  initials(
                    partner.businessName,
                  )
                )}
              </div>

              <div>
                <div className="travel-partner-dashboard__business-name">
                  {partner.businessName ||
                    "Your Business"}
                </div>

                <div className="travel-partner-dashboard__business-meta">
                  {partner.category ||
                    "Travel Partner"}

                  {location && (
                    <>
                      <span>
                        •
                      </span>

                      <MapPin
                        size={14}
                      />

                      {location}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="travel-partner-dashboard__business-actions">
              <span
                className={`travel-partner-dashboard__status ${statusClass(
                  partner.status,
                )}`}
              >
                {isVerified ? (
                  <CheckCircle2
                    size={16}
                  />
                ) : isSuspended ||
                  isRejected ? (
                  <XCircle
                    size={16}
                  />
                ) : (
                  <Clock3
                    size={16}
                  />
                )}

                {formatStatus(
                  partner.status,
                )}
              </span>

              <Link
                to="/travel/management"
                className="travel-partner-dashboard__secondary-button"
              >
                <Settings
                  size={17}
                />

                Business settings
              </Link>
            </div>
          </div>

          {isPending && (
            <div className="travel-partner-dashboard__alert travel-partner-dashboard__alert--warning">
              <Clock3
                size={21}
              />

              <div>
                <strong>
                  Your partner
                  application is being
                  reviewed
                </strong>

                <span>
                  You can continue
                  preparing your business
                  profile while Fockis
                  Travel completes the
                  verification process.
                </span>
              </div>

              <Link to="/travel/partner">
                View application
                <ArrowRight
                  size={16}
                />
              </Link>
            </div>
          )}

          {isRejected && (
            <div className="travel-partner-dashboard__alert travel-partner-dashboard__alert--error">
              <XCircle
                size={21}
              />

              <div>
                <strong>
                  Your partner
                  application was not
                  approved
                </strong>

                <span>
                  {partner.rejectionReason ||
                    "Review your application and update the required information."}
                </span>
              </div>

              <Link to="/travel/partner">
                Review application
                <ArrowRight
                  size={16}
                />
              </Link>
            </div>
          )}

          {isSuspended && (
            <div className="travel-partner-dashboard__alert travel-partner-dashboard__alert--error">
              <AlertCircle
                size={21}
              />

              <div>
                <strong>
                  Your partner account
                  is suspended
                </strong>

                <span>
                  {partner.suspensionReason ||
                    "Some partner operations may be unavailable until the account is restored."}
                </span>
              </div>

              <Link to="/travel/management">
                Manage account
                <ArrowRight
                  size={16}
                />
              </Link>
            </div>
          )}

          {isVerified &&
            !partner.active && (
              <div className="travel-partner-dashboard__alert travel-partner-dashboard__alert--warning">
                <Activity
                  size={21}
                />

                <div>
                  <strong>
                    Your business is
                    currently inactive
                  </strong>

                  <span>
                    Your partner profile
                    is verified, but the
                    business is not
                    currently active.
                  </span>
                </div>

                <Link to="/travel/management">
                  Activate business
                  <ArrowRight
                    size={16}
                  />
                </Link>
              </div>
            )}

          <div className="travel-partner-dashboard__actions">
            <Link
              to="/travel/partner/listings/new"
              className="travel-partner-dashboard__primary-button"
            >
              <Plus size={19} />
              Create listing
            </Link>

            <Link
              to="/travel/partner/listings"
              className="travel-partner-dashboard__secondary-button"
            >
              <ListChecks
                size={18}
              />
              Manage listings
            </Link>

            <Link
              to="/travel/management"
              className="travel-partner-dashboard__secondary-button"
            >
              <Building2
                size={18}
              />
              Manage business
            </Link>
          </div>

          <div className="travel-partner-dashboard__stats">
            <div className="travel-partner-dashboard__stat">
              <div className="travel-partner-dashboard__stat-icon">
                <Store size={20} />
              </div>

              <div>
                <span>
                  Total listings
                </span>

                <strong>
                  {stats.total}
                </strong>
              </div>
            </div>

            <div className="travel-partner-dashboard__stat">
              <div className="travel-partner-dashboard__stat-icon">
                <CheckCircle2
                  size={20}
                />
              </div>

              <div>
                <span>
                  Published
                </span>

                <strong>
                  {stats.published}
                </strong>
              </div>
            </div>

            <div className="travel-partner-dashboard__stat">
              <div className="travel-partner-dashboard__stat-icon">
                <Clock3 size={20} />
              </div>

              <div>
                <span>
                  Pending review
                </span>

                <strong>
                  {stats.pending}
                </strong>
              </div>
            </div>

            <div className="travel-partner-dashboard__stat">
              <div className="travel-partner-dashboard__stat-icon">
                <FileText
                  size={20}
                />
              </div>

              <div>
                <span>
                  Drafts
                </span>

                <strong>
                  {stats.drafts}
                </strong>
              </div>
            </div>
          </div>

          <div className="travel-partner-dashboard__grid">
            <div className="travel-partner-dashboard__main">
              <div className="travel-partner-dashboard__panel">
                <div className="travel-partner-dashboard__panel-header">
                  <div>
                    <h2>
                      Your listings
                    </h2>

                    <p>
                      Create, edit,
                      review, and manage
                      the inventory
                      connected to your
                      partner account.
                    </p>
                  </div>

                  <Link
                    to="/travel/partner/listings"
                    className="travel-partner-dashboard__panel-link"
                  >
                    View all
                    <ArrowRight
                      size={16}
                    />
                  </Link>
                </div>

                {recentListings.length ===
                0 ? (
                  <div className="travel-partner-dashboard__first-listing">
                    <div className="travel-partner-dashboard__first-listing-icon">
                      <Plus
                        size={28}
                      />
                    </div>

                    <div>
                      <h3>
                        Create your first
                        listing
                      </h3>

                      <p>
                        Your partner
                        account is ready.
                        Add your first
                        stay, rental,
                        restaurant,
                        experience,
                        meeting space,
                        transportation
                        service, or other
                        travel offering.
                      </p>

                      <Link
                        to="/travel/partner/listings/new"
                        className="travel-partner-dashboard__primary-button"
                      >
                        Create your first
                        listing
                        <ArrowRight
                          size={17}
                        />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="travel-partner-dashboard__listing-list">
                    {recentListings.map(
                      (listing) => {
                        const id =
                          getListingId(
                            listing,
                          );

                        const name =
                          getListingName(
                            listing,
                          );

                        const status =
                          getListingStatus(
                            listing,
                          );

                        const image =
                          listing.image ||
                          listing.imageUrl ||
                          listing.thumbnail ||
                          listing.coverImage ||
                          listing
                            .images?.[0];

                        return (
                          <div
                            key={
                              id ||
                              `${name}-${listing.createdAt || "listing"}`
                            }
                            className="travel-partner-dashboard__listing"
                          >
                            <div className="travel-partner-dashboard__listing-image">
                              {image ? (
                                <img
                                  src={image}
                                  alt={
                                    name
                                  }
                                />
                              ) : (
                                <Store
                                  size={
                                    25
                                  }
                                />
                              )}
                            </div>

                            <div className="travel-partner-dashboard__listing-info">
                              <div className="travel-partner-dashboard__listing-title">
                                {
                                  name
                                }
                              </div>

                              <div className="travel-partner-dashboard__listing-meta">
                                {listing.category ||
                                  "Travel listing"}

                                {listing.city && (
                                  <>
                                    <span>
                                      •
                                    </span>

                                    <MapPin
                                      size={
                                        13
                                      }
                                    />

                                    {
                                      listing.city
                                    }
                                  </>
                                )}

                                <span>
                                  •
                                </span>

                                Updated{" "}
                                {formatDate(
                                  listing.updatedAt,
                                )}
                              </div>
                            </div>

                            <span
                              className={`travel-partner-dashboard__listing-status ${statusClass(
                                status,
                              )}`}
                            >
                              {formatStatus(
                                status,
                              )}
                            </span>

                            {id && (
                              <Link
                                to={`/travel/partner/listings/${id}/edit`}
                                className="travel-partner-dashboard__icon-button"
                                aria-label={`Edit ${name}`}
                                title={`Edit ${name}`}
                              >
                                <Edit3
                                  size={
                                    17
                                  }
                                />
                              </Link>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            </div>

            <aside className="travel-partner-dashboard__sidebar">
              <div className="travel-partner-dashboard__panel">
                <div className="travel-partner-dashboard__panel-header">
                  <div>
                    <h2>
                      Business status
                    </h2>

                    <p>
                      Your current
                      partner
                      configuration.
                    </p>
                  </div>
                </div>

                <div className="travel-partner-dashboard__check-list">
                  <div>
                    {isVerified ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <Clock3
                        size={18}
                      />
                    )}

                    <span>
                      Partner
                      verification
                    </span>

                    <strong>
                      {isVerified
                        ? "Verified"
                        : formatStatus(
                            partner.status,
                          )}
                    </strong>
                  </div>

                  <div>
                    {partner.active ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <AlertCircle
                        size={18}
                      />
                    )}

                    <span>
                      Business status
                    </span>

                    <strong>
                      {partner.active
                        ? "Active"
                        : "Inactive"}
                    </strong>
                  </div>

                  <div>
                    {partner.acceptingBookings ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <AlertCircle
                        size={18}
                      />
                    )}

                    <span>
                      Accepting bookings
                    </span>

                    <strong>
                      {partner.acceptingBookings
                        ? "Enabled"
                        : "Disabled"}
                    </strong>
                  </div>

                  <div>
                    {partner.instantBooking ? (
                      <CheckCircle2
                        size={18}
                      />
                    ) : (
                      <Clock3
                        size={18}
                      />
                    )}

                    <span>
                      Instant booking
                    </span>

                    <strong>
                      {partner.instantBooking
                        ? "Enabled"
                        : "Disabled"}
                    </strong>
                  </div>
                </div>

                <Link
                  to="/travel/management"
                  className="travel-partner-dashboard__wide-link"
                >
                  Update business
                  settings
                  <ArrowRight
                    size={16}
                  />
                </Link>
              </div>

              <div className="travel-partner-dashboard__panel">
                <div className="travel-partner-dashboard__panel-header">
                  <div>
                    <h2>
                      Business profile
                    </h2>

                    <p>
                      Information shown
                      throughout your
                      partner account.
                    </p>
                  </div>
                </div>

                <div className="travel-partner-dashboard__profile-details">
                  <div>
                    <Building2
                      size={17}
                    />

                    <span>
                      Category
                    </span>

                    <strong>
                      {partner.category ||
                        "Not set"}
                    </strong>
                  </div>

                  <div>
                    <Globe2
                      size={17}
                    />

                    <span>
                      Website
                    </span>

                    <strong>
                      {partner.website
                        ? "Configured"
                        : "Not set"}
                    </strong>
                  </div>

                  <div>
                    <MapPin
                      size={17}
                    />

                    <span>
                      Location
                    </span>

                    <strong>
                      {location ||
                        "Not set"}
                    </strong>
                  </div>

                  <div>
                    <ShieldCheck
                      size={17}
                    />

                    <span>
                      Verified
                    </span>

                    <strong>
                      {formatDate(
                        partner.verifiedAt,
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="travel-partner-dashboard__operations">
            <div className="travel-partner-dashboard__operations-header">
              <div>
                <div className="travel-partner-dashboard__eyebrow">
                  PARTNER OPERATIONS
                </div>

                <h2>
                  Manage your Travel
                  business
                </h2>

                <p>
                  Use the existing Travel
                  management areas to keep
                  your business and
                  inventory up to date.
                </p>
              </div>
            </div>

            <div className="travel-partner-dashboard__operation-grid">
              <Link
                to="/travel/partner/listings"
                className="travel-partner-dashboard__operation-card"
              >
                <div className="travel-partner-dashboard__operation-icon">
                  <ListChecks
                    size={22}
                  />
                </div>

                <div>
                  <h3>
                    Listings
                  </h3>

                  <p>
                    Create and manage the
                    travel products and
                    services your business
                    offers.
                  </p>
                </div>

                <ArrowRight
                  size={18}
                />
              </Link>

              <Link
                to="/travel/management"
                className="travel-partner-dashboard__operation-card"
              >
                <div className="travel-partner-dashboard__operation-icon">
                  <Building2
                    size={22}
                  />
                </div>

                <div>
                  <h3>
                    Business management
                  </h3>

                  <p>
                    Update your business
                    information, services,
                    hours, media, social
                    links, and booking
                    settings.
                  </p>
                </div>

                <ArrowRight
                  size={18}
                />
              </Link>

              <Link
                to="/travel/partner/listings/new"
                className="travel-partner-dashboard__operation-card"
              >
                <div className="travel-partner-dashboard__operation-icon">
                  <Plus size={22} />
                </div>

                <div>
                  <h3>
                    Add inventory
                  </h3>

                  <p>
                    Start building your
                    Travel inventory by
                    creating another
                    listing.
                  </p>
                </div>

                <ArrowRight
                  size={18}
                />
              </Link>

              <Link
                to="/travel/partner"
                className="travel-partner-dashboard__operation-card"
              >
                <div className="travel-partner-dashboard__operation-icon">
                  <ShieldCheck
                    size={22}
                  />
                </div>

                <div>
                  <h3>
                    Partner application
                  </h3>

                  <p>
                    Review your partner
                    application and
                    verification status.
                  </p>
                </div>

                <ArrowRight
                  size={18}
                />
              </Link>
            </div>
          </div>

          <div className="travel-partner-dashboard__summary">
            <div>
              <BarChart3
                size={20}
              />

              <span>
                {stats.total === 0
                  ? "Your dashboard is ready for your first listing."
                  : `${stats.total} listing${
                      stats.total ===
                      1
                        ? ""
                        : "s"
                    } connected to your partner account.`}
              </span>
            </div>

            <div>
              <CalendarDays
                size={20}
              />

              <span>
                {partner.acceptingBookings
                  ? "Your business is configured to accept bookings."
                  : "Booking acceptance is currently disabled."}
              </span>
            </div>

            <div>
              <Users size={20} />

              <span>
                Customer and booking
                management will use
                partner-specific backend
                endpoints when those
                operations are exposed
                by the Travel API.
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}