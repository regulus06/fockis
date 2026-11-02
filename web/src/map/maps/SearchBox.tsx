import { useEffect, useId, useRef, useState } from "react";
import { Briefcase, Building2, Crosshair, Home, Loader2, MapPin, Search, Star, X } from "lucide-react";

import { mapsApi, type PlaceResult } from "./mapsApi";
import { getMap, useMaps } from "./mapsStore";

/* ============================================================================
   PLACE SEARCH (saved places, Fockis businesses, then map search)
============================================================================ */

function iconFor(r: PlaceResult) {
  if (r.kind === "saved") return r.category === "home" ? <Home size={18} /> : r.category === "work" ? <Briefcase size={18} /> : <Star size={18} />;
  if (r.kind === "business") return <Building2 size={18} />;
  return <MapPin size={18} />;
}

export default function SearchBox({
  placeholder = "Search places, businesses, or drop a pin…",
  value,
  onPick,
  onMyLocation,
  className = "",
  autoFocus,
  leading,
  ariaLabel,
}: {
  placeholder?: string;
  value?: string;
  onPick: (r: PlaceResult) => void;
  onMyLocation?: () => void;
  className?: string;
  autoFocus?: boolean;
  leading?: React.ReactNode;
  ariaLabel?: string;
}) {
  const [q, setQ] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(-1);
  const places = useMaps((s) => s.places);
  const country = useMaps((s) => s.country);
  const box = useRef<HTMLDivElement>(null);
  // Enter pressed before results arrived → take the first result when they do.
  const pickWhenReady = useRef(false);
  const listId = useId();

  useEffect(() => setQ(value ?? ""), [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!open || query.length < 2 || query === value) {
      setItems([]);
      setError("");
      return;
    }
    // "18.59, -72.30" → a pin at those coordinates.
    const m = query.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (m && Math.abs(Number(m[1])) <= 90 && Math.abs(Number(m[2])) <= 180) {
      setItems([{ id: "coords", kind: "place", name: `${Number(m[1]).toFixed(5)}, ${Number(m[2]).toFixed(5)}`, address: "Coordinates", lat: Number(m[1]), lon: Number(m[2]), source: "input" }]);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      const c = getMap()?.getCenter();
      mapsApi
        .search(query, c ? { lat: c.lat, lon: c.lng } : undefined, country.toLowerCase())
        .then((r) => {
          if (pickWhenReady.current && r.length) {
            pickWhenReady.current = false;
            pick(r[0]);
            return;
          }
          pickWhenReady.current = false;
          setItems(r);
          setError(r.length ? "" : "No results. Check the spelling, add the city, or tap the map to drop a pin.");
        })
        .catch((e) => {
          pickWhenReady.current = false;
          setError(e instanceof Error ? e.message : "Search isn't available.");
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [q, open, country, value]);

  const quick: PlaceResult[] = q.trim().length < 2
    ? places.slice(0, 4).map((p) => ({ id: p.id, kind: "saved", name: p.label, address: [p.smartAddressId, p.neighborhood].filter(Boolean).join(" · "), lat: p.latitude, lon: p.longitude, category: p.kind, source: "fockis" }))
    : [];
  const list = items.length ? items : quick;

  const pick = (r: PlaceResult) => {
    setOpen(false);
    setQ(r.name);
    onPick(r);
  };

  return (
    <div className={`fkm-search ${className}`} ref={box}>
      {leading ?? <Search size={20} className="fkm-search__icon" />}
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(list.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(-1, i - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (loading) {
              pickWhenReady.current = true;
              setOpen(true);
            } else if (list.length) pick(list[Math.max(0, active)]);
            else setOpen(true);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoFocus={autoFocus}
      />
      {loading ? (
        <Loader2 size={18} className="fkm-spin fkm-search__end" />
      ) : q ? (
        <button
          type="button"
          className="fkm-search__end"
          onClick={() => {
            setQ("");
            setItems([]);
          }}
          aria-label="Clear"
        >
          <X size={18} />
        </button>
      ) : null}
      {open && (list.length > 0 || error || onMyLocation) && (
        <ul className="fkm-results" id={listId} role="listbox">
          {onMyLocation && (
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onMyLocation();
                }}
              >
                <Crosshair size={18} className="fkm-accent" />
                <span>
                  <strong>My Location</strong>
                  <small>Use GPS</small>
                </span>
              </button>
            </li>
          )}
          {list.map((r, i) => (
            <li key={`${r.kind}-${r.id}-${i}`}>
              <button type="button" role="option" aria-selected={i === active} className={i === active ? "is-active" : ""} onClick={() => pick(r)}>
                <span className={`fkm-results__icon is-${r.kind}`}>{iconFor(r)}</span>
                <span>
                  <strong>{r.name}</strong>
                  {r.address && <small>{r.address}</small>}
                  {r.approximate && <small className="fkm-results__approx">House number not on the map — this is the street. Drag the pin to the exact door.</small>}
                </span>
              </button>
            </li>
          ))}
          {error && !list.length && <li className="fkm-results__empty">{error}</li>}
        </ul>
      )}
    </div>
  );
}
