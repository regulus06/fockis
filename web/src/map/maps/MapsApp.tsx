import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Bell,
  Bike,
  Bookmark,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronLeft,
  Compass,
  Crosshair,
  Fuel,
  Home,
  Hospital,
  Hotel,
  Layers,
  Loader2,
  MapPin,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Minus,
  MoreHorizontal,
  Navigation,
  Package,
  Plus,
  Satellite,
  Settings,
  ShoppingBag,
  Star,
  Box,
  CarFront,
  Utensils,
  X,
} from "lucide-react";

import MapCanvas, { selectPoint } from "./MapCanvas";
import { mapsApi, type PlaceResult } from "./mapsApi";
import { COUNTRIES } from "./geo";
import { getMap, useMaps, type MapsView } from "./mapsStore";
import { directionsTo, locateMe } from "./navigation";
import SearchBox from "./SearchBox";
import { DirectionsPanel, NavigationHUD } from "./panels/Directions";
import { BusinessesPanel, DeliveryPanel, LocationsPanel, openSaved, PoiPanel, SavedPanel, SettingsPanel, startNewPlace } from "./panels/ListPanels";
import { PlacePanel, refreshPlaces, SmartAddressEditor, StreetViewCard } from "./panels/PlacePanels";
import { useHideBottomNav } from "../../components/fockis/FockisBottomNav";
import "./maps.scss";

/* ============================================================================
   FOCKIS MAPS & DELIVERY
============================================================================ */

const st = () => useMaps.getState();

const NAV: Array<{ view: MapsView; label: string; icon: React.ReactNode; soon?: boolean }> = [
  { view: "map", label: "Map", icon: <MapPin size={21} /> },
  { view: "navigation", label: "Navigation", icon: <Navigation size={21} /> },
  { view: "delivery", label: "Delivery", icon: <Package size={21} />, soon: true },
  { view: "locations", label: "My Locations", icon: <Bookmark size={21} /> },
  { view: "saved", label: "Saved Places", icon: <Star size={21} /> },
  { view: "businesses", label: "Businesses", icon: <Building2 size={21} /> },
  { view: "couriers", label: "Couriers", icon: <Bike size={21} />, soon: true },
  { view: "orders", label: "Orders", icon: <ShoppingBag size={21} /> },
  { view: "settings", label: "Settings", icon: <Settings size={21} /> },
];

/** OpenStreetMap POI classes (OpenMapTiles schema) per quick category. */
const CATEGORIES: Record<string, { label: string; classes: string[] }> = {
  gas: { label: "Gas stations", classes: ["fuel"] },
  food: { label: "Food", classes: ["restaurant", "fast_food", "cafe", "bakery", "ice_cream", "food_court"] },
  hotels: { label: "Hotels", classes: ["lodging", "hotel", "guest_house", "motel", "hostel"] },
  hospitals: { label: "Hospitals & clinics", classes: ["hospital", "clinic", "doctors"] },
  pharmacy: { label: "Pharmacies", classes: ["pharmacy", "chemist"] },
  bank: { label: "Banks", classes: ["bank", "atm"] },
  school: { label: "Schools", classes: ["school", "college", "university", "kindergarten"] },
  worship: { label: "Churches", classes: ["place_of_worship"] },
  grocery: { label: "Markets & groceries", classes: ["grocery", "supermarket", "marketplace", "convenience"] },
  bus: { label: "Transport", classes: ["bus", "bus_stop", "bus_station", "railway", "taxi"] },
};

