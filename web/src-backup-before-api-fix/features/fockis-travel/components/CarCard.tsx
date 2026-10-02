import { Users, Gauge, Snowflake, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CarCardProps {
  id: string;
  name: string;
  category: string;
  image?: string;
  emoji?: string;
  seats: number;
  transmission: 'Automatic' | 'Manual';
  hasAC?: boolean;
  bags?: number;
  pricePerDay: number;
  currency?: string;
  badges?: string[];
  onRent?: (id: string) => void;
}

/**
 * Reusable car rental card used on the homepage strip and on
 * TravelCarsPage's results grid.
 */
export default function CarCard({
  id,
  name,
  category,
  image,
  emoji = '🚗',
  seats,
  transmission,
  hasAC = true,
  bags,
  pricePerDay,
  currency = '$',
  badges = [],
  onRent,
}: CarCardProps) {
  return (
    <article className="car-card">
      <div className="car-card__thumb">
        {image ? <img src={image} alt={name} /> : <span aria-hidden="true">{emoji}</span>}
      </div>

      {badges.length > 0 && (
        <div className="car-card__badges">
          {badges.map((b) => (
            <span key={b} className="ft-badge ft-badge--outline">{b}</span>
          ))}
        </div>
      )}

      <h4>{name}</h4>
      <div className="car-card__specs">{category}</div>

      <div className="car-card__features">
        <span className="ft-pill"><Users size={13} aria-hidden="true" /> {seats} seats</span>
        <span className="ft-pill"><Gauge size={13} aria-hidden="true" /> {transmission}</span>
        {hasAC && <span className="ft-pill"><Snowflake size={13} aria-hidden="true" /> A/C</span>}
        {typeof bags === 'number' && <span className="ft-pill"><Briefcase size={13} aria-hidden="true" /> {bags} bags</span>}
      </div>

      <div className="car-card__price-row">
        <div className="price">
          {currency}{pricePerDay}
          <span>/day</span>
        </div>
        {onRent ? (
          <button type="button" className="view-link" onClick={() => onRent(id)}>
            Rent →
          </button>
        ) : (
          <Link to={`/travel/cars?car=${id}`} className="view-link">
            Rent →
          </Link>
        )}
      </div>
    </article>
  );
}
