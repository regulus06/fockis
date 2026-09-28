import { Link } from 'react-router-dom';
import "../styles/DestinationCard.scss";

export interface DestinationCardProps {
  slug: string;
  name: string;
  flag?: string;
  count: string;
  image: string;
  wide?: boolean;
}

/**
 * Fockis Travel destination card.
 *
 * Used by:
 * - TravelHomePage
 * - TravelDestinationsPage
 *
 * Links users to the destination search results for the selected location.
 */
export default function DestinationCard({
  slug,
  name,
  flag,
  count,
  image,
  wide = false,
}: DestinationCardProps) {
  const destinationUrl = `/travel/search?destination=${encodeURIComponent(slug)}`;

  return (
    <Link
      to={destinationUrl}
      className={`destination-card${wide ? ' destination-card--wide' : ''}`}
      aria-label={`Explore stays and experiences in ${name}`}
    >
      <div
        className="destination-card__image"
        style={{ backgroundImage: `url("${image}")` }}
        aria-hidden="true"
      />

      <div className="destination-card__overlay" aria-hidden="true" />

      <div className="destination-card__content">
        {flag ? (
          <div className="destination-card__flag" aria-hidden="true">
            {flag}
          </div>
        ) : null}

        <div className="destination-card__name">
          {name}
        </div>

        <div className="destination-card__count">
          {count}
        </div>
      </div>
    </Link>
  );
}