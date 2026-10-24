import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { ArrowRight, Building2 } from "lucide-react";

import { businessesApi } from "../services/businessesApi";

import type {
  Business,
  BusinessCategory,
} from "../types/business.types";

import BusinessSpotlightCard from "./BusinessSpotlightCard";

import {
  BusinessCardSkeleton,
  RailNav,
  useRailScroll,
} from "./BusinessUi";

import { dedupeById } from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessFeedRail.scss";


/* ============================================================================
   BUSINESS FEED RAIL

   Horizontal rail of published businesses.

   - In the Fockis Feed it is rendered without props and shows the latest
     published businesses.
   - On a business profile it shows related businesses: same category,
     excluding the business being viewed.

   The root and scroller class names (.fk-business-feed-rail,
   .fk-business-feed-rail__scroller) are kept because the feed page styles
   target them.
============================================================================ */

interface Props {
  title?: string;
  description?: string;
  category?: BusinessCategory;
  excludeId?: string;
  limit?: number;
  /*
   * Hide the whole rail when there is nothing to show (used for related
   * businesses). The feed keeps its empty state.
   */
  hideWhenEmpty?: boolean;
}

export default function BusinessFeedRail({
  title = "Businesses on Fockis",
  description,
  category,
  excludeId,
  limit = 12,
  hideWhenEmpty = false,
}: Props) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const { trackRef, canPrev, canNext, scrollBy } = useRailScroll();

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setFailed(false);

    businessesApi
      .list({
        category,
        sort: "newest",
        // Fetch one extra so excluding the current business still fills
        // the rail.
        limit: excludeId ? limit + 1 : limit,
      })
      .then((data) => {
        if (mounted) {
          setBusinesses(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setFailed(true);
          setBusinesses([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [category, excludeId, limit]);

  const visible = useMemo(
    () =>
      dedupeById(businesses)
        .filter((business) => business.id !== excludeId)
        .slice(0, limit),
    [businesses, excludeId, limit],
  );

  if (!loading && hideWhenEmpty && (failed || visible.length === 0)) {
    return null;
  }

  return (
    <section
      className="fkb fk-business-feed-rail fkb-feed-rail"
      aria-label={title}
    >
      <div className="fkb-section-head">
        <div>
          <h2 className="fkb-feed-rail__title">{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <div className="fkb-section-head__actions">
          <RailNav
            label={title}
            canPrev={canPrev}
            canNext={canNext}
            onScroll={scrollBy}
          />

          <Link to="/businesses" className="fkb-link">
            See all
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {!loading && failed ? (
        <p className="fkb-feed-rail__status">
          Businesses could not be loaded right now.
        </p>
      ) : !loading && visible.length === 0 ? (
        <div className="fkb-feed-rail__empty">
          <Building2 size={20} aria-hidden="true" />
          <span>No businesses have been published yet.</span>
        </div>
      ) : (
        <div className="fkb-rail">
          <div
            ref={trackRef}
            className="fkb-rail__track fk-business-feed-rail__scroller"
            role={loading ? "status" : undefined}
            aria-label={loading ? "Loading businesses" : undefined}
          >
            {loading
              ? Array.from({ length: 3 }, (_, index) => (
                  <BusinessCardSkeleton key={index} />
                ))
              : visible.map((business) => (
                  <BusinessSpotlightCard
                    key={business.id}
                    business={business}
                    variant="compact"
                  />
                ))}
          </div>
        </div>
      )}
    </section>
  );
}
