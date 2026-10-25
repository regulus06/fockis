import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  BedDouble,
  ChevronRight,
  Compass,
  MapPin,
  RefreshCw,
  Store,
} from "lucide-react";

import LanguageSelector from "../../../i18n/components/LanguageSelector";

import TravelSearchPanel from "../components/TravelSearchPanel";
import TravelCategoryShortcuts from "../components/TravelCategoryShortcuts";
import TravelListingCard from "../components/TravelListingCard";
import {
  POPULAR_DESTINATIONS,
  TRAVEL_HERO_IMAGE,
  destinationSearchUrl,
  unsplash,
} from "../components/travelDiscovery";
import type { PopularDestination } from "../components/travelDiscovery";
import {
  buildVerifiedPartnerIndex,
  fetchTravelListings,
  fetchVerifiedBusinesses,
  findListingPartner,
  getBusinessDisplayName,
  getListingId,
  resolveTravelMedia,
  sortFeaturedFirst,
} from "../services/travelListingView";
import type {
  TravelListingView,
  VerifiedBusinessView,
} from "../services/travelListingView";
import "../styles/TravelHomePage.scss";

/**
 * ============================================================================
 * FOCKIS TRAVEL — HOME
 * ============================================================================
 *
 * Layout follows the Fockis Travel reference design:
 *   hero → overlapping search panel → circular category shortcuts →
 *   Popular Destinations → Featured Stays → Top Experiences
 * followed by the existing verified-business and partner sections.
 *
 * Data (all existing endpoints, nothing mocked):
 *   GET /travel/listings?type=stay        Featured Stays
 *   GET /travel/listings?type=experience  Top Experiences
 *   GET /travel/partners/verified         verified businesses + badges
 *
 * Popular Destinations are discovery links into /travel/explore, not
 * inventory; empty listing sections show an honest empty state.
 * ============================================================================
 */

const FEATURED_COUNT = 4;

// Haiti is included as a featured destination while keeping the shared
// destination list and all existing cards intact.
const HOME_POPULAR_DESTINATIONS: PopularDestination[] = [
  ...POPULAR_DESTINATIONS,
  {
    city: "Port-au-Prince",
    country: "Haiti",
    image: "photo-1500375592092-40eb2168fd21",
  },
];

type LoadState = "loading" | "ready" | "error";

function SectionHead({
  id,
  title,
  subtitle,
  to,
  linkLabel = "View All",
}: {
  id: string;
  title: string;
  subtitle: string;
  to?: string;
  linkLabel?: string;
}) {
  return (
    <div className="ft-home__head">
      <div>
        <h2 id={id}>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {to && (
        <Link to={to} className="ft-home__view-all">
          {linkLabel} <ChevronRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function CardSkeletons({ count = FEATURED_COUNT, short = false }: { count?: number; short?: boolean }) {
  return (
    <div className="ft-home__cards" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`ft-skel-card${short ? " ft-skel-card--short" : ""}`}>
          <div className="ft-skel ft-skel-card__media" />
          <div className="ft-skel-card__body">
            <div className="ft-skel ft-skel--line" />
            <div className="ft-skel ft-skel--line ft-skel--short" />
            {!short && <div className="ft-skel ft-skel--button" />}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  message,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ft-home__empty">
      <span className="ft-home__empty-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {action}
    </div>
  );
}

function DestinationCard({ destination }: { destination: PopularDestination }) {
  const [failed, setFailed] = useState(false);

  return (
    <Link
      to={destinationSearchUrl(destination)}
      className="ft-dest"
      aria-label={`Explore ${destination.city}, ${destination.country}`}
    >
      {!failed && (
        <img
          src={unsplash(destination.image, 420, 520)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      <span className="ft-dest__text">
        <strong>{destination.city}</strong>
        <span>{destination.country}</span>
      </span>
    </Link>
  );
}

function BusinessCard({ business }: { business: VerifiedBusinessView }) {
  const [failed, setFailed] = useState(false);
  const id = String(business._id || business.id || "");
  const name = getBusinessDisplayName(business);
  const image = resolveTravelMedia(business.coverImage || business.logo || "");
  const city = business.city || business.addressInfo?.city || "";
  const country = business.country || business.addressInfo?.country || "";
  const location = [city, country].filter(Boolean).join(", ");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <Link
      to={id ? `/travel/businesses/${encodeURIComponent(id)}` : "/travel/business"}
      className="ft-biz"
    >
      <span className="ft-biz__media">
        {image && !failed ? (
          <img src={image} alt="" loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <span className="ft-biz__initials" aria-hidden="true">
            {initials || "FT"}
          </span>
        )}
      </span>
      <span className="ft-biz__body">
        <strong>{name}</strong>
        {location && <span>{location}</span>}
        <span className="ft-biz__badge">
          <BadgeCheck size={13} aria-hidden="true" /> Verified business
        </span>
      </span>
    </Link>
  );
}

export default function TravelHomePage() {
  const [stays, setStays] = useState<TravelListingView[]>([]);
  const [experiences, setExperiences] = useState<TravelListingView[]>([]);
  const [businesses, setBusinesses] = useState<VerifiedBusinessView[]>([]);

  const [staysState, setStaysState] = useState<LoadState>("loading");
  const [experiencesState, setExperiencesState] = useState<LoadState>("loading");
  const [businessState, setBusinessState] = useState<LoadState>("loading");

  const loadStays = useCallback(async () => {
    setStaysState("loading");
    try {
      const items = await fetchTravelListings({ type: "stay" });
      setStays([...items].sort(sortFeaturedFirst));
      setStaysState("ready");
    } catch (error) {
      console.error("[Fockis Travel] Unable to load stays:", error);
      setStays([]);
      setStaysState("error");
    }
  }, []);

  const loadExperiences = useCallback(async () => {
    setExperiencesState("loading");
    try {
      const items = await fetchTravelListings({ type: "experience" });
      setExperiences([...items].sort(sortFeaturedFirst));
      setExperiencesState("ready");
    } catch (error) {
      console.error("[Fockis Travel] Unable to load experiences:", error);
      setExperiences([]);
      setExperiencesState("error");
    }
  }, []);

  const loadBusinesses = useCallback(async () => {
    setBusinessState("loading");
    try {
      setBusinesses(await fetchVerifiedBusinesses());
      setBusinessState("ready");
    } catch (error) {
      console.error("[Fockis Travel] Unable to load verified businesses:", error);
      setBusinesses([]);
      setBusinessState("error");
    }
  }, []);

  useEffect(() => {
    void loadStays();
    void loadExperiences();
    void loadBusinesses();
  }, [loadStays, loadExperiences, loadBusinesses]);

  const verifiedIndex = useMemo(() => buildVerifiedPartnerIndex(businesses), [businesses]);
  const featuredStays = stays.slice(0, FEATURED_COUNT);
  const topExperiences = experiences.slice(0, FEATURED_COUNT);
  const featuredBusinesses = businesses.slice(0, 8);

  return (
    <div className="ft-home">
      {/* =============================== HERO + SEARCH =============================== */}
      <section className="ft-home__hero-wrap" aria-labelledby="ft-home-title">
        <div className="ft-home__hero">
          <img
            className="ft-home__hero-img"
            src={unsplash(TRAVEL_HERO_IMAGE, 1600, 700)}
            srcSet={`${unsplash(TRAVEL_HERO_IMAGE, 800, 700)} 800w, ${unsplash(TRAVEL_HERO_IMAGE, 1600, 700)} 1600w, ${unsplash(TRAVEL_HERO_IMAGE, 2200, 900)} 2200w`}
            sizes="(max-width: 1240px) 100vw, 1200px"
            alt=""
            loading="eager"
            decoding="async"
          />
          <div className="ft-home__hero-copy">
            <h1 id="ft-home-title">
              Discover <span>Your Next Adventure</span>
            </h1>
            <p>
              Explore amazing destinations, unique stays, incredible experiences, and
              more with Fockis Travel.
            </p>
          </div>
        </div>

        <div className="ft-home__search">
          <TravelSearchPanel />
        </div>
      </section>

      <div className="ft-home__content">
        {/* =============================== SHORTCUTS =============================== */}
        <TravelCategoryShortcuts className="ft-home__shortcuts" />

        {/* =============================== DESTINATIONS =============================== */}
        <section className="ft-home__section" aria-labelledby="ft-destinations">
          <SectionHead
            id="ft-destinations"
            title="Popular Destinations"
            subtitle="Explore top destinations around the world with Fockis Travel."
            to="/travel/destinations"
          />
          <div className="ft-home__dests">
            {HOME_POPULAR_DESTINATIONS.map((destination) => (
              <DestinationCard key={destination.city} destination={destination} />
            ))}
          </div>
        </section>

        {/* =============================== FEATURED STAYS =============================== */}
        <section className="ft-home__section" aria-labelledby="ft-featured-stays">
          <SectionHead
            id="ft-featured-stays"
            title="Featured Stays"
            subtitle="Handpicked hotels, resorts, and unique accommodations."
            to="/travel/stays"
          />

          {staysState === "loading" ? (
            <CardSkeletons />
          ) : staysState === "error" ? (
            <EmptyBlock
              icon={<AlertCircle size={24} />}
              title="Stays couldn’t load"
              message="We couldn’t reach Fockis Travel right now. Check your connection and try again."
              action={
                <button type="button" className="ft-home__retry" onClick={() => void loadStays()}>
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              }
            />
          ) : featuredStays.length === 0 ? (
            <EmptyBlock
              icon={<BedDouble size={24} />}
              title="No stays listed yet"
              message="Hotels and resorts will appear here as soon as Fockis Travel partners publish them."
              action={
                <Link to="/travel/partner" className="ft-home__ghost-link">
                  List your property
                </Link>
              }
            />
          ) : (
            <div className="ft-home__cards">
              {featuredStays.map((listing) => (
                <TravelListingCard
                  key={getListingId(listing)}
                  listing={listing}
                  verified={Boolean(findListingPartner(listing, verifiedIndex))}
                />
              ))}
            </div>
          )}
        </section>

        {/* =============================== TOP EXPERIENCES =============================== */}
        <section className="ft-home__section" aria-labelledby="ft-top-experiences">
          <SectionHead
            id="ft-top-experiences"
            title="Top Experiences"
            subtitle="Unforgettable activities, tours, and experiences."
            to="/travel/experiences"
          />

          {experiencesState === "loading" ? (
            <CardSkeletons short />
          ) : experiencesState === "error" ? (
            <EmptyBlock
              icon={<AlertCircle size={24} />}
              title="Experiences couldn’t load"
              message="We couldn’t reach Fockis Travel right now. Please try again."
              action={
                <button
                  type="button"
                  className="ft-home__retry"
                  onClick={() => void loadExperiences()}
                >
                  <RefreshCw size={16} aria-hidden="true" /> Try again
                </button>
              }
            />
          ) : topExperiences.length === 0 ? (
            <EmptyBlock
              icon={<Compass size={24} />}
              title="No experiences listed yet"
              message="Tours and activities will appear here once local partners publish them."
            />
          ) : (
            <div className="ft-home__cards">
              {topExperiences.map((listing) => (
                <TravelListingCard
                  key={getListingId(listing)}
                  listing={listing}
                  variant="experience"
                  verified={Boolean(findListingPartner(listing, verifiedIndex))}
                />
              ))}
            </div>
          )}
        </section>

        {/* =============================== VERIFIED BUSINESSES =============================== */}
        {(businessState === "error" || featuredBusinesses.length > 0) && (
          <section className="ft-home__section" aria-labelledby="ft-businesses">
            <SectionHead
              id="ft-businesses"
              title="Verified Travel Businesses"
              subtitle="Hotels, restaurants and tour operators approved on Fockis Travel."
              to="/travel/business"
            />

            {businessState === "error" ? (
              <EmptyBlock
                icon={<Store size={24} />}
                title="Businesses couldn’t load"
                message="Verified businesses are temporarily unavailable."
                action={
                  <button
                    type="button"
                    className="ft-home__retry"
                    onClick={() => void loadBusinesses()}
                  >
                    <RefreshCw size={16} aria-hidden="true" /> Try again
                  </button>
                }
              />
            ) : (
              <div className="ft-home__biz">
                {featuredBusinesses.map((business) => (
                  <BusinessCard key={String(business._id || business.id)} business={business} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* =============================== PARTNER BAND =============================== */}
        <section className="ft-home__partner" aria-labelledby="ft-partner">
          <div>
            <h2 id="ft-partner">Grow your business with Fockis Travel</h2>
            <p>
              Hotels, rentals, restaurants, tours, car rentals and meeting spaces can list on
              Fockis Travel and reach travelers worldwide.
            </p>
          </div>
          <div className="ft-home__partner-actions">
            <Link to="/travel/partner" className="ft-home__partner-primary">
              Become a partner
            </Link>
            <Link to="/travel/business" className="ft-home__partner-secondary">
              <MapPin size={16} aria-hidden="true" /> Business travel
            </Link>
          </div>
        </section>

        <div className="ft-home__language">
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
}
