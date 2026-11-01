import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronDown, Globe2, LocateFixed, MapPin, Megaphone, Search, Users } from "lucide-react";
import { Link } from "react-router-dom";

import type { LocationStatus } from "../../hooks/useViewerLocation";

const RADII = [10, 25, 50, 100];

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  hasLocation: boolean;
  locationStatus: LocationStatus;
  radiusKm: number | "";
  onRequestLocation: () => void;
  onRadiusChange: (radius: number | "") => void;
  onClearLocation: () => void;
  /** Optional photo behind the gradient (e.g. the top featured event). */
  backgroundUrl?: string;
}

export default function EventsHero({
  query,
  onQueryChange,
  onSubmit,
  hasLocation,
  locationStatus,
  radiusKm,
  onRequestLocation,
  onRadiusChange,
  onClearLocation,
  backgroundUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const locationRef = useRef<HTMLDivElement>(null);
  const nearMe = hasLocation && radiusKm !== "";
  const locating = locationStatus === "locating";

  // After the browser grants location, apply the radius that was picked.
  const pendingRadius = useRef<number | null>(null);

  useEffect(() => {
    if (hasLocation && pendingRadius.current !== null) {
      onRadiusChange(pendingRadius.current);
      pendingRadius.current = null;
    }
  }, [hasLocation, onRadiusChange]);

  useEffect(() => {
    if (!open) return;

    const close = (domEvent: MouseEvent | KeyboardEvent) => {
      if (domEvent instanceof KeyboardEvent) {
        if (domEvent.key === "Escape") setOpen(false);
        return;
      }

      if (!locationRef.current?.contains(domEvent.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const chooseRadius = (radius: number) => {
    setOpen(false);

    if (hasLocation) {
      onRadiusChange(radius);
      return;
    }

    pendingRadius.current = radius;
    onRequestLocation();
  };

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    onSubmit();
  };

  const locationLabel = locating ? "Locating…" : nearMe ? `Within ${radiusKm} km` : "Anywhere";

  return (
    <header className="fkd-hero">
      <span className="fkd-hero__bg" aria-hidden="true">
        {backgroundUrl && <img className="fkd-hero__photo" src={backgroundUrl} alt="" />}
        <span className="fkd-hero__lights" />
        <span className="fkd-hero__scrim" />
      </span>

      <div className="fkd-hero__content">
        <span className="fkd-hero__eyebrow">
          <CalendarDays size={20} aria-hidden="true" /> Fockis Events
        </span>
        <h1>Discover What's Happening on Fockis</h1>
        <p>Find and join events near you — concerts, meetups, classes, sports, community and more.</p>

        <form className="fkd-search" role="search" onSubmit={submit}>
          <label className="fkd-search__field">
            <Search size={20} aria-hidden="true" />
            <span className="fke-sr-only">Search events</span>
            <input
              type="search"
              value={query}
              onChange={(changeEvent) => onQueryChange(changeEvent.target.value)}
              placeholder="Search events, places, or categories..."
              maxLength={120}
            />
          </label>

          <div className="fkd-search__location" ref={locationRef}>
            <button
              type="button"
              className="fkd-search__location-btn"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpen((value) => !value)}
            >
              <MapPin size={18} aria-hidden="true" />
              <span>{locationLabel}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>

            {open && (
              <div className="fkd-search__menu" id={menuId} role="listbox" aria-label="Where">
                <button
                  type="button"
                  role="option"
                  aria-selected={!nearMe}
                  onClick={() => {
                    setOpen(false);
                    onRadiusChange("");
                  }}
                >
                  <Globe2 size={16} aria-hidden="true" /> Anywhere
                  {!nearMe && <Check size={15} className="fkd-search__check" aria-hidden="true" />}
                </button>
                {RADII.map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    role="option"
                    aria-selected={nearMe && radiusKm === radius}
                    onClick={() => chooseRadius(radius)}
                  >
                    <LocateFixed size={16} aria-hidden="true" /> Near you · {radius} km
                    {nearMe && radiusKm === radius && <Check size={15} className="fkd-search__check" aria-hidden="true" />}
                  </button>
                ))}
                {hasLocation && (
                  <button
                    type="button"
                    className="fkd-search__forget"
                    onClick={() => {
                      setOpen(false);
                      onClearLocation();
                    }}
                  >
                    Stop using my location
                  </button>
                )}
              </div>
            )}
          </div>

          <button type="submit" className="fkd-search__submit">
            Search
          </button>
        </form>

        {locationStatus === "denied" && (
          <p className="fkd-hero__note" role="status">
            Location is blocked for this site. You can still search all events.
          </p>
        )}
        {locationStatus === "unavailable" && (
          <p className="fkd-hero__note" role="status">
            Your location isn't available right now. You can still search all events.
          </p>
        )}
      </div>

      <nav className="fkd-hero__panel" aria-label="Host on Fockis">
        <Link to="/events/create">
          <CalendarDays size={24} aria-hidden="true" /> Create Events
        </Link>
        <Link to="/events/my-events">
          <Megaphone size={24} aria-hidden="true" /> Promote &amp; Share
        </Link>
        <Link to="/ads">
          <Users size={24} aria-hidden="true" /> Grow Your Audience
        </Link>
      </nav>
    </header>
  );
}
