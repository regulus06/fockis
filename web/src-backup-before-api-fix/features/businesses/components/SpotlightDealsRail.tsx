import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  Clock3,
  Flame,
  MapPin,
  Tag,
} from "lucide-react";

import {
  businessesApi,
} from "../services/businessesApi";

import type {
  Business,
  BusinessDeal,
} from "../types/business.types";

import "../styles/SpotlightDealsRail.scss";

/* ============================================================================
   FOCKIS BUSINESS SPOTLIGHT DEALS RAIL
   ---------------------------------------------------------------------------
   Uses the existing Business Spotlight endpoint.

   Flow:
     published business
        -> spotlightEnabled
        -> business.deals
        -> active + non-expired deals
        -> Spotlight rail

   This replacement also keeps a Spotlight business visible when it has no
   active deal, so Spotlight itself does not disappear just because a deal
   expired.
============================================================================ */

interface SpotlightDeal extends BusinessDeal {
  businessName: string;
  businessLogo?: string;
  businessCity?: string;
  businessState?: string;
}

interface SpotlightBusiness {
  business: Business;
  activeDeals: SpotlightDeal[];
}

function isDealCurrentlyActive(
  deal: BusinessDeal,
): boolean {
  if (deal.active === false) {
    return false;
  }

  if (deal.isActive === false) {
    return false;
  }

  if (!deal.expiresAt) {
    return true;
  }

  const expiration = new Date(
    deal.expiresAt,
  ).getTime();

  if (!Number.isFinite(expiration)) {
    return true;
  }

  return expiration > Date.now();
}

