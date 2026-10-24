import { Link } from "react-router-dom";

import { TravelLogo } from "./TravelHeader";
import "../styles/TravelFooter.scss";

/**
 * Shared site footer for every Fockis Travel page.
 * Every link points at an existing Travel route.
 */

const COLUMNS: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
  {
    title: "Explore",
    links: [
      { to: "/travel/stays", label: "Stays" },
      { to: "/travel/explore?type=rental", label: "Vacation Rentals" },
      { to: "/travel/restaurants", label: "Restaurants" },
      { to: "/travel/cars", label: "Cars" },
      { to: "/travel/experiences", label: "Experiences" },
      { to: "/travel/explore?type=event", label: "Events" },
    ],
  },
  {
    title: "Travel services",
    links: [
      { to: "/travel/meetings", label: "Meetings" },
      { to: "/travel/transfers", label: "Transfers" },
      { to: "/travel/destinations", label: "Destinations" },
      { to: "/travel/trip-planner", label: "Trip Planner" },
      { to: "/travel/price-alerts", label: "Price Alerts" },
    ],
  },
  {
    title: "Your trips",
    links: [
      { to: "/travel/my-trips", label: "My Trips" },
      { to: "/travel/wishlist", label: "Favorites" },
      { to: "/travel/explore", label: "Search" },
      { to: "/travel/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "Business",
    links: [
      { to: "/travel/partner", label: "Become a partner" },
      { to: "/travel/partner/dashboard", label: "Partner dashboard" },
      { to: "/travel/business", label: "Business travel" },
    ],
  },
];

export default function TravelFooter() {
  return (
    <footer className="travel-footer">
      <div className="travel-footer__inner">
        <div className="travel-footer__grid">
          <div className="travel-footer__brand">
            <Link to="/travel" aria-label="Fockis Travel home" className="travel-footer__logo">
              <TravelLogo />
            </Link>

            <p>Travel anywhere. Book everything.</p>

            <div className="travel-footer__social">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fockis Travel on Facebook"
              >
                <span aria-hidden="true">f</span>
              </a>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fockis Travel on Instagram"
              >
                <span aria-hidden="true">◎</span>
              </a>
              <a
                href="https://x.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Fockis Travel on X"
              >
                <span aria-hidden="true">𝕏</span>
              </a>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h5>{column.title}</h5>
              {column.links.map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="travel-footer__bottom">
          <span>
            © {new Date().getFullYear()} Fockis Travel. Demo mockup — not a live product.
          </span>
          <span>Global marketplace for stays, meetings, dining, cars &amp; experiences.</span>
        </div>
      </div>
    </footer>
  );
}
