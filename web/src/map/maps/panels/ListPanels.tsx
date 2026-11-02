import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bike, Briefcase, Building2, Clock3, Home, Loader2, MapPin, Package, Plus, Route, Star, Trash2, Users, Volume2 } from "lucide-react";

import { formatDistance, formatDuration } from "../geo";
import { mapsApi, type LocationKind, type PlaceResult, type SavedLocation, type TravelMode } from "../mapsApi";
import { getMap, useMaps } from "../mapsStore";
import { planRoute } from "../navigation";
import { selectPoint } from "../MapCanvas";
import { MODES } from "./Directions";
import { refreshPlaces, VerificationBadge } from "./PlacePanels";

/* ============================================================================
   MY LOCATIONS · SAVED PLACES · BUSINESSES · NEARBY · SETTINGS · DELIVERY
============================================================================ */

const st = () => useMaps.getState();

export function openSaved(p: SavedLocation) {
  st().set({ view: "map", editor: null });
  selectPoint({ lat: p.latitude, lon: p.longitude, name: p.label, source: "saved", saved: p, footprint: p.building?.footprint ?? null });
  getMap()?.flyTo({ center: [p.longitude, p.latitude], zoom: 18 });
}

export function startNewPlace(kind?: LocationKind) {
  const map = getMap();
  const s = st();
  const center = s.me ? { lat: s.me.lat, lon: s.me.lon } : map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : { lat: 18.5944, lon: -72.3074 };
  s.set({ view: "map", selected: null, editor: { lat: center.lat, lon: center.lon, kind, captureMethod: s.me ? "gps" : "pin", accuracyM: s.me ? Math.round(s.me.accuracy) : 0 } });
  map?.flyTo({ center: [center.lon, center.lat], zoom: 18 });
}

function KindIcon({ kind }: { kind: LocationKind }) {
  if (kind === "home") return <Home size={20} />;
  if (kind === "work") return <Briefcase size={20} />;
  if (kind === "family") return <Users size={20} />;
  return <Star size={20} />;
}

function PlaceRow({ p }: { p: SavedLocation }) {
  return (
    <li>
      <button type="button" className="fkm-row" onClick={() => openSaved(p)}>
        <span className={`fkm-row__icon is-${p.kind}`}>
          <KindIcon kind={p.kind} />
        </span>
        <span className="fkm-row__body">
          <strong>
            {p.label} <VerificationBadge place={p} />
          </strong>
          <small>
            {p.smartAddressId} · {[p.neighborhood, p.commune].filter(Boolean).join(", ") || p.plusCode}
          </small>
        </span>
      </button>
    </li>
  );
}

