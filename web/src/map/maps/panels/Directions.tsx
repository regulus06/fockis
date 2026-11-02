import { useEffect, useState } from "react";
import {

  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  Bike,
  Bookmark,
  Car,
  CheckCircle2,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Footprints,
  List,
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCw,
  RotateCcw,
  Share2,
  Ship,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { formatDistance, formatDuration } from "../geo";
import { mapsApi, type RouteStep, type TravelMode } from "../mapsApi";
import { getMap, useMaps } from "../mapsStore";
import { directionsLink, fitRoute, planRoute, shareLink, startNavigation, stopNavigation } from "../navigation";
import SearchBox from "../SearchBox";
import { metersBetween } from "../geo";
import { FlightTab, FlightView, TryFlight } from "./FlightPanel";

/* ============================================================================
   DIRECTIONS + TURN-BY-TURN
============================================================================ */

const st = () => useMaps.getState();
let plannedMode: TravelMode | null = null;

export function MotoIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="17" r="3" />
      <circle cx="19" cy="17" r="3" />
      <path d="M8 17h6l3-6h-4l-2-3H8" />
      <path d="M15 6h3l1.5 5" />
    </svg>
  );
}

export const MODES: Array<{ mode: TravelMode; label: string; icon: React.ReactNode }> = [
  { mode: "driving", label: "Driving", icon: <Car size={20} /> },
  { mode: "motorcycle", label: "Moto", icon: <MotoIcon /> },
  { mode: "walking", label: "Walking", icon: <Footprints size={20} /> },
  { mode: "bicycle", label: "Bicycle", icon: <Bike size={20} /> },
];

export function ManeuverIcon({ step, size = 30 }: { step?: RouteStep; size?: number }) {
  if (!step) return <ArrowUp size={size} />;
  const m = step.modifier;
  if (step.type === "arrive") return <Flag size={size} />;
  if (step.type === "uturn") return <RotateCcw size={size} />;
  if (step.type === "ferry") return <Ship size={size} />;
  if (step.type === "roundabout") return <RefreshCw size={size} />;
  if (m === "sharp right" || m === "right") return step.type === "turn" ? <CornerUpRight size={size} /> : <ArrowRight size={size} />;
  if (m === "sharp left" || m === "left") return step.type === "turn" ? <CornerUpLeft size={size} /> : <ArrowLeft size={size} />;
  if (m === "slight right") return <ArrowUpRight size={size} />;
  if (m === "slight left") return <ArrowUpLeft size={size} />;
  return <ArrowUp size={size} />;
}

