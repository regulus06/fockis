import { mapsApi, type PlannedRoute } from "./mapsApi";
import { boundsOf, distanceToLine, formatDistance, metersBetween, remainingLength } from "./geo";
import { getMap, IDLE_NAV, useMaps, type Endpoint } from "./mapsStore";

/* ============================================================================
   GPS, ROUTE PLANNING AND TURN-BY-TURN NAVIGATION
============================================================================ */

const st = () => useMaps.getState();

/* ---------------------------------------------------------------- GPS */

let watchId: number | null = null;
let gpsWaiters: Array<(ok: boolean) => void> = [];

export function startGps(): Promise<boolean> {
  if (!("geolocation" in navigator)) {
    st().set({ geoError: "This device can't share its location." });
    return Promise.resolve(false);
  }
  if (watchId !== null) return Promise.resolve(Boolean(st().me));
  return new Promise((resolve) => {
    gpsWaiters.push(resolve);
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const me = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: Number.isFinite(pos.coords.heading ?? NaN) && (pos.coords.speed ?? 0) > 0.8 ? (pos.coords.heading as number) : null,
          speed: pos.coords.speed,
          at: pos.timestamp,
        };
        st().set({ me, geoError: "" });
        gpsWaiters.forEach((w) => w(true));
        gpsWaiters = [];
        onPosition();
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location access is off. Allow it in your browser or phone settings to use GPS."
            : error.code === error.TIMEOUT
              ? "Couldn't get a GPS fix. Move near a window or outside."
              : "Your location isn't available right now.";
        st().set({ geoError: message });
        if (error.code === error.PERMISSION_DENIED) stopGps();
        gpsWaiters.forEach((w) => w(false));
        gpsWaiters = [];
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
  });
}

export function stopGps() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

export async function locateMe() {
  const ok = await startGps();
  const me = st().me;
  if (ok && me) {
    st().set({ following: true });
    getMap()?.flyTo({ center: [me.lon, me.lat], zoom: Math.max(16, getMap()?.getZoom() ?? 16), essential: true });
  } else if (st().geoError) {
    st().toast(st().geoError, "error");
  }
}

/* ---------------------------------------------------------------- voice */

export function speak(text: string) {
  if (!st().settings.voice || !text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = navigator.language || "en-US";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* speech not available */
  }
}

/* ---------------------------------------------------------------- planning */

let planSeq = 0;

export function fitFlight(flight: import("./mapsApi").FlightPlan) {
  const map = getMap();
  if (!map) return;
  const coords = [...flight.arc.coordinates, ...(flight.toAirport?.geometry.coordinates ?? []), ...(flight.fromAirport?.geometry.coordinates ?? [])];
  const mobile = window.innerWidth < 861;
  map.fitBounds(boundsOf(coords), {
    padding: mobile ? { top: 210, bottom: 280, left: 40, right: 40 } : { top: 120, bottom: 150, left: 100, right: 100 },
    maxZoom: 12,
    duration: 1000,
  });
}

/** Switch directions to the flight option (or back to a road mode). */
export function setFlightMode(on: boolean) {
  if (st().flightMode === on) return;
  st().set({ flightMode: on, flight: null, plan: null, routeError: "" });
  if (st().destination) void planRoute({ fit: true });
}

export async function planRoute(opts: { fit?: boolean; fromMe?: boolean; departure?: string; arrival?: string } = {}) {
  const s = st();
  const destination = s.destination;
  if (!destination) return;
  let origin: Endpoint | null = s.origin;
  if (!origin || opts.fromMe) {
    const ok = await startGps();
    const me = st().me;
    if (!ok || !me) {
      st().set({ routeError: st().geoError || "Choose a starting point." });
      return;
    }
    origin = { lat: me.lat, lon: me.lon, label: "My Location" };
  }
  const seq = ++planSeq;
  st().set({ routing: true, routeError: "" });
  if (st().flightMode) {
    try {
      const flight = await mapsApi.flight({
        origin,
        destination,
        departure: opts.departure ?? undefined,
        arrival: opts.arrival ?? undefined,
        language: navigator.language,
      });
      if (seq !== planSeq) return;
      st().set({ flight, plan: null, routing: false });
      if (opts.fit !== false) fitFlight(flight);
    } catch (error) {
      if (seq !== planSeq) return;
      st().set({ routing: false, flight: null, routeError: error instanceof Error ? error.message : "No flight option found." });
    }
    return;
  }
  try {
    const plan = await mapsApi.route({
      origin,
      destination,
      mode: st().mode,
      alternatives: !st().nav.active,
      avoidHighways: st().settings.avoidHighways,
      language: navigator.language,
    });
    if (seq !== planSeq) return;
    st().set({ plan, routeIndex: 0, routing: false });
    if (opts.fit !== false && !st().nav.active) fitRoute(plan.routes[0]);
  } catch (error) {
    if (seq !== planSeq) return;
    st().set({ routing: false, plan: null, routeError: error instanceof Error ? error.message : "No route found." });
  }
}

export function fitRoute(route?: PlannedRoute) {
  const map = getMap();
  if (!map || !route) return;
  const mobile = window.innerWidth < 861;
  map.fitBounds(boundsOf(route.geometry.coordinates), {
    padding: mobile ? { top: 210, bottom: 260, left: 30, right: 30 } : { top: 110, bottom: 140, left: 80, right: 80 },
    maxZoom: 17,
    duration: 900,
  });
}

export function directionsTo(target: Endpoint) {
  st().set({ destination: target, view: "navigation", plan: null, flight: null, routeError: "", mobileSheet: "half" });
  void planRoute({ fit: true });
}

