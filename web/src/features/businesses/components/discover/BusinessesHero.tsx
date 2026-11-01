import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  BarChart3,
  Check,
  ChevronDown,
  Globe2,
  LocateFixed,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { BUSINESS_MANAGER_ROUTE, CREATE_BUSINESS_ROUTE } from "../../utils/businessUtils";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  city: string;
  cities: string[];
  onCityChange: (city: string) => void;
  nearMe: boolean;
  locating: boolean;
  onNearMe: () => void;
  backgroundUrl?: string;
}

export default function BusinessesHero({
  query,
  onQueryChange,
  onSubmit,
  city,
  cities,
  onCityChange,
  nearMe,
  locating,
  onNearMe,
  backgroundUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const close = (domEvent: MouseEvent | KeyboardEvent) => {
      if (domEvent instanceof KeyboardEvent) {
        if (domEvent.key === "Escape") setOpen(false);
        return;
      }

      if (!ref.current?.contains(domEvent.target as Node)) setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const label = locating ? "Locating…" : nearMe ? "Near you" : city || "Anywhere";

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    onSubmit();
  };

  return (
    <header className="fkbd-hero">
      <span className="fkbd-hero__bg" aria-hidden="true">
        {backgroundUrl && <img className="fkbd-hero__photo" src={backgroundUrl} alt="" />}
        <span className="fkbd-hero__glow" />
        <span className="fkbd-hero__scrim" />
      </span>

      <div className="fkbd-hero__content">
        <span className="fkbd-hero__eyebrow">
          <Store size={20} aria-hidden="true" /> Fockis Businesses
        </span>
        <h1>Discover Businesses on Fockis</h1>
        <p>
          Find local services, retailers, restaurants and companies on Fockis — discover what they offer, their
          latest deals and where to shop.
        </p>

        <div className="fkbd-hero__row">
          <form className="fkbd-search" role="search" onSubmit={submit}>
            <label className="fkbd-search__field">
              <Search size={19} aria-hidden="true" />
              <span className="fkb-visually-hidden">Search businesses</span>
              <input
                type="search"
                value={query}
                onChange={(changeEvent) => onQueryChange(changeEvent.target.value)}
                placeholder="Search businesses, services, or products..."
                maxLength={100}
                autoComplete="off"
              />
            </label>

            <div className="fkbd-search__where" ref={ref}>
              <button
                type="button"
                className="fkbd-search__where-btn"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((value) => !value)}
              >
                <MapPin size={17} aria-hidden="true" />
                <span>{label}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>

              {open && (
                <div className="fkbd-menu" id={menuId} role="listbox" aria-label="Where">
                  <button
                    type="button"
                    role="option"
                    aria-selected={nearMe}
                    onClick={() => {
                      setOpen(false);
                      onNearMe();
                    }}
                  >
                    <LocateFixed size={16} aria-hidden="true" /> Near you
                    {nearMe && <Check size={15} className="fkbd-menu__check" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!nearMe && !city}
                    onClick={() => {
                      setOpen(false);
                      onCityChange("");
                    }}
                  >
                    <Globe2 size={16} aria-hidden="true" /> Anywhere
                    {!nearMe && !city && <Check size={15} className="fkbd-menu__check" aria-hidden="true" />}
                  </button>
                  {cities.map((name) => (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={!nearMe && city === name}
                      onClick={() => {
                        setOpen(false);
                        onCityChange(name);
                      }}
                    >
                      <MapPin size={16} aria-hidden="true" /> {name}
                      {!nearMe && city === name && <Check size={15} className="fkbd-menu__check" aria-hidden="true" />}
                    </button>
                  ))}
                  {/* Not a <form>: this menu already sits inside the search form. */}
                  <div className="fkbd-menu__city">
                    <label className="fkb-visually-hidden" htmlFor={`${menuId}-city`}>
                      Another city
                    </label>
                    <input
                      id={`${menuId}-city`}
                      value={cityDraft}
                      onChange={(changeEvent) => setCityDraft(changeEvent.target.value)}
                      placeholder="Type a city, then Enter…"
                      maxLength={100}
                      autoComplete="address-level2"
                      onKeyDown={(keyEvent) => {
                        if (keyEvent.key !== "Enter") return;
                        keyEvent.preventDefault();
                        if (!cityDraft.trim()) return;
                        setOpen(false);
                        onCityChange(cityDraft.trim());
                        setCityDraft("");
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="fkbd-search__submit">
              Search
            </button>
          </form>

          <div className="fkbd-hero__buttons">
            <Link to={BUSINESS_MANAGER_ROUTE} className="fkbd-hero__btn fkbd-hero__btn--glass">
              <Settings size={16} aria-hidden="true" /> Manage My Businesses
            </Link>
            <Link to={CREATE_BUSINESS_ROUTE} className="fkbd-hero__btn fkbd-hero__btn--blue">
              <Plus size={17} aria-hidden="true" /> Add a Business
            </Link>
          </div>
        </div>
      </div>

      <nav className="fkbd-hero__panel" aria-label="Grow on Fockis">
        <Link to={BUSINESS_MANAGER_ROUTE}>
          <BarChart3 size={20} aria-hidden="true" /> Grow Your Business
        </Link>
        <Link to="/ads">
          <Megaphone size={20} aria-hidden="true" /> Promote &amp; Reach More
        </Link>
        <Link to="/businesses/deals">
          <Users size={20} aria-hidden="true" /> Get More Customers
        </Link>
      </nav>
    </header>
  );
}
