import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Heart, ImageOff, Star } from "lucide-react";

import {
  formatTravelPrice,
  getListingId,
  getListingImage,
  getListingLocation,
  getListingName,
  getListingPrice,
  getListingRating,
  getPriceUnitLabel,
  type TravelListingView,
} from "../services/travelListingView";
import { useTravelFavorites } from "../hooks/useTravelFavorites";
import "../styles/TravelListingCard.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — LISTING CARD
 * ============================================================================
 *
 * variant="stay"       Featured Stays / Similar Stays card (reference image):
 *                      photo, heart, Verified, name, location, rating, price,
 *                      blue "View Details" button.
 * variant="experience" Top Experiences card: photo, heart, name, location,
 *                      price on the left and rating on the right.
 * variant="compact"    Similar Stays on the details page (no button).
 *
 * Shows only what the listing record contains. No rating → no stars;
 * no price → "Price on request"; no image → neutral placeholder.
 * ============================================================================
 */

interface TravelListingCardProps {
  listing: TravelListingView;
  variant?: "stay" | "experience" | "compact";
  verified?: boolean;
  /** Search state (dates/travelers) carried to the details page. */
  linkSearch?: string;
}

export function getListingDetailsPath(listing: TravelListingView, search = ""): string {
  const id = getListingId(listing);
  const query = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `/travel/stays/${encodeURIComponent(id)}${query}`;
}

export default function TravelListingCard({
  listing,
  variant = "stay",
  verified = false,
  linkSearch = "",
}: TravelListingCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { isSaved, isPending, toggle } = useTravelFavorites();

  const id = getListingId(listing);
  const name = getListingName(listing);
  const location = getListingLocation(listing);
  const image = getListingImage(listing);
  const rating = getListingRating(listing);
  const price = getListingPrice(listing);
  const unit = getPriceUnitLabel(listing);
  const href = getListingDetailsPath(listing, linkSearch);
  const saved = isSaved(id);

  return (
    <article className={`ft-card ft-card--${variant}`}>
      <Link to={href} className="ft-card__media" tabIndex={-1} aria-hidden="true">
        {image && !imageFailed ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="ft-card__placeholder">
            <ImageOff size={26} aria-hidden="true" />
            <small>No photo yet</small>
          </span>
        )}

        {verified && (
          <span className="ft-card__verified">
            <BadgeCheck size={14} aria-hidden="true" /> Verified
          </span>
        )}
      </Link>

      {id && (
        <button
          type="button"
          className={`ft-card__fav${saved ? " is-saved" : ""}`}
          aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
          aria-pressed={saved}
          disabled={isPending(id)}
          onClick={() => void toggle(id)}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      )}

      <div className="ft-card__body">
        <h3 className="ft-card__title">
          <Link to={href}>{name}</Link>
        </h3>

        {location && <p className="ft-card__location">{location}</p>}

        {variant === "experience" ? (
          <div className="ft-card__row">
            <p className="ft-card__price">
              {price !== null ? (
                <>
                  <strong>{formatTravelPrice(price, listing.currency)}</strong>{" "}
                  <span>{unit}</span>
                </>
              ) : (
                <span className="ft-card__price-na">Price on request</span>
              )}
            </p>

            {rating && (
              <span className="ft-card__rating">
                <Star size={14} fill="currentColor" aria-hidden="true" />
                {rating.average.toFixed(1)}
                {rating.count > 0 && <small>({rating.count})</small>}
              </span>
            )}
          </div>
        ) : (
          <>
            {rating && (
              <p className="ft-card__rating">
                <Star size={14} fill="currentColor" aria-hidden="true" />
                {rating.average.toFixed(1)}
                {rating.count > 0 && (
                  <small>
                    {variant === "compact"
                      ? `(${rating.count.toLocaleString()})`
                      : `(${rating.count.toLocaleString()} ${rating.count === 1 ? "review" : "reviews"})`}
                  </small>
                )}
              </p>
            )}

            <p className="ft-card__price ft-card__price--stacked">
              {price !== null ? (
                <>
                  <strong>{formatTravelPrice(price, listing.currency)}</strong>
                  <span>{unit}</span>
                </>
              ) : (
                <span className="ft-card__price-na">Price on request</span>
              )}
            </p>

            {variant === "stay" && (
              <Link to={href} className="ft-card__cta">
                View Details
              </Link>
            )}
          </>
        )}
      </div>
    </article>
  );
}
