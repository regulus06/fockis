import { BadgeCheck, ExternalLink, Flame, Globe, MapPin, Navigation, ShoppingBag, Tag } from "lucide-react";
import { Link } from "react-router-dom";

import { businessesApi } from "../../services/businessesApi";
import type { Business } from "../../types/business.types";
import {
  formatLocation,
  getActiveDeals,
  getBusinessDestinations,
  getBusinessRoute,
  getCategoryOption,
  getDirectionsUrl,
  getStoreRoute,
  isBusinessVerified,
} from "../../utils/businessUtils";
import { BusinessCover, BusinessLogo } from "../BusinessUi";
import { businessBadge, CATEGORY_TONES, openLabel } from "./discoverUtils";

interface Props {
  business: Business;
  distance?: string;
}

/**
 * Featured card: cover with a status badge, logo, name + verified, category,
 * location / open status, summary and two actions. The second action is the
 * business's own destination (Fockis store, website, or directions).
 */
export default function FeaturedBusinessCard({ business, distance }: Props) {
  const route = getBusinessRoute(business.id);
  const category = getCategoryOption(business.category);
  const deals = getActiveDeals(business);
  const badge = businessBadge(business, deals.length);
  const verified = isBusinessVerified(business);
  const location = business.city || formatLocation(business);
  const open = openLabel(business);
  const summary = business.tagline || business.description;
  const { websiteUrl, store, primary } = getBusinessDestinations(business);
  const directions = getDirectionsUrl(business);

  const destination =
    store && (primary === "STORE" || !websiteUrl) ? (
      <Link
        to={getStoreRoute(store.slug)}
        className="fkbd-btn fkbd-btn--outline"
        onClick={() => void businessesApi.trackStoreClick(business.id)}
      >
        <ShoppingBag size={15} aria-hidden="true" /> Visit Store
      </Link>
    ) : websiteUrl ? (
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fkbd-btn fkbd-btn--outline"
        onClick={() => void businessesApi.trackWebsiteClick(business.id)}
      >
        <Globe size={15} aria-hidden="true" /> Website <ExternalLink size={13} aria-hidden="true" />
        <span className="fkb-visually-hidden"> (opens in a new tab)</span>
      </a>
    ) : directions ? (
      <a href={directions} target="_blank" rel="noopener noreferrer" className="fkbd-btn fkbd-btn--outline">
        <Navigation size={15} aria-hidden="true" /> Directions
        <span className="fkb-visually-hidden"> (opens in a new tab)</span>
      </a>
    ) : null;

  return (
    <article className="fkbd-feat" aria-label={business.name}>
      <Link to={route} className="fkbd-feat__media" tabIndex={-1} aria-hidden="true">
        <BusinessCover business={business} />
        {badge && (
          <span className={`fkbd-badge fkbd-badge--${badge.kind}`}>
            {badge.kind === "spotlight" ? (
              <Flame size={12} aria-hidden="true" />
            ) : badge.kind === "verified" ? (
              <BadgeCheck size={12} aria-hidden="true" />
            ) : (
              <Tag size={12} aria-hidden="true" />
            )}
            {badge.label}
          </span>
        )}
      </Link>

      <div className="fkbd-feat__body">
        <div className="fkbd-feat__identity">
          <span className="fkbd-feat__logo" style={{ ["--tone" as string]: CATEGORY_TONES[business.category] }}>
            <BusinessLogo business={business} size={46} />
          </span>
          <div className="fkbd-feat__titles">
            <h3>
              <Link to={route}>{business.name}</Link>
              {verified && <BadgeCheck size={17} className="fkbd-verified" aria-label="Verified" />}
            </h3>
            <span className="fkbd-feat__category">
              <category.icon size={13} aria-hidden="true" /> {category.label}
            </span>
          </div>
        </div>

        <div className="fkbd-feat__meta">
          {open && (
            <span className={`fkbd-open fkbd-open--${open.status}`}>
              {open.status === "open" ? "Open" : "Closed"}
            </span>
          )}
          {deals.length > 0 && (
            <span className="fkbd-feat__deal">
              <Tag size={13} aria-hidden="true" /> {deals.length === 1 ? "1 deal" : `${deals.length} deals`}
            </span>
          )}
          {(location || distance) && (
            <span className="fkbd-feat__place">
              <MapPin size={13} aria-hidden="true" />
              <span className="fkbd-truncate">{[location, distance].filter(Boolean).join(" · ")}</span>
            </span>
          )}
        </div>

        {summary && <p className="fkbd-feat__summary">{summary}</p>}

        <div className="fkbd-feat__actions">
          <Link to={route} className="fkbd-btn fkbd-btn--blue">
            View Business
          </Link>
          {destination}
        </div>
      </div>
    </article>
  );
}