export function DirectionsPanel({ part = "all" }: { part?: "all" | "top" | "bottom" }) {
  const origin = useMaps((s) => s.origin);
  const destination = useMaps((s) => s.destination);
  const mode = useMaps((s) => s.mode);
  const plan = useMaps((s) => s.plan);
  const routeIndex = useMaps((s) => s.routeIndex);
  const routing = useMaps((s) => s.routing);
  const routeError = useMaps((s) => s.routeError);
  const flightMode = useMaps((s) => s.flightMode);
  const flight = useMaps((s) => s.flight);
  const me = useMaps((s) => s.me);
  const from = origin ?? (me ? { lat: me.lat, lon: me.lon } : null);
  const longTrip = Boolean(from && destination && metersBetween([from.lon, from.lat], [destination.lon, destination.lat]) > 300_000);
  const [showSteps, setShowSteps] = useState(false);
  const [saving, setSaving] = useState(false);
  const route = plan?.routes[routeIndex];

  useEffect(() => {
    // Re-plan when the travel mode changes (once, even if the panel is mounted twice).
    if (part === "bottom" || plannedMode === mode) return;
    const first = plannedMode === null;
    plannedMode = mode;
    if (first) return;
    if (destination) void planRoute({ fit: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const swap = () => {
    if (!destination) return;
    const me = st().me;
    const from = origin ?? (me ? { lat: me.lat, lon: me.lon, label: "My Location" } : null);
    if (!from) return st().toast("Turn on your location, or choose a start point.", "info");
    st().set({ origin: destination, destination: from });
    void planRoute({ fit: true });
  };

  const save = async () => {
    if (!route || !destination) return;
    const me = st().me;
    const from = origin ?? (me ? { lat: me.lat, lon: me.lon, label: "My Location" } : null);
    if (!from) return;
    const name = window.prompt("Name this route", `To ${destination.label}`)?.trim();
    if (!name) return;
    setSaving(true);
    try {
      await mapsApi.saveRoute({ name: name.slice(0, 80), origin: from, destination, mode, distanceM: route.distanceM, durationS: route.durationS, summary: route.summary });
      st().set({ savedRoutes: await mapsApi.savedRoutes() });
      st().toast("Route saved", "success");
    } catch (e) {
      st().toast(e instanceof Error ? e.message : "Couldn't save the route.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`fkm-card fkm-directions is-${part}`} aria-label="Directions">
      {part !== "bottom" && (
      <>
      <div className="fkm-route-inputs">
        <div className="fkm-route-inputs__dots" aria-hidden="true">
          <i className="is-from" />
          <span />
          <i className="is-to" />
        </div>
        <div className="fkm-route-inputs__fields">
          <SearchBox
            className="fkm-search--route"
            value={origin?.label ?? "My Location"}
            placeholder="Choose starting point"
            ariaLabel="Starting point"
            leading={<MapPin size={20} className="fkm-from" />}
            onMyLocation={() => {
              st().set({ origin: null });
              void planRoute({ fit: true, fromMe: true });
            }}
            onPick={(r) => {
              st().set({ origin: { lat: r.lat, lon: r.lon, label: r.name } });
              void planRoute({ fit: true });
            }}
          />
          <SearchBox
            className="fkm-search--route"
            value={destination?.label ?? ""}
            placeholder="Where to?"
            ariaLabel="Destination"
            leading={<MapPin size={20} className="fkm-to" />}
            onPick={(r) => {
              st().set({ destination: { lat: r.lat, lon: r.lon, label: r.name } });
              void planRoute({ fit: true });
            }}
          />
        </div>
        <button type="button" className="fkm-icon" onClick={swap} aria-label="Swap start and destination" disabled={!destination}>
          <ArrowDownUp size={22} />
        </button>
      </div>

      <div className="fkm-modes" role="tablist" aria-label="Travel mode">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            role="tab"
            aria-selected={!flightMode && mode === m.mode}
            className={!flightMode && mode === m.mode ? "is-on" : ""}
            onClick={() => {
              if (flightMode) {
                st().set({ mode: m.mode, flightMode: false, flight: null });
                plannedMode = m.mode;
                if (st().destination) void planRoute({ fit: true });
              } else st().set({ mode: m.mode });
            }}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
        <FlightTab active={flightMode} />
      </div>
      </>
      )}

      {part !== "top" && (
      <>
      {routing && (
        <div className="fkm-route-loading">
          <Loader2 size={20} className="fkm-spin" /> {flightMode ? "Finding airports…" : "Finding the best route…"}
        </div>
      )}

      {!routing && routeError && (
        <div className="fkm-error" role="alert">
          {routeError}
          <button type="button" className="fkm-link" onClick={() => void planRoute({ fit: true })}>
            Try again
          </button>
        </div>
      )}
      {!routing && routeError && !flightMode && longTrip && <TryFlight />}
      {!routing && flightMode && flight && <FlightView flight={flight} />}

      {!destination && !routing && <p className="fkm-muted fkm-pad">Search for a destination, or tap a place on the map and choose “Get Directions”.</p>}

      {!flightMode && plan && route && !routing && (
        <>
          {plan.routes.length > 1 && (
            <div className="fkm-alts">
              {plan.routes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === routeIndex ? "is-on" : ""}
                  onClick={() => {
                    st().set({ routeIndex: i });
                    fitRoute(r);
                  }}
                >
                  <strong>{formatDuration(r.durationS)}</strong>
                  <span>{formatDistance(r.distanceM)}</span>
                  {r.summary && <small>via {r.summary}</small>}
                </button>
              ))}
            </div>
          )}

          <div className="fkm-summary">
            <div>
              <p className="fkm-summary__time">
                {formatDuration(route.durationS)} <span>({formatDistance(route.distanceM)})</span>
              </p>
              <p className="fkm-summary__via">{route.summary ? `Via ${route.summary}` : `${MODES.find((m) => m.mode === mode)?.label} route`}</p>
            </div>
            <button type="button" className="fkm-go" onClick={() => void startNavigation()} aria-label="Start navigation">
              <Navigation2Icon />
            </button>
          </div>

          {plan.warnings.length > 0 && (
            <ul className="fkm-warnings">
              {plan.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div className="fkm-route-actions">
            <button type="button" className={`fkm-chipbtn ${showSteps ? "is-on" : ""}`} onClick={() => setShowSteps((v) => !v)}>
              <List size={18} /> Steps
            </button>
            <button type="button" className="fkm-chipbtn" onClick={() => destination && void shareLink(`Directions to ${destination.label}`, directionsLink(destination, mode))}>
              <Share2 size={18} /> Share
            </button>
            <button type="button" className="fkm-chipbtn" onClick={() => void save()} disabled={saving}>
              <Bookmark size={18} /> Save
            </button>
          </div>

          {showSteps && (
            <ol className="fkm-steps">
              {route.steps.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => getMap()?.flyTo({ center: s.location, zoom: 17.5 })}
                  >
                    <span className="fkm-steps__icon">
                      <ManeuverIcon step={s} size={20} />
                    </span>
                    <span>
                      <strong>{s.instruction}</strong>
                      {s.distanceM > 0 && <small>{formatDistance(s.distanceM)}</small>}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}

          <button type="button" className="fkm-btn fkm-btn--primary fkm-btn--block fkm-start" onClick={() => void startNavigation()}>
            <Navigation2Icon /> Start Navigation
          </button>
          <p className="fkm-attrib">Routes by Valhalla · © OpenStreetMap contributors{plan && useMaps.getState().config?.routing.testServer ? " · public test server" : ""}</p>
        </>
      )}
      </>
      )}
    </section>
  );
}

function Navigation2Icon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" />
    </svg>
  );
}

export function NavigationHUD() {
  const nav = useMaps((s) => s.nav);
  const plan = useMaps((s) => s.plan);
  const destination = useMaps((s) => s.destination);
  const voice = useMaps((s) => s.settings.voice);
  const following = useMaps((s) => s.following);
  const me = useMaps((s) => s.me);
  const route = plan?.routes[0];
  const step = route?.steps[nav.stepIndex];
  const following2 = route?.steps[nav.stepIndex + 1];
  const eta = new Date(Date.now() + nav.remainingS * 1000);

  if (!nav.active || !route) return null;

  if (nav.arrived) {
    return (
      <div className="fkm-arrived" role="dialog" aria-label="Arrived">
        <CheckCircle2 size={44} />
        <div>
          <small>You have arrived at</small>
          <strong>{destination?.label}</strong>
        </div>
        <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => stopNavigation()}>
          Done
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`fkm-turn ${nav.rerouting ? "is-rerouting" : ""}`} role="status" aria-live="polite">
        <span className="fkm-turn__icon">{nav.rerouting ? <Loader2 size={34} className="fkm-spin" /> : <ManeuverIcon step={step} size={38} />}</span>
        <div>
          <strong>{nav.rerouting ? "Recalculating…" : formatDistance(nav.distanceToStepM)}</strong>
          <span>{nav.rerouting ? "Finding a new route from here" : step?.instruction}</span>
        </div>
        {following2 && !nav.rerouting && (
          <small className="fkm-turn__then">
            Then <ManeuverIcon step={following2} size={16} />
          </small>
        )}
      </div>

      <div className="fkm-navbar">
        <div>
          <strong>{formatDuration(nav.remainingS)}</strong>
          <span>
            {formatDistance(nav.remainingM)} · arrive {eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        {me && me.accuracy > 50 && <small className="fkm-navbar__gps">Weak GPS ±{Math.round(me.accuracy)} m</small>}
        <button type="button" className="fkm-icon" onClick={() => useMaps.getState().updateSettings({ voice: !voice })} aria-label={voice ? "Mute voice" : "Unmute voice"}>
          {voice ? <Volume2 size={22} /> : <VolumeX size={22} />}
        </button>
        {!following && (
          <button type="button" className="fkm-icon" onClick={() => useMaps.getState().set({ following: true })} aria-label="Re-center">
            <LocateFixed size={22} />
          </button>
        )}
        <button type="button" className="fkm-btn fkm-btn--danger" onClick={() => stopNavigation(true)}>
          <X size={18} /> End
        </button>
      </div>
    </>
  );
}


