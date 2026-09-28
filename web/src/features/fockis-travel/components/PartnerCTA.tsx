import { Link } from 'react-router-dom';

export interface PartnerCTAProps {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaTo?: string;
  icons?: string[];
}

/** Reusable "become a partner" band used on the homepage and other pages. */
export default function PartnerCTA({
  title = 'Grow your business with Fockis Travel',
  body = 'Reach travelers and local customers from around the world while managing reservations, availability, services and payments from one place.',
  ctaLabel = 'Become a travel partner →',
  ctaTo = '/travel/partner',
  icons = ['🏨', '🏠', '🍽️', '🚗', '🚐', '💼', '🎉', '🏝️'],
}: PartnerCTAProps) {
  return (
    <div className="partner-band">
      <div className="partner-band__copy">
        <h2>{title}</h2>
        <p>{body}</p>
        <Link to={ctaTo} className="btn btn-primary" style={{ marginTop: 20 }}>
          {ctaLabel}
        </Link>
      </div>
      <div className="partner-band__icons" aria-hidden="true">
        {icons.map((ic, i) => (
          <span key={`${ic}-${i}`}>{ic}</span>
        ))}
      </div>
    </div>
  );
}