export function LocationsPanel() {
  const places = useMaps((s) => s.places);
  const loaded = useMaps((s) => s.placesLoaded);
  const mine = places.filter((p) => p.kind !== "saved");
  const home = places.find((p) => p.kind === "home");
  const work = places.find((p) => p.kind === "work");
  useEffect(() => {
    void refreshPlaces();
  }, []);
  return (
    <section className="fkm-card fkm-listpanel">
      <header className="fkm-card__head">
        <MapPin size={22} className="fkm-accent" />
        <h2>My Locations</h2>
        <button type="button" className="fkm-btn fkm-btn--primary fkm-btn--sm" onClick={() => startNewPlace()}>
          <Plus size={16} /> New
        </button>
      </header>
      <p className="fkm-muted">Pin your home or business once, and share its Fockis Smart Address instead of explaining the way every time.</p>
      {!home && (
        <button type="button" className="fkm-cta" onClick={() => startNewPlace("home")}>
          <Home size={20} /> Set your home location
        </button>
      )}
      {!work && home && (
        <button type="button" className="fkm-cta" onClick={() => startNewPlace("work")}>
          <Briefcase size={20} /> Add your work location
        </button>
      )}
      {!loaded ? (
        <Loader2 className="fkm-spin fkm-center" />
      ) : (
        <ul className="fkm-rows">
          {mine.map((p) => (
            <PlaceRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function SavedPanel() {
  const places = useMaps((s) => s.places);
  const routes = useMaps((s) => s.savedRoutes);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void Promise.all([refreshPlaces(), mapsApi.savedRoutes().then((r) => st().set({ savedRoutes: r }))])
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);
  const saved = places.filter((p) => p.kind === "saved");
  return (
    <section className="fkm-card fkm-listpanel">
      <header className="fkm-card__head">
        <Star size={22} className="fkm-accent" />
        <h2>Saved Places</h2>
      </header>
      {loading ? (
        <Loader2 className="fkm-spin fkm-center" />
      ) : (
        <>
          <h3 className="fkm-subhead">Places</h3>
          {saved.length ? (
            <ul className="fkm-rows">
              {saved.map((p) => (
                <PlaceRow key={p.id} p={p} />
              ))}
            </ul>
          ) : (
            <p className="fkm-muted">Tap any place on the map and choose “Save as Smart Address”.</p>
          )}
          <h3 className="fkm-subhead">Routes</h3>
          {routes.length ? (
            <ul className="fkm-rows">
              {routes.map((r) => (
                <li key={r.id}>
                  <div className="fkm-row">
                    <span className="fkm-row__icon">
                      <Route size={20} />
                    </span>
                    <button
                      type="button"
                      className="fkm-row__body"
                      onClick={() => {
                        st().set({ view: "navigation", origin: r.origin.label === "My Location" ? null : r.origin, destination: r.destination, mode: r.mode, plan: null });
                        void planRoute({ fit: true });
                      }}
                    >
                      <strong>{r.name}</strong>
                      <small>
                        {MODES.find((m) => m.mode === r.mode)?.label} · {formatDistance(r.distanceM)} · {formatDuration(r.durationS)}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="fkm-icon"
                      aria-label={`Delete ${r.name}`}
                      onClick={async () => {
                        await mapsApi.deleteRoute(r.id).catch(() => undefined);
                        st().set({ savedRoutes: st().savedRoutes.filter((x) => x.id !== r.id) });
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="fkm-muted">Save a route from the directions panel to reuse it.</p>
          )}
        </>
      )}
    </section>
  );
}

export function BusinessesPanel() {
  const [items, setItems] = useState<PlaceResult[] | null>(null);
  const [error, setError] = useState("");
  const load = async () => {
    const map = getMap();
    if (!map) return;
    const b = map.getBounds();
    setError("");
    try {
      const list = await mapsApi.businesses({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
      setItems(list);
      st().set({ poi: { category: "business", label: "Fockis businesses", items: list } });
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Couldn't load businesses.");
    }
  };
  useEffect(() => {
    void load();
    return () => st().set({ poi: null });
  }, []);
  return (
    <section className="fkm-card fkm-listpanel">
      <header className="fkm-card__head">
        <Building2 size={22} className="fkm-accent" />
        <h2>Businesses</h2>
        <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--sm" onClick={() => void load()}>
          Search this area
        </button>
      </header>
      {items === null ? (
        <Loader2 className="fkm-spin fkm-center" />
      ) : error ? (
        <p className="fkm-error">{error}</p>
      ) : items.length ? (
        <ul className="fkm-rows">
          {items.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                className="fkm-row"
                onClick={() => {
                  selectPoint({ lat: b.lat, lon: b.lon, name: b.name, address: b.address, source: "business", category: b.category, logoUrl: b.logoUrl, businessId: b.id });
                  getMap()?.flyTo({ center: [b.lon, b.lat], zoom: 17 });
                }}
              >
                <span className="fkm-row__icon">{b.logoUrl ? <img src={b.logoUrl} alt="" /> : <Building2 size={20} />}</span>
                <span className="fkm-row__body">
                  <strong>{b.name}</strong>
                  <small>{[String(b.category ?? "").replace(/_/g, " ").toLowerCase(), b.address].filter(Boolean).join(" · ")}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fkm-muted">No Fockis businesses with a map location in this area. Move the map and search again.</p>
      )}
    </section>
  );
}

export function PoiPanel() {
  const poi = useMaps((s) => s.poi)!;
  return (
    <section className="fkm-card fkm-listpanel">
      <header className="fkm-card__head">
        <MapPin size={22} className="fkm-accent" />
        <h2>{poi.label}</h2>
        <button type="button" className="fkm-link" onClick={() => st().set({ poi: null })}>
          Close
        </button>
      </header>
      {poi.items.length ? (
        <ul className="fkm-rows">
          {poi.items.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="fkm-row"
                onClick={() => {
                  selectPoint({ lat: p.lat, lon: p.lon, name: p.name, address: p.address, source: "poi", category: p.category });
                  getMap()?.flyTo({ center: [p.lon, p.lat], zoom: 17.5 });
                }}
              >
                <span className="fkm-row__icon">
                  <MapPin size={20} />
                </span>
                <span className="fkm-row__body">
                  <strong>{p.name}</strong>
                  <small>{p.address || p.category}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fkm-muted">Nothing found in this part of the map. Zoom in or move the map, then try again.</p>
      )}
      <p className="fkm-attrib">Places from OpenStreetMap</p>
    </section>
  );
}

export function SettingsPanel() {
  const settings = useMaps((s) => s.settings);
  const update = useMaps((s) => s.updateSettings);
  return (
    <section className="fkm-card fkm-listpanel">
      <header className="fkm-card__head">
        <h2>Map settings</h2>
      </header>
      <label className="fkm-switch">
        <input type="checkbox" checked={settings.voice} onChange={(e) => update({ voice: e.target.checked })} />
        <span>
          <Volume2 size={18} /> Spoken directions
        </span>
      </label>
      <label className="fkm-switch">
        <input type="checkbox" checked={settings.avoidHighways} onChange={(e) => update({ avoidHighways: e.target.checked })} />
        <span>
          <Route size={18} /> Avoid highways
        </span>
      </label>
      <label className="fkm-field">
        Default travel mode
        <select value={settings.defaultMode} onChange={(e) => update({ defaultMode: e.target.value as TravelMode })}>
          {MODES.map((m) => (
            <option key={m.mode} value={m.mode}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <p className="fkm-muted fkm-small">
        Your saved places are private. Their exact location is only visible to you, and to people you send a share link to (links expire after 30 days).
      </p>
    </section>
  );
}

export function DeliveryPanel({ kind }: { kind: "delivery" | "couriers" }) {
  return (
    <section className="fkm-card fkm-listpanel">
      <header className="fkm-card__head">
        {kind === "delivery" ? <Package size={22} className="fkm-accent" /> : <Bike size={22} className="fkm-accent" />}
        <h2>{kind === "delivery" ? "Delivery" : "Couriers"}</h2>
        <span className="fkm-soon">Coming next</span>
      </header>
      <p className="fkm-muted">
        {kind === "delivery"
          ? "Fockis Delivery (local motorcycle couriers, live tracking and delivery PINs) is the next phase. Today you can already save your Smart Address so sellers and couriers can find you."
          : "Courier sign-up opens with Fockis Delivery, the next phase."}
      </p>
      <Link className="fkm-btn fkm-btn--outline" to="/orders">
        <Clock3 size={18} /> View my orders
      </Link>
    </section>
  );
}

