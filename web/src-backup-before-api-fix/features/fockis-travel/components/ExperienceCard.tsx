import { Star, Clock } from 'lucide-react';

export interface ExperienceCardProps {
  id: string;
  name: string;
  duration: string;
  image: string;
  price: number;
  currency?: string;
  rating?: number;
  onSelect?: (id: string) => void;
}

/**
 * Full-bleed image card used for experiences on the homepage and the
 * TravelExperiencesPage grid.
 */
export default function ExperienceCard({
  id,
  name,
  duration,
  image,
  price,
  currency = '$',
  rating,
  onSelect,
}: ExperienceCardProps) {
  return (
    <button
      type="button"
      className="exp-card"
      style={{ backgroundImage: `url('${image}')` }}
      onClick={() => onSelect?.(id)}
      aria-label={`View ${name} experience`}
    >
      <div className="overlay" aria-hidden="true" />
      <div className="content">
        <div className="dur">
          <Clock size={11} aria-hidden="true" style={{ verticalAlign: -1, marginRight: 4 }} />
          {duration}
        </div>
        <h4>{name}</h4>
        {typeof rating === 'number' && (
          <div className="meta-row">
            <Star size={12} aria-hidden="true" fill="currentColor" /> {rating.toFixed(1)}
          </div>
        )}
        <div className="price-row">
          <div className="price">
            {currency}{price}
            <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, fontSize: 12 }}>/person</span>
          </div>
        </div>
      </div>
    </button>
  );
}
