import { Link } from 'react-router-dom';
import "../styles/TravelFooter.scss";

/** Shared site footer for every Fockis Travel page. */
export default function TravelFooter() {
  return (
    <footer className="travel-footer">
      <div className="wrap">
        <div className="travel-footer__grid">
          {/* Brand */}
          <div className="travel-footer__brand">
            <div className="logo">
              <span className="logo-mark" aria-hidden="true" />
              Fockis{' '}
              <small style={{ color: 'rgba(250,246,238,0.5)' }}>
                TRAVEL
              </small>
            </div>

            <p>Travel anywhere. Book everything.</p>

            {/* Social Links */}
            <div className="travel-footer__social">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fockis Travel on Facebook"
                title="Facebook"
              >
                <span aria-hidden="true">f</span>
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fockis Travel on Instagram"
                title="Instagram"
              >
                <span aria-hidden="true">◎</span>
              </a>

              <a
                href="https://x.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fockis Travel on X"
                title="X"
              >
                <span aria-hidden="true">𝕏</span>
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h5>Explore</h5>

            <Link to="/travel/stays">
              Stays
            </Link>

            <Link to="/travel/cars">
              Cars
            </Link>

            <Link to="/travel/restaurants">
              Restaurants
            </Link>

            <Link to="/travel/meetings">
              Meetings
            </Link>

            <Link to="/travel/experiences">
              Experiences
            </Link>
          </div>

          {/* Travel Services */}
          <div>
            <h5>Travel Services</h5>

            <Link to="/travel/transfers">
              Transfers
            </Link>

            <Link to="/travel/destinations">
              Destinations
            </Link>

            <Link to="/travel/trip-planner">
              Trip Planner
            </Link>

            <Link to="/travel/price-alerts">
              Price Alerts
            </Link>
          </div>

          {/* Business */}
          <div>
            <h5>Business</h5>

            <Link to="/travel/partner">
              Become a partner
            </Link>

            <Link to="/travel/business">
              Business travel
            </Link>
          </div>

          {/* Support */}
          <div>
            <h5>Support</h5>

            <Link to="/travel/help">
              Help center
            </Link>

            <Link to="/travel/cancellations">
              Cancellations
            </Link>

            <Link to="/travel/contact">
              Contact us
            </Link>

            <Link to="/travel/legal">
              Legal
            </Link>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="travel-footer__bottom">
          <span>
            © {new Date().getFullYear()} Fockis Travel. Demo mockup — not a
            live product.
          </span>

          <span>
            Global marketplace for stays, meetings, dining, cars &amp;
            experiences.
          </span>
        </div>
      </div>
    </footer>
  );
}