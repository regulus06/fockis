import { ArrowRight, List, LocateFixed, Map as MapIcon, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

import type { Business } from "../../types/business.types";
import { formatLocation, getBusinessRoute, getCategoryOption } from "../../utils/businessUtils";
import { BusinessCover } from "../BusinessUi";
import BusinessesMap from "./BusinessesMap";
import { openLabel, shortDistance } from "./discoverUtils";

export interface NearbyItem {
  business: Business;
  distanceKm?: number;
}

interface Props {
  items: NearbyItem[];
  loading: boolean;
  view: "list" | "map";
  onViewChange: (view: "list" | "map") => void;
  hasLocation: boolean;
  locating: boolean;
  locationError: string | null;
  onRequestLocation: () => void;
  onViewAll: () => void;
  center?: { lat: number; lng: number } | null;
}

function NearbyCard({ item }: { item: NearbyItem }) {
  const { business, distanceKm } = item;
  const category = getCategoryOption(business.category);
  const open = openLabel(business);
  const route = getBusinessRoute(business.id);

  return (
    <Link to={route} className="fkbd-near" aria-label={business.name}>
      <span className="fkbd-near__thumb">
        <BusinessCover business={business} />
      </span>
      <span className="fkbd-near__text">
        <strong className="fkbd-truncate">{business.name}</strong>
        <span className="fkbd-near__category">
          <category.icon size={13} aria-hidden="true" /> {category.label}
        </span>
        <span className="fkbd-near__line">
          <MapPin size={13} aria-hidden="true" />
          <span className="fkbd-truncate">
            {distanceKm !== undefined ? shortDistance(distanceKm) : business.city || formatLocation(business) || "—"}
          </span>
        </span>
        {open && (
          <span className="fkbd-near__line">
            <span className={`fkbd-open fkbd-open--${open.status}`}>{open.status === "open" ? "Open" : "Closed"}</span>
            {open.text && <span className="fkbd-truncate">· {open.text}</span>}
          </span>
        )}
      </span>
    </Link>
  );
}

export default function NearbyBusinesses({
  items,
  loading,
  view,
  onViewChange,
  hasLocation,
  locating,
  locationError,
  onRequestLocation,
  onViewAll,
  center,
}: Props) {
  return (
    <section className="fkbd-section" aria-labelledby="fkbd-nearby-title">
      <header className="fkbd-section__head">
        <MapPin size={28} className="fkbd-section__pin" fill="currentColor" stroke="#fff" aria-hidden="true" />
        <div>
          <h2 id="fkbd-nearby-title">Nearby Businesses</h2>
          <p>
            {hasLocation
              ? "Businesses close to your location."
              : "Share your location to see what's closest — showing businesses with an address for now."}
          </p>
        </div>

        <div className="fkbd-viewtoggle" role="group" aria-label="Display">
          <button type="button" className={view === "list" ? "is-active" : ""} aria-pressed={view === "list"} onClick={() => onViewChange("list")}>
            <List size={16} aria-hidden="true" /> List View
          </button>
          <button type="button" className={view === "map" ? "is-active" : ""} aria-pressed={view === "map"} onClick={() => onViewChange("map")}>
            <MapIcon size={16} aria-hidden="true" /> Map View
          </button>
        </div>
        <button type="button" className="fkbd-viewall" onClick={onViewAll}>
          View All <ArrowRight size={15} aria-hidden="true" />
        </button>
      </header>

      {!hasLocation && (
        <div className="fkbd-locate">
          <button type="button" className="fkbd-btn fkbd-btn--outline" onClick={onRequestLocation} disabled={locating}>
            <LocateFixed size={15} aria-hidden="true" /> {locating ? "Finding you…" : "Use my location"}
          </button>
          {locationError && <span role="status">{locationError}</span>}
        </div>
      )}

      {view === "map" ? (
        <BusinessesMap items={items} center={center ?? null} />
      ) : loading ? (
        <div className="fkbd-near-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={index} className="fkbd-near fkbd-near--skeleton fkb-skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="fkbd-muted">No businesses with a saved address yet.</p>
      ) : (
        <div className="fkbd-near-grid">
          {items.slice(0, 8).map((item) => (
            <NearbyCard key={item.business.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