function findNearby(category: string) {
  const map = getMap();
  const cfg = CATEGORIES[category];
  if (!map || !cfg) return;
  if (map.getZoom() < 13) {
    st().toast("Zoom in to see places nearby.", "info");
    map.easeTo({ zoom: 14.5 });
    return;
  }
  const style = map.getStyle();
  const sourceIds = new Set<string>();
  for (const layer of style.layers ?? []) {
    if ((layer as { "source-layer"?: string })["source-layer"] === "poi" && "source" in layer) sourceIds.add(String(layer.source));
  }
  const center = map.getCenter();
  const seen = new Set<string>();
  const items: PlaceResult[] = [];
  for (const source of sourceIds) {
    for (const f of map.querySourceFeatures(source, { sourceLayer: "poi" })) {
      const cls = String(f.properties?.class ?? "");
      const sub = String(f.properties?.subclass ?? "");
      if (!cfg.classes.includes(cls) && !cfg.classes.includes(sub)) continue;
      if (f.geometry.type !== "Point") continue;
      const [lon, lat] = f.geometry.coordinates as [number, number];
      const name = String(f.properties?.name ?? f.properties?.["name:latin"] ?? "").trim();
      if (!name) continue;
      const key = `${name}|${lon.toFixed(4)}|${lat.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ id: key, kind: "place", name, address: sub || cls, lat, lon, category, source: "osm" });
    }
  }
  items.sort((a, b) => Math.hypot(a.lat - center.lat, a.lon - center.lng) - Math.hypot(b.lat - center.lat, b.lon - center.lng));
  st().set({ poi: { category, label: cfg.label, items: items.slice(0, 40) }, selected: null, view: "map", mobileSheet: "half" });
}

function pickResult(r: PlaceResult) {
  const saved = r.kind === "saved" ? st().places.find((p) => p.id === r.id) : undefined;
  selectPoint({
    lat: r.lat,
    lon: r.lon,
    name: r.name,
    address: r.address,
    source: r.kind === "saved" ? "saved" : r.kind === "business" ? "business" : "search",
    category: r.category,
    saved,
    footprint: saved?.building?.footprint ?? null,
    logoUrl: r.logoUrl,
    businessId: r.kind === "business" ? r.id : undefined,
  });
  st().set({ view: "map", poi: null });
  getMap()?.flyTo({ center: [r.lon, r.lat], zoom: 17 });
}

function readUser() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null") ?? {};
    return { name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "You", avatar: u.profilePicture || u.avatar || "" };
  } catch {
    return { name: "You", avatar: "" };
  }
}

/* ---------------------------------------------------------------- pieces */

function TopBar() {
  const country = useMaps((s) => s.country);
  const [open, setOpen] = useState(false);
  const user = readUser();
  const current = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];
  return (
    <header className="fkm-top">
      <button type="button" className="fkm-top__menu fkm-icon" onClick={() => st().set({ drawerOpen: true })} aria-label="Open menu">
        <Menu size={24} />
      </button>
      <Link to="/" className="fkm-brand" aria-label="Fockis home">
        <img src="/brand/fockis-icon-192.png" alt="" />
        <span className="fkm-brand__word">Fockis</span>
        <span className="fkm-brand__sub">Maps &amp; Delivery</span>
      </Link>
      <SearchBox className="fkm-search--top" onPick={pickResult} />
      <div className="fkm-menu-anchor">
        <button type="button" className="fkm-country" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span className="fkm-flag">{current.flag}</span> {current.name} <ChevronDown size={18} />
        </button>
        {open && (
          <div className="fkm-menu" role="menu" onMouseLeave={() => setOpen(false)}>
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  localStorage.setItem("fockis-maps-country", c.code);
                  st().set({ country: c.code });
                  getMap()?.flyTo({ center: [c.center.lon, c.center.lat], zoom: c.center.zoom });
                }}
              >
                <span className="fkm-flag">{c.flag}</span> {c.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <Link to="/notifications" className="fkm-icon fkm-top__icon" aria-label="Notifications">
        <Bell size={23} />
      </Link>
      <Link to="/messages" className="fkm-icon fkm-top__icon" aria-label="Messages">
        <MessageSquare size={23} />
      </Link>
      <Link to="/profile" className="fkm-user">
        {user.avatar ? <img src={user.avatar} alt="" /> : <span className="fkm-user__initials">{user.name.slice(0, 1)}</span>}
        <span>{user.name}</span>
      </Link>
    </header>
  );
}

function SideNav() {
  const view = useMaps((s) => s.view);
  const drawer = useMaps((s) => s.drawerOpen);
  const navigate = useNavigate();
  return (
    <>
      {drawer && <div className="fkm-scrim" onClick={() => st().set({ drawerOpen: false })} />}
      <nav className={`fkm-nav ${drawer ? "is-open" : ""}`} aria-label="Maps navigation">
        <div className="fkm-nav__mobilehead">
          <span>Fockis Maps</span>
          <button type="button" className="fkm-icon" onClick={() => st().set({ drawerOpen: false })} aria-label="Close menu">
            <X size={22} />
          </button>
        </div>
        <ul>
          {NAV.map((n) => (
            <li key={n.view}>
              <button
                type="button"
                className={`fkm-nav__item ${view === n.view ? "is-active" : ""}`}
                aria-current={view === n.view ? "page" : undefined}
                onClick={() => {
                  st().set({ drawerOpen: false });
                  if (n.view === "orders") return navigate("/orders");
                  st().set({ view: n.view, editor: null, ...(n.view === "map" ? { poi: null } : {}) });
                }}
              >
                {n.icon}
                <span>{n.label}</span>
                {n.soon && <em>Soon</em>}
              </button>
            </li>
          ))}
        </ul>
        <div className="fkm-partner">
          <div className="fkm-partner__art" aria-hidden="true">
            <Bike size={64} />
          </div>
          <strong>Become a Fockis Delivery Partner</strong>
          <button type="button" className="fkm-btn fkm-btn--primary fkm-btn--block" disabled title="Courier sign-up opens with Fockis Delivery">
            Coming soon
          </button>
        </div>
      </nav>
    </>
  );
}

function StyleChips() {
  const base = useMaps((s) => s.base);
  const threeD = useMaps((s) => s.threeD);
  const traffic = useMaps((s) => s.traffic);
  const config = useMaps((s) => s.config);
  return (
    <div className="fkm-chips" role="toolbar" aria-label="Map type">
      <div className="fkm-chips__group">
        <button type="button" className={base === "map" ? "is-on" : ""} onClick={() => st().set({ base: "map" })} aria-pressed={base === "map"}>
          <MapIcon size={20} /> Map
        </button>
        <button
          type="button"
          className={base === "satellite" ? "is-on" : ""}
          aria-pressed={base === "satellite"}
          disabled={!config?.satellite}
          title={config?.satellite ? "" : "Satellite needs a MapTiler key on the server"}
          onClick={() => st().set({ base: "satellite" })}
        >
          <Satellite size={20} /> Satellite
        </button>
        <button type="button" className={threeD ? "is-on" : ""} aria-pressed={threeD} onClick={() => st().set({ threeD: !threeD })}>
          <Box size={20} /> 3D
        </button>
      </div>
      <button
        type="button"
        className={`fkm-chips__single ${traffic ? "is-on" : ""}`}
        aria-pressed={traffic}
        onClick={() => {
          if (!config?.traffic) return st().toast("Live traffic isn't available yet in this area.", "info");
          st().set({ traffic: !traffic });
        }}
      >
        <CarFront size={20} /> Traffic
      </button>
    </div>
  );
}

function MapControls() {
  const [bearing, setBearing] = useState(0);
  const [layers, setLayers] = useState(false);
  const base = useMaps((s) => s.base);
  const config = useMaps((s) => s.config);
  const following = useMaps((s) => s.following);
  const geoError = useMaps((s) => s.geoError);
  useEffect(() => {
    const map = getMap();
    if (!map) return;
    const on = () => setBearing(map.getBearing());
    map.on("rotate", on);
    return () => {
      map.off("rotate", on);
    };
  });
  return (
    <div className="fkm-controls">
      <div className="fkm-menu-anchor">
        <button type="button" className="fkm-ctl" onClick={() => setLayers((v) => !v)} aria-label="Layers" aria-expanded={layers}>
          <Layers size={22} />
        </button>
        {layers && (
          <div className="fkm-menu fkm-menu--left" role="menu">
            <button type="button" role="menuitem" className={base === "map" ? "is-on" : ""} onClick={() => (setLayers(false), st().set({ base: "map" }))}>
              <MapIcon size={16} /> Standard map
            </button>
            <button type="button" role="menuitem" disabled={!config?.satellite} className={base === "satellite" ? "is-on" : ""} onClick={() => (setLayers(false), st().set({ base: "satellite" }))}>
              <Satellite size={16} /> Satellite with labels
            </button>
            <button type="button" role="menuitem" onClick={() => (setLayers(false), st().set({ threeD: !st().threeD }))}>
              <Box size={16} /> 3D buildings & terrain
            </button>
            <p className="fkm-menu__note">{config?.attribution}</p>
          </div>
        )}
      </div>
      <button
        type="button"
        className="fkm-ctl"
        onClick={() => getMap()?.easeTo({ bearing: 0, pitch: st().threeD ? 60 : 0 })}
        aria-label="Point north"
        title="Point north"
      >
        <Compass size={22} style={{ transform: `rotate(${-bearing - 45}deg)` }} />
      </button>
      <div className="fkm-ctl-group">
        <button type="button" onClick={() => getMap()?.zoomIn()} aria-label="Zoom in">
          <Plus size={22} />
        </button>
        <button type="button" onClick={() => getMap()?.zoomOut()} aria-label="Zoom out">
          <Minus size={22} />
        </button>
      </div>
      <button type="button" className={`fkm-ctl ${following ? "is-on" : ""} ${geoError ? "is-error" : ""}`} onClick={() => void locateMe()} aria-label="Show my location" title={geoError || "My location"}>
        <Crosshair size={22} />
      </button>
    </div>
  );
}

function CategoryBar() {
  const places = useMaps((s) => s.places);
  const [more, setMore] = useState(false);
  const goTo = (kind: "home" | "work") => {
    const p = places.find((x) => x.kind === kind);
    if (!p) return startNewPlace(kind);
    selectPoint({ lat: p.latitude, lon: p.longitude, name: p.label, source: "saved", saved: p, footprint: p.building?.footprint ?? null });
    getMap()?.flyTo({ center: [p.longitude, p.latitude], zoom: 18 });
  };
  const items: Array<{ key: string; label: string; icon: React.ReactNode; run: () => void }> = [
    { key: "home", label: "Home", icon: <Home size={24} />, run: () => goTo("home") },
    { key: "work", label: "Work", icon: <Briefcase size={24} />, run: () => goTo("work") },
    { key: "delivery", label: "Delivery", icon: <Package size={24} />, run: () => st().set({ view: "delivery" }) },
    { key: "saved", label: "Saved", icon: <Star size={24} />, run: () => st().set({ view: "saved" }) },
    { key: "gas", label: "Gas", icon: <Fuel size={24} />, run: () => findNearby("gas") },
    { key: "food", label: "Food", icon: <Utensils size={24} />, run: () => findNearby("food") },
    { key: "hotels", label: "Hotels", icon: <Hotel size={24} />, run: () => findNearby("hotels") },
    { key: "hospitals", label: "Hospitals", icon: <Hospital size={24} />, run: () => findNearby("hospitals") },
  ];
  return (
    <div className="fkm-cats" role="toolbar" aria-label="Quick places">
      {items.map((i) => (
        <button key={i.key} type="button" onClick={i.run}>
          {i.icon}
          <span>{i.label}</span>
        </button>
      ))}
      <div className="fkm-menu-anchor">
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more}>
          <MoreHorizontal size={24} />
          <span>More</span>
        </button>
        {more && (
          <div className="fkm-menu fkm-menu--up" role="menu" onMouseLeave={() => setMore(false)}>
            {["pharmacy", "bank", "school", "worship", "grocery", "bus"].map((k) => (
              <button key={k} type="button" role="menuitem" onClick={() => (setMore(false), findNearby(k))}>
                {CATEGORIES[k].label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SidePanel() {
  const view = useMaps((s) => s.view);
  const selected = useMaps((s) => s.selected);
  const editor = useMaps((s) => s.editor);
  const poi = useMaps((s) => s.poi);
  if (editor) return <SmartAddressEditor />;
  if (view === "navigation") return <DirectionsPanel />;
  if (view === "locations") return <LocationsPanel />;
  if (view === "saved") return <SavedPanel />;
  if (view === "businesses") return selected ? <PlacePanel selection={selected} /> : <BusinessesPanel />;
  if (view === "settings") return <SettingsPanel />;
  if (view === "delivery" || view === "couriers") return <DeliveryPanel kind={view} />;
  if (selected) return <PlacePanel selection={selected} />;
  if (poi) return <PoiPanel />;
  return (
    <section className="fkm-card fkm-welcome">
      <h2>Explore Haiti, house by house</h2>
      <p className="fkm-muted">Tap any building or spot on the map to see it, get directions, or save it as your Fockis Smart Address — no street name needed.</p>
      <button type="button" className="fkm-btn fkm-btn--primary fkm-btn--block" onClick={() => startNewPlace()}>
        <Plus size={18} /> Pin my home
      </button>
      <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--block" onClick={() => st().set({ view: "navigation" })}>
        <Navigation size={18} /> Get directions
      </button>
    </section>
  );
}

/* ---------------------------------------------------------------- app */

export default function MapsApp() {
  const config = useMaps((s) => s.config);
  const configError = useMaps((s) => s.configError);
  const view = useMaps((s) => s.view);
  const navActive = useMaps((s) => s.nav.active);
  const sheet = useMaps((s) => s.mobileSheet);
  const editor = useMaps((s) => s.editor);
  const selected = useMaps((s) => s.selected);
  const poi = useMaps((s) => s.poi);
  const toasts = useMaps((s) => s.toasts);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { token } = useParams();
  // Turn-by-turn and the Smart Address form use the whole phone screen.
  useHideBottomNav(navActive || Boolean(editor));
  const handledLink = useRef(false);

  useEffect(() => {
    mapsApi
      .config()
      .then((config) => st().set({ config, configError: "" }))
      .catch((e) => st().set({ configError: e instanceof Error ? e.message : "The map couldn't load." }));
    void refreshPlaces();
  }, []);

  // /map?place=<id> (from a verification notification): open that saved place.
  const placesLoaded = useMaps((s) => s.placesLoaded);
  useEffect(() => {
    const id = params.get("place");
    if (!id || !config || !placesLoaded) return;
    const p = st().places.find((x) => x.id === id);
    if (p) window.setTimeout(() => openSaved(p), 400);
    else st().toast("That place isn't in your saved places any more.", "info");
    const next = new URLSearchParams(params);
    next.delete("place");
    setParams(next, { replace: true });
  }, [params, config, placesLoaded, setParams]);

  // Deep links: /map?to=lat,lon&label=…&mode=…  and  /map/p/:token (shared place)
  useEffect(() => {
    if (!config || handledLink.current) return;
    handledLink.current = true;
    const to = params.get("to");
    if (to) {
      const [lat, lon] = to.split(",").map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        const mode = params.get("mode");
        if (mode === "driving" || mode === "motorcycle" || mode === "walking" || mode === "bicycle") st().set({ mode });
        window.setTimeout(() => directionsTo({ lat, lon, label: params.get("label")?.slice(0, 80) || "Destination" }), 400);
      }
      const next = new URLSearchParams(params);
      ["to", "label", "mode"].forEach((k) => next.delete(k));
      setParams(next, { replace: true });
    }
    if (token) {
      mapsApi
        .shared(token)
        .then((p) => {
          window.setTimeout(() => {
            selectPoint({ lat: p.latitude, lon: p.longitude, name: p.label, source: "shared", footprint: p.building?.footprint ?? null, address: [p.neighborhood, p.commune, p.department].filter(Boolean).join(", ") });
            getMap()?.flyTo({ center: [p.longitude, p.latitude], zoom: 18 });
            st().toast(`${p.label} · ${p.smartAddressId}${p.directions ? ` — ${p.directions}` : ""}`, "info");
          }, 400);
        })
        .catch((e) => st().toast(e instanceof Error ? e.message : "This link isn't valid.", "error"));
    }
  }, [config, params, setParams, token]);

  const mobilePanel = editor || view !== "map" || selected || poi;

  return (
    <div className={`fkm-app view-${view} ${navActive ? "is-navigating" : ""} ${editor ? "is-editing" : ""}`}>
      <TopBar />
      <header className="fkm-mtop">
        <button type="button" className="fkm-icon" onClick={() => (view !== "map" ? st().set({ view: "map" }) : navigate(-1))} aria-label="Back">
          <ChevronLeft size={26} />
        </button>
        <span className="fkm-mtop__brand">
          <img src="/brand/fockis-icon-192.png" alt="" /> <b>Fockis</b> Maps
        </span>
        <button type="button" className="fkm-icon" onClick={() => st().set({ drawerOpen: true })} aria-label="Menu">
          <Menu size={24} />
        </button>
        <Link to="/notifications" className="fkm-icon" aria-label="Notifications">
          <Bell size={23} />
        </Link>
      </header>
      <SideNav />

      <main className="fkm-stage">
        {config ? <MapCanvas /> : !configError && <Loader2 size={32} className="fkm-spin fkm-stage__loading" />}
        {configError && (
          <div className="fkm-stage__error" role="alert">
            <strong>The map couldn't load.</strong>
            <span>{configError}</span>
            <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {!navActive && view !== "navigation" && (
          <>
            <StyleChips />
            <div className="fkm-msearch">
              <SearchBox onPick={pickResult} />
            </div>
          </>
        )}
        {view === "navigation" && !navActive && (
          <div className="fkm-mroute">
            <DirectionsPanel part="top" />
          </div>
        )}
        {!navActive && <MapControls />}
        {!navActive && !editor && <StreetViewCard />}
        {!navActive && !editor && view === "map" && <CategoryBar />}
        {editor && (
          <div className="fkm-edithint" role="status">
            <MapPin size={18} /> Tap the map or drag the pin to your door. Tap a building to select its outline.
          </div>
        )}
        <NavigationHUD />
      </main>

      {!navActive && (
        <aside className={`fkm-side ${mobilePanel ? "has-content" : ""} sheet-${sheet}`}>
          <button
            type="button"
            className="fkm-sheet-handle"
            aria-label="Resize panel"
            onClick={() => st().set({ mobileSheet: sheet === "peek" ? "half" : sheet === "half" ? "full" : "peek" })}
          />
          {view === "navigation" && !editor ? (
            <>
              <div className="fkm-only-desktop">
                <DirectionsPanel />
              </div>
              <div className="fkm-only-mobile">
                <DirectionsPanel part="bottom" />
              </div>
            </>
          ) : (
            <SidePanel />
          )}
        </aside>
      )}

      <div className="fkm-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`fkm-toast is-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