function formatExpiration(
  expiresAt?: string,
): string {
  if (!expiresAt) {
    return "No expiration";
  }

  const timestamp = new Date(
    expiresAt,
  ).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Special offer";
  }

  const remaining =
    timestamp - Date.now();

  if (remaining <= 0) {
    return "Expired";
  }

  const minutes = Math.floor(
    remaining / 60000,
  );

  if (minutes < 60) {
    return `${Math.max(minutes, 1)}m left`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours}h left`;
  }

  const days = Math.floor(
    hours / 24,
  );

  return `${days}d left`;
}

function getBusinessLocation(
  business: Business,
): string {
  return [
    business.city,
    business.state,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function SpotlightDealsRail() {
  const [
    businesses,
    setBusinesses,
  ] = useState<Business[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSpotlight() {
      try {
        setLoading(true);
        setError(null);

        const result =
          await businessesApi.getSpotlight();

        if (!cancelled) {
          setBusinesses(
            Array.isArray(result)
              ? result
              : [],
          );
        }
      } catch (err) {
        console.error(
          "[SpotlightDealsRail] Failed to load Spotlight",
          err,
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Spotlight.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSpotlight();

    return () => {
      cancelled = true;
    };
  }, []);

  const spotlightBusinesses =
    useMemo<SpotlightBusiness[]>(() => {
      return businesses
        .filter(
          (business) =>
            business.spotlightEnabled &&
            business.feedEnabled,
        )
        .sort(
          (a, b) =>
            Number(b.spotlightPriority || 0) -
            Number(a.spotlightPriority || 0),
        )
        .map((business) => {
          const activeDeals =
            (business.deals || [])
              .filter(isDealCurrentlyActive)
              .map((deal) => ({
                ...deal,
                businessName:
                  business.name,
                businessLogo:
                  business.logoUrl,
                businessCity:
                  business.city,
                businessState:
                  business.state,
              }));

          return {
            business,
            activeDeals,
          };
        });
    }, [businesses]);

  const totalDeals =
    spotlightBusinesses.reduce(
      (total, item) =>
        total + item.activeDeals.length,
      0,
    );

  if (loading) {
    return (
      <section
        className="spotlight-deals-rail spotlight-deals-rail--loading"
        aria-label="Fockis Spotlight"
      >
        <div className="spotlight-deals-header">
          <div>
            <span className="spotlight-deals-kicker">
              FOCKIS
            </span>
            <h3>
              <Flame size={20} />
              Spotlight
            </h3>
          </div>
        </div>

        <div className="spotlight-deals-loading">
          <div className="spotlight-skeleton" />
          <div className="spotlight-skeleton" />
          <div className="spotlight-skeleton" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="spotlight-deals-rail"
        aria-label="Fockis Spotlight"
      >
        <div className="spotlight-deals-header">
          <div>
            <span className="spotlight-deals-kicker">
              FOCKIS
            </span>
            <h3>
              <Flame size={20} />
              Spotlight
            </h3>
          </div>
        </div>

        <div className="spotlight-deals-error">
          <strong>
            Spotlight is temporarily unavailable.
          </strong>
          <span>
            {error}
          </span>
        </div>
      </section>
    );
  }

  if (!spotlightBusinesses.length) {
    return (
      <section
        className="spotlight-deals-rail spotlight-deals-rail--empty"
        aria-label="Fockis Spotlight"
      >
        <div className="spotlight-deals-header">
          <div>
            <span className="spotlight-deals-kicker">
              FOCKIS
            </span>
            <h3>
              <Flame size={20} />
              Spotlight
            </h3>
            <p>
              Featured businesses and special offers.
            </p>
          </div>

          <Link
            to="/businesses/spotlight"
            className="spotlight-deals-view-all"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="spotlight-deals-empty">
          <div className="spotlight-deals-empty-icon">
            🔥
          </div>

          <strong>
            No businesses are in Spotlight yet.
          </strong>

          <span>
            Publish a business and add it to Spotlight
            from Business Manager.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      className="spotlight-deals-rail"
      aria-label="Fockis Spotlight"
    >
      <div className="spotlight-deals-header">
        <div>
          <span className="spotlight-deals-kicker">
            FOCKIS
          </span>

          <h3>
            <Flame size={20} />
            Spotlight
          </h3>

          <p>
            Featured businesses and special offers.
          </p>
        </div>

        <div className="spotlight-deals-header-actions">
          <span className="spotlight-deals-count">
            {spotlightBusinesses.length}{" "}
            {spotlightBusinesses.length === 1
              ? "business"
              : "businesses"}
            {totalDeals > 0
              ? ` · ${totalDeals} ${
                  totalDeals === 1
                    ? "deal"
                    : "deals"
                }`
              : ""}
          </span>

          <Link
            to="/businesses/spotlight"
            className="spotlight-deals-view-all"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <div className="spotlight-deals-list">
        {spotlightBusinesses.map(
          ({
            business,
            activeDeals,
          }) => {
            const location =
              getBusinessLocation(
                business,
              );

            return (
              <article
                key={business.id}
                className="spotlight-deal-card"
              >
                <Link
                  to={`/businesses/${business.id}`}
                  className="spotlight-deal-business-link"
                  aria-label={`View ${business.name}`}
                >
                  <div className="spotlight-deal-image-wrap">
                    {business.logoUrl ? (
                      <img
                        src={
                          business.logoUrl
                        }
                        alt=""
                        className="spotlight-deal-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="spotlight-deal-placeholder">
                        🏢
                      </div>
                    )}

                    <span className="spotlight-deal-badge">
                      <Flame size={13} />
                      Spotlight
                    </span>
                  </div>

                  <div className="spotlight-deal-content">
                    <div className="spotlight-deal-business">
                      <strong>
                        {business.name}
                      </strong>

                      {business.verified && (
                        <span
                          className="spotlight-verified"
                          title="Verified business"
                          aria-label="Verified business"
                        >
                          ✓
                        </span>
                      )}
                    </div>

                    {location && (
                      <span className="spotlight-deal-location">
                        <MapPin size={13} />
                        {location}
                      </span>
                    )}

                    {activeDeals.length > 0 ? (
                      <div className="spotlight-deal-offers">
                        {activeDeals
                          .slice(0, 2)
                          .map((deal) => (
                            <div
                              key={deal.id}
                              className="spotlight-offer"
                            >
                              <div className="spotlight-offer-top">
                                <span className="spotlight-offer-tag">
                                  <Tag size={13} />
                                  Deal
                                </span>

                                <span className="spotlight-offer-time">
                                  <Clock3 size={12} />
                                  {formatExpiration(
                                    deal.expiresAt,
                                  )}
                                </span>
                              </div>

                              <h4>
                                {deal.title}
                              </h4>

                              {deal.discount && (
                                <strong className="spotlight-offer-discount">
                                  {deal.discount}
                                </strong>
                              )}

                              {deal.description && (
                                <p>
                                  {deal.description}
                                </p>
                              )}

                              {deal.couponCode && (
                                <span className="spotlight-offer-coupon">
                                  Code:{" "}
                                  {deal.couponCode}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="spotlight-no-deal">
                        <span>
                          Featured business
                        </span>

                        <span>
                          View business
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              </article>
            );
          },
        )}
      </div>
    </section>
  );
}