/* ---------------------------------------------------------------- navigation */

let offRouteCount = 0;
let lastReroute = 0;
let announced = new Set<string>();

export async function startNavigation() {
  const ok = await startGps();
  if (!ok) {
    st().toast(st().geoError || "Turn on location to start navigation.", "error");
    return;
  }
  const route = st().plan?.routes[st().routeIndex];
  if (!route) return;
  // Navigation follows the chosen route; drop the alternatives.
  st().set({
    plan: { ...st().plan!, routes: [route] },
    routeIndex: 0,
    nav: { ...IDLE_NAV, active: true, startedAt: Date.now(), remainingM: route.distanceM, remainingS: route.durationS },
    following: true,
    mobileSheet: "peek",
  });
  announced = new Set();
  offRouteCount = 0;
  try {
    await (navigator as Navigator & { wakeLock?: { request(t: string): Promise<unknown> } }).wakeLock?.request("screen");
  } catch {
    /* wake lock not available */
  }
  const first = route.steps[0];
  speak(first?.verbalInstruction || first?.instruction || "Starting navigation");
  onPosition();
}

export function stopNavigation(keepRoute = false) {
  st().set({ nav: IDLE_NAV, following: false, ...(keepRoute ? {} : { plan: null, flight: null, destination: null }) });
  getMap()?.easeTo({ pitch: st().threeD ? 60 : 0, bearing: 0, duration: 600 });
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

function onPosition() {
  const s = st();
  const me = s.me;
  if (!me) return;
  const map = getMap();

  if (!s.nav.active) {
    if (s.following && map) map.easeTo({ center: [me.lon, me.lat], duration: 600 });
    return;
  }

  const route = s.plan?.routes[s.routeIndex];
  const destination = s.destination;
  if (!route || !destination) return;
  const here: [number, number] = [me.lon, me.lat];
  const line = route.geometry.coordinates;
  const { distance, index } = distanceToLine(here, line);

  // Arrival.
  const toDestination = metersBetween(here, [destination.lon, destination.lat]);
  const endOfRoad = metersBetween(here, line[line.length - 1]);
  if (toDestination < 30 || (endOfRoad < 25 && index >= line.length - 2)) {
    if (!s.nav.arrived) {
      speak(`You have arrived at ${destination.label}.`);
      st().set({ nav: { ...s.nav, arrived: true, remainingM: 0, remainingS: 0, distanceToStepM: 0 } });
    }
    return;
  }

  // Off route → reroute (needs two consecutive bad fixes, and a usable accuracy).
  const tolerance = s.mode === "walking" ? 35 : 50;
  if (distance > tolerance + Math.min(me.accuracy, 40)) {
    offRouteCount += 1;
    if (offRouteCount >= 2 && Date.now() - lastReroute > 10_000 && me.accuracy < 80) {
      lastReroute = Date.now();
      offRouteCount = 0;
      st().set({ nav: { ...st().nav, offRoute: true, rerouting: true } });
      speak("Recalculating.");
      st().set({ origin: null });
      void planRoute({ fit: false, fromMe: true }).then(() => {
        const n = st().nav;
        st().set({ nav: { ...n, offRoute: false, rerouting: false, stepIndex: 0 } });
        announced = new Set();
      });
    }
    return;
  }
  offRouteCount = 0;

  // Current step = the next maneuver after our position on the line.
  let stepIndex = route.steps.findIndex((step) => step.beginIndex > index);
  if (stepIndex < 0) stepIndex = route.steps.length - 1;
  const next = route.steps[stepIndex];
  const distanceToStep = next ? metersBetween(here, next.location) : 0;
  const remainingM = remainingLength(line, index, here);
  const remainingS = route.distanceM ? (route.durationS * remainingM) / route.distanceM : 0;

  // Voice prompts: once early, once close.
  if (next) {
    const far = s.mode === "walking" ? 60 : s.mode === "bicycle" ? 120 : 400;
    const near = s.mode === "walking" ? 15 : 60;
    const keyFar = `${stepIndex}-far`;
    const keyNear = `${stepIndex}-near`;
    if (distanceToStep < near && !announced.has(keyNear)) {
      announced.add(keyNear);
      announced.add(keyFar);
      speak(next.verbalInstruction || next.instruction);
    } else if (distanceToStep < far && distanceToStep > near * 2 && !announced.has(keyFar)) {
      announced.add(keyFar);
      speak(`In ${formatDistance(distanceToStep)}, ${(next.verbalAlert || next.instruction).replace(/\.$/, "")}.`);
    }
  }

  st().set({ nav: { ...s.nav, stepIndex, distanceToStepM: distanceToStep, remainingM, remainingS, offRoute: false } });

  if (s.following && map) {
    map.easeTo({
      center: here,
      zoom: s.mode === "walking" ? 18 : 17,
      pitch: 55,
      bearing: me.heading ?? map.getBearing(),
      duration: 900,
      padding: { top: 0, bottom: window.innerWidth < 861 ? 220 : 120, left: 0, right: 0 },
    });
  }
}

/* ---------------------------------------------------------------- sharing */

export function directionsLink(dest: Endpoint, mode: string) {
  const url = new URL(`${window.location.origin}/map`);
  url.searchParams.set("to", `${dest.lat.toFixed(6)},${dest.lon.toFixed(6)}`);
  url.searchParams.set("label", dest.label.slice(0, 80));
  url.searchParams.set("mode", mode);
  return url.toString();
}

export async function shareLink(title: string, url: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    return; // user canceled the share sheet
  }
  try {
    await navigator.clipboard.writeText(url);
    st().toast("Link copied", "success");
  } catch {
    st().toast(url, "info");
  }
}
