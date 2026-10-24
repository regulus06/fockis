import { Link } from "react-router-dom";

import { ArrowRight, Flame, MapPin, Navigation, Tag } from "lucide-react";

import type { Business } from "../types/business.types";

import BusinessDestinationButtons from "./BusinessDestinationButtons";

import {
  BusinessCover,
  BusinessLogo,
  VerifiedBadge,
} from "./BusinessUi";

import {
  formatLocation,
  getActiveDeals,
  getBusinessRoute,
  getCategoryOption,
  isBusinessVerified,
} from "../utils/businessUtils";

import "../styles/BusinessUi.scss";


/* ============================================================================
   BUSINESS CARD

   One card design used by the directory, Spotlight, rails and related
   businesses. Badges and buttons only render when backed by real data.
============================================================================ */

interface Props {
  business: Business;
  /*
   * "featured" shows the Spotlight badge.
   * "compact" is used in horizontal rails.
   */
  variant?: "default" | "featured" | "compact";
  /*
   * Optional distance label ("2.4 km away") when the visitor shared their
   * location.
   */
  distanceLabel?: string;
  headingLevel?: "h2" | "h3";
}

export default function BusinessSpotlightCard({
  business,
  variant = "default",
  distanceLabel,
  headingLevel = "h3",
}: Props) {
  const Heading = headingLevel;
  const route = getBusinessRoute(business.id);
  const category = getCategoryOption(business.category);
  const CategoryIcon = category.icon;
  const location = formatLocation(business);
  const deal = getActiveDeals(business)[0];
  const verified = isBusinessVerified(business);
  const summary = business.tagline || business.description;

  return (
    <article
      className={`fkb-card ${variant === "compact" ? "fkb-card--compact" : ""}`}
      aria-label={business.name}
    >
      <Link
        to={route}
        className="fkb-card__media"
        tabIndex={-1}
        aria-hidden="true"
      >
        <BusinessCover business={business}>
          {variant === "featured" && (
            <span className="fkb-card__media-badges">
              <span className="fkb-badge fkb-badge--accent">
                <Flame size={13} aria-hidden="true" />
                Spotlight
              </span>
            </span>
          )}
        </BusinessCover>
      </Link>

      <div className="fkb-card__body">
        <div className="fkb-card__identity">
          <BusinessLogo business={business} ring />

          <div className="fkb-card__titles">
            <Heading className="fkb-card__name">
              <Link to={route}>{business.name}</Link>
              {verified && <VerifiedBadge compact />}
            </Heading>

            <span className="fkb-card__category">
              <CategoryIcon size={14} aria-hidden="true" />
              {category.label}
            </span>
          </div>
        </div>

        {summary && <p className="fkb-card__description">{summary}</p>}

        {(location || distanceLabel) && (
          <div className="fkb-card__meta">
            {location && (
              <span>
                <MapPin size={14} aria-hidden="true" />
                {location}
              </span>
            )}

            {distanceLabel && (
              <span>
                <Navigation size={14} aria-hidden="true" />
                {distanceLabel}
              </span>
            )}
          </div>
        )}

        {deal && (
          <div className="fkb-card__deal">
            <Tag size={14} aria-hidden="true" />
            <span>
              {deal.discount ? `${deal.discount} · ${deal.title}` : deal.title}
            </span>
          </div>
        )}

        <div className="fkb-card__actions">
          <Link to={route} className="fkb-btn fkb-btn--secondary fkb-btn--sm">
            View Business
            <ArrowRight size={15} aria-hidden="true" />
          </Link>

          <BusinessDestinationButtons business={business} size="sm" />
        </div>
      </div>
    </article>
  );
}

export { BusinessSpotlightCard as BusinessCard };
