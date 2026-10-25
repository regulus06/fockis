import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import { ArrowRight, Flame } from "lucide-react";

import { businessesApi } from "../services/businessesApi";

import type { Business } from "../types/business.types";

import BusinessSpotlightCard from "./BusinessSpotlightCard";

import {
  BusinessCardSkeleton,
  RailNav,
  useRailScroll,
} from "./BusinessUi";

import { dedupeById } from "../utils/businessUtils";

import "../styles/BusinessUi.scss";
import "../styles/BusinessSpotlight.scss";


/* ============================================================================
   BUSINESS SPOTLIGHT

   Horizontal rail of businesses that are eligible for Spotlight
   (published + spotlightEnabled, ordered by the backend's priority rules).

   Pass `businesses` to reuse data the parent already loaded; otherwise the
   component loads GET /businesses/spotlight itself. Renders nothing when
   there are no Spotlight businesses.
============================================================================ */

interface Props {
  businesses?: Business[];
  loading?: boolean;
  title?: string;
  description?: string;
  showViewAll?: boolean;
}

export default function BusinessSpotlight({
  businesses: providedBusinesses,
  loading: providedLoading,
  title = "Spotlight",
  description = "Featured businesses on Fockis.",
  showViewAll = true,
}: Props) {
  const controlled = providedBusinesses !== undefined;

  const [loadedBusinesses, setLoadedBusinesses] = useState<Business[]>([]);
  const [loadingOwn, setLoadingOwn] = useState(!controlled);

  const { trackRef, canPrev, canNext, scrollBy } = useRailScroll();

  useEffect(() => {
    if (controlled) {
      return;
    }

    let mounted = true;

    businessesApi
      .getSpotlight()
      .then((data) => {
        if (mounted) {
          setLoadedBusinesses(data);
        }
      })
      .catch(() => {
        // Spotlight is an enhancement; hide it on failure.
        if (mounted) {
          setLoadedBusinesses([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingOwn(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [controlled]);

  const businesses = dedupeById(
    controlled ? providedBusinesses ?? [] : loadedBusinesses,
  );

  const loading = controlled ? Boolean(providedLoading) : loadingOwn;

  if (!loading && businesses.length === 0) {
    return null;
  }

  return (
    <section
      className="fkb fkb-spotlight"
      aria-labelledby="fkb-spotlight-title"
    >
      <div className="fkb-section-head">
        <div>
          <span className="fkb-eyebrow fkb-spotlight__eyebrow">
            <Flame size={14} aria-hidden="true" />
            Featured
          </span>
          <h2 id="fkb-spotlight-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>

        <div className="fkb-section-head__actions">
          <RailNav
            label="Spotlight"
            canPrev={canPrev}
            canNext={canNext}
            onScroll={scrollBy}
          />

          {showViewAll && (
            <Link to="/businesses" className="fkb-link">
              All businesses
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      <div className="fkb-rail">
        <div
          ref={trackRef}
          className="fkb-rail__track"
          role={loading ? "status" : undefined}
          aria-label={loading ? "Loading Spotlight" : undefined}
        >
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <BusinessCardSkeleton key={index} />
              ))
            : businesses.map((business) => (
                <BusinessSpotlightCard
                  key={business.id}
                  business={business}
                  variant="featured"
                />
              ))}
        </div>
      </div>
    </section>
  );
}
