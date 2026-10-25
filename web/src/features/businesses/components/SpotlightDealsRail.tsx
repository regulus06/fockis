import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  Clock3,
  Flame,
  MapPin,
  Tag,
} from "lucide-react";

import { businessesApi } from "../services/businessesApi";

import type {
  Business,
  BusinessDeal,
} from "../types/business.types";

import {
  BusinessLogo,
  CouponCode,
  RailNav,
  VerifiedBadge,
  useRailScroll,
} from "./BusinessUi";

import {
  dedupeById,
  formatDealExpiry,
  formatLocation,
  getActiveDeals,
  getBusinessRoute,
  isBusinessVerified,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/SpotlightDealsRail.scss";


/* ============================================================================
   SPOTLIGHT DEALS RAIL

   Uses GET /businesses/spotlight. Shows Spotlight businesses with their
   active, unexpired deals first. Expired or paused deals are never shown.

   Kept class names: .spotlight-deals-rail and .spotlight-deals-list are
   targeted by the feed page styles.
============================================================================ */

interface Props {
  /*
   * Reuse Spotlight data the parent already loaded.
   */
  businesses?: Business[];
  title?: string;
  eyebrow?: string;
  /*
   * Only show businesses that have at least one active deal.
   */
  dealsOnly?: boolean;
}

export default function SpotlightDealsRail({
  businesses: providedBusinesses,
  title = "Deals & promotions",
  eyebrow = "Spotlight",
  dealsOnly = false,
}: Props) {
  const controlled = providedBusinesses !== undefined;

  const [loaded, setLoaded] = useState<Business[]>([]);
  const [loading, setLoading] = useState(!controlled);
  const [failed, setFailed] = useState(false);

  const { trackRef, canPrev, canNext, scrollBy } = useRailScroll();

  useEffect(() => {
    if (controlled) {
      return;
    }

    let cancelled = false;

    businessesApi
      .getSpotlight()
      .then((result) => {
        if (!cancelled) {
          setLoaded(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [controlled]);

  const items = useMemo(() => {
    const source = controlled ? providedBusinesses ?? [] : loaded;

    return dedupeById(source)
      .map((business) => ({
        business,
        deals: getActiveDeals(business),
      }))
      .filter((item) => !dealsOnly || item.deals.length > 0)
      // Businesses with live deals first; backend priority order otherwise.
      .sort((a, b) => Number(b.deals.length > 0) - Number(a.deals.length > 0));
  }, [controlled, providedBusinesses, loaded, dealsOnly]);

  const totalDeals = items.reduce((total, item) => total + item.deals.length, 0);

  if (!loading && (failed || items.length === 0)) {
    // Nothing real to promote: render nothing rather than an empty banner.
    return null;
  }

  return (
    <section
      className="fkb spotlight-deals-rail fkb-deals"
      aria-labelledby="fkb-deals-title"
    >
      <div className="fkb-section-head">
        <div>
          <span className="fkb-eyebrow fkb-deals__eyebrow">
            <Flame size={14} aria-hidden="true" />
            {eyebrow}
          </span>
          <h2 id="fkb-deals-title">{title}</h2>
          {!loading && (
            <p>
              {totalDeals > 0
                ? `${totalDeals} active ${totalDeals === 1 ? "offer" : "offers"} from featured businesses`
                : "Featured businesses on Fockis"}
            </p>
          )}
        </div>

        <div className="fkb-section-head__actions">
          <RailNav
            label={title}
            canPrev={canPrev}
            canNext={canNext}
            onScroll={scrollBy}
          />
        </div>
      </div>

      <div className="fkb-rail">
        <div
          ref={trackRef}
          className="fkb-rail__track spotlight-deals-list"
          role={loading ? "status" : undefined}
          aria-label={loading ? "Loading deals" : undefined}
        >
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="fkb-deal-card fkb-deal-card--skeleton" aria-hidden="true">
                  <div className="fkb-skeleton" style={{ height: 44, width: "60%" }} />
                  <div className="fkb-skeleton" style={{ height: 70 }} />
                  <div className="fkb-skeleton" style={{ height: 14, width: "40%" }} />
                </div>
              ))
            : items.map(({ business, deals }) => (
                <DealCard key={business.id} business={business} deals={deals} />
              ))}
        </div>
      </div>
    </section>
  );
}


function DealCard({
  business,
  deals,
}: {
  business: Business;
  deals: BusinessDeal[];
}) {
  const location = formatLocation(business);
  const route = getBusinessRoute(business.id);

  return (
    <article className="fkb-deal-card">
      <div className="fkb-deal-card__business">
        <BusinessLogo business={business} size={44} />

        <div className="fkb-deal-card__business-text">
          <h3>
            <Link to={route}>{business.name}</Link>
            {isBusinessVerified(business) && <VerifiedBadge compact />}
          </h3>

          {location && (
            <span>
              <MapPin size={13} aria-hidden="true" />
              {location}
            </span>
          )}
        </div>
      </div>

      {deals.length > 0 ? (
        <ul className="fkb-deal-card__offers">
          {deals.slice(0, 2).map((deal) => (
            <li key={deal.id} className="fkb-offer">
              {deal.discount && (
                <strong className="fkb-offer__discount">{deal.discount}</strong>
              )}

              <span className="fkb-offer__title">{deal.title}</span>

              {deal.description && (
                <p className="fkb-offer__description">{deal.description}</p>
              )}

              <div className="fkb-offer__footer">
                {formatDealExpiry(deal.expiresAt) && (
                  <span className="fkb-offer__expiry">
                    <Clock3 size={13} aria-hidden="true" />
                    {formatDealExpiry(deal.expiresAt)}
                  </span>
                )}

                {deal.couponCode && <CouponCode code={deal.couponCode} />}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fkb-deal-card__featured">
          <Tag size={14} aria-hidden="true" />
          {business.tagline || "Featured business"}
        </p>
      )}

      <Link to={route} className="fkb-btn fkb-btn--secondary fkb-btn--sm fkb-deal-card__cta">
        View business
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}
