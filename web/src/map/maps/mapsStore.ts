import { create } from "zustand";
import type { Map as MapLibreMap } from "maplibre-gl";

import type { Footprint, MapsConfig, PlaceResult, ReverseResult, RoutePlan, SavedLocation, SavedRoute, TravelMode } from "./mapsApi";

/* ============================================================================
   FOCKIS MAPS STATE
============================================================================ */

export type MapsView = "map" | "navigation" | "delivery" | "locations" | "saved" | "businesses" | "couriers" | "orders" | "settings";

export interface Selection {
  lat: number;
  lon: number;
  name: string;
  address?: string;
  source: "click" | "search" | "saved" | "business" | "poi" | "gps" | "shared";
  category?: string;
  saved?: SavedLocation;
  footprint?: Footprint | null;
  osmId?: string;
  reverse?: ReverseResult | null;
  logoUrl?: string;
  businessId?: string;
}

export interface Endpoint {
  lat: number;
  lon: number;
  label: string;
}

export interface Me {
  lat: number;
  lon: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  at: number;
}

export interface NavState {
  active: boolean;
  stepIndex: number;
  remainingM: number;
  remainingS: number;
  distanceToStepM: number;
  offRoute: boolean;
  rerouting: boolean;
  arrived: boolean;
  startedAt: number;
}

export interface Toast {
  id: number;
  text: string;
  tone: "info" | "error" | "success";
}

export interface Settings {
  voice: boolean;
  avoidHighways: boolean;
  defaultMode: TravelMode;
}

function loadSettings(): Settings {
  try {
    return { voice: true, avoidHighways: false, defaultMode: "driving", ...JSON.parse(localStorage.getItem("fockis-maps-settings") || "{}") };
  } catch {
    return { voice: true, avoidHighways: false, defaultMode: "driving" };
  }
}

interface State {
  config: MapsConfig | null;
  configError: string;
  view: MapsView;
  base: "map" | "satellite";
  threeD: boolean;
  traffic: boolean;
  country: string;
  me: Me | null;
  geoError: string;
  following: boolean;
  selected: Selection | null;
  places: SavedLocation[];
  placesLoaded: boolean;
  savedRoutes: SavedRoute[];
  editor: { id?: string; kind?: import("./mapsApi").LocationKind; lat: number; lon: number; footprint?: Footprint | null; osmId?: string; captureMethod: SavedLocation["captureMethod"]; accuracyM?: number } | null;
  origin: Endpoint | null;
  destination: Endpoint | null;
  mode: TravelMode;
  plan: RoutePlan | null;
  /** Long-distance "Flight" option in directions (instead of a road route). */
  flightMode: boolean;
  flight: import("./mapsApi").FlightPlan | null;
  routeIndex: number;
  routing: boolean;
  routeError: string;
  nav: NavState;
  poi: { category: string; label: string; items: PlaceResult[] } | null;
  mobileSheet: "peek" | "half" | "full";
  drawerOpen: boolean;
  settings: Settings;
  toasts: Toast[];
  set(patch: Partial<State>): void;
  toast(text: string, tone?: Toast["tone"]): void;
  updateSettings(patch: Partial<Settings>): void;
}

let toastId = 0;

export const IDLE_NAV: NavState = {
  active: false,
  stepIndex: 0,
  remainingM: 0,
  remainingS: 0,
  distanceToStepM: 0,
  offRoute: false,
  rerouting: false,
  arrived: false,
  startedAt: 0,
};

export const useMaps = create<State>((set, get) => ({
  config: null,
  configError: "",
  view: "map",
  base: "satellite",
  threeD: false,
  traffic: false,
  country: localStorage.getItem("fockis-maps-country") || "HT",
  me: null,
  geoError: "",
  following: false,
  selected: null,
  places: [],
  placesLoaded: false,
  savedRoutes: [],
  editor: null,
  origin: null,
  destination: null,
  mode: loadSettings().defaultMode,
  plan: null,
  flightMode: false,
  flight: null,
  routeIndex: 0,
  routing: false,
  routeError: "",
  nav: IDLE_NAV,
  poi: null,
  mobileSheet: "half",
  drawerOpen: false,
  settings: loadSettings(),
  toasts: [],
  set: (patch) => set(patch),
  toast: (text, tone = "info") => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    try {
      localStorage.setItem("fockis-maps-settings", JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    set({ settings });
  },
}));

/* The MapLibre instance, shared by the components that move the camera. */
let mapInstance: MapLibreMap | null = null;
export const setMapInstance = (map: MapLibreMap | null) => {
  mapInstance = map;
  try {
    // Opt-in handle for debugging in the browser console: localStorage.setItem("fkm-debug", "1")
    if (localStorage.getItem("fkm-debug") === "1") (window as unknown as { fkmMap?: MapLibreMap | null }).fkmMap = map;
  } catch {
    /* ignore */
  }
};
export const getMap = () => mapInstance;

export function flyTo(lat: number, lon: number, zoom = 17) {
  mapInstance?.flyTo({ center: [lon, lat], zoom: Math.max(zoom, mapInstance.getZoom()), speed: 1.4, essential: true });
}
