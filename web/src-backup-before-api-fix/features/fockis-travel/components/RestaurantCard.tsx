import { Star } from 'lucide-react';

export interface RestaurantCardProps {
  id: string;
  name: string;
  cuisine: string;
  location: string;
  image: string;
  rating: number;
  priceRange?: string;
  availableTimes: string[];
  selectedTime?: string;
  onSelectTime?: (id: string, time: string) => void;
  onViewDetails?: (id: string) => void;
}

/**
 * Restaurant discovery card used on the homepage and TravelRestaurantsPage.
 * Reservation time chips are interactive; onViewDetails lets the parent
 * page open a quick-view panel since there is no standalone restaurant
 * details route.
 */
export default function RestaurantCard({
  id,
  name,
  cuisine,
  location,
  image,
  rating,
  priceRange,
  availableTimes,
  selectedTime,
  onSelectTime,
  onViewDetails,
}: RestaurantCardProps) {
  return (
    <article className="restaurant-card">
      <button
        type="button"
        className="thumb"
        style={{ backgroundImage: `url('${image}')`, border: 'none', width: '100%', padding: 0 }}
        onClick={() => onViewDetails?.(id)}
        aria-label={`View ${name}`}
      />
      <div className="body">
        <div className="cuisine">{cuisine}</div>
        <h4>{name}</h4>
        <div className="row1">
          <div className="rating">
            <span className="star"><Star size={12} fill="currentColor" aria-hidden="true" /></span>
            {rating.toFixed(1)}
          </div>
          <div className="loc">{location}</div>
        </div>
        {priceRange && <div className="price-range">{priceRange}</div>}
        <div className="time-row">
          {availableTimes.map((t) => (
            <button
              key={t}
              type="button"
              className={`time-chip${t === selectedTime ? ' is-selected' : ''}`}
              onClick={() => onSelectTime?.(id, t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
