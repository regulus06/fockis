import { FOCKIS_API_URL } from "../../config/fockisConfig";

/* ============================================================================
   FOCKIS MAPS — API CLIENT
   Map providers are reached through the Fockis API (keys stay on the server),
   except tiles, which MapLibre loads with the browser-safe style URLs.
============================================================================ */

export const API_BASE = (import.meta.env.VITE_API_URL || FOCKIS_API_URL).replace(/\/+$/, "");

export function authToken(): string | null {
  for (const key of ["access_token", "accessToken", "token", "jwt", "authToken", "fockis_token"]) {
    const v = localStorage.getItem(key);
    if (v) return v;
  }
  return null;
}

export class MapsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const token = authToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers, body });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const raw = data && typeof data === "object" ? data.message : data;
    throw new MapsApiError(Array.isArray(raw) ? raw.join(", ") : String(raw || `Request failed (${res.status})`), res.status);
  }
  return data as T;
}

/* ---------------------------------------------------------------- types */

export type TravelMode = "driving" | "motorcycle" | "walking" | "bicycle";
export type LocationKind = "home" | "work" | "saved" | "family" | "business";

export interface MapsConfig {
  provider: "maptiler" | "openfreemap";
  styles: { streets: string; satellite: string | null; terrain: string | null };
  /** Esri World Imagery tiles, drawn under the street labels. Null when styles.satellite is used. */
  satelliteRaster?: { tiles: string[]; tileSize: number; maxzoom: number; attribution: string } | null;
  satelliteProvider?: "esri" | "maptiler" | null;
  satellite: boolean;
  terrain: boolean;
  traffic: boolean;
  streetView: boolean;
  routing: { provider: string; modes: TravelMode[]; testServer: boolean };
  geocoder: string;
  defaultCenter: { lat: number; lon: number; zoom: number };
  attribution: string;
}

export interface PlaceResult {
  id: string;
  kind: "saved" | "business" | "place" | "public";
  name: string;
  address: string;
  lat: number;
  lon: number;
  category?: string;
  source: string;
  logoUrl?: string;
  approximate?: boolean;
}

export interface ReverseResult {
  name: string;
  address: string;
  country: string;
  countryCode: string;
  department: string;
  commune: string;
  neighborhood: string;
  locality: string;
  source: string;
}

export interface Landmark {
  name: string;
  relation: "near" | "next_to" | "across_from" | "behind" | "after" | "before";
}

export interface Footprint {
  type: "Polygon";
  coordinates: number[][][];
}

export interface SavedLocation {
  id: string;
  kind: LocationKind;
  label: string;
  smartAddressId: string;
  plusCode: string;
  latitude: number;
  longitude: number;
  accuracyM: number;
  captureMethod: "gps" | "pin" | "search" | "building";
  building: { source: "osm" | "pin"; osmId?: string; footprint?: Footprint | null };
  country: string;
  countryCode: string;
  department: string;
  commune: string;
  communalSection: string;
  neighborhood: string;
  locality: string;
  streetAddress: string;
  landmarks: Landmark[];
  directions: string;
  isDefault: boolean;
  /** Review by Fockis staff. New addresses start "pending". */
  verification?: AddressVerification;
  shared: boolean;
  shareExpiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/* ---------------------------------------------------------------- flights */

export interface FlightAirport {
  iata: string;
  name: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  large: boolean;
  /** Straight-line distance from the start / destination. */
  distanceM: number;
}

export interface GroundLeg {
  distanceM: number;
  durationS: number;
  summary: string;
  geometry: { type: "LineString"; coordinates: Array<[number, number]> };
}

export interface FlightPlan {
  mode: "flight";
  departure: FlightAirport;
  arrival: FlightAirport;
  departureOptions: FlightAirport[];
  arrivalOptions: FlightAirport[];
  flightDistanceM: number;
  /** Estimate for a non-stop flight, not a schedule. */
  estimatedFlightS: number;
  international: boolean;
  toAirport: GroundLeg | null;
  fromAirport: GroundLeg | null;
  arc: { type: "LineString"; coordinates: Array<[number, number]> };
  searchUrl: string;
  source: string;
  warnings: string[];
}

export type VerificationStatus = "pending" | "verified" | "needs_info" | "rejected";

export interface AddressVerification {
  status: VerificationStatus;
  /** Message from the reviewer (why rejected, what's missing). */
  note: string;
  requestedAt: string | null;
  reviewedAt: string | null;
}

export type SaveLocationInput = Partial<Omit<SavedLocation, "id" | "smartAddressId" | "plusCode" | "shared" | "shareExpiresAt" | "createdAt" | "updatedAt" | "verification">> & {
  label: string;
  latitude: number;
  longitude: number;
};

export interface RouteStep {
  type: string;
  modifier: string;
  instruction: string;
  verbalInstruction: string;
  verbalAlert: string;
  distanceM: number;
  durationS: number;
  streetNames: string[];
  location: [number, number];
  beginIndex: number;
  endIndex: number;
}

export interface PlannedRoute {
  distanceM: number;
  durationS: number;
  summary: string;
  geometry: { type: "LineString"; coordinates: Array<[number, number]> };
  steps: RouteStep[];
  hasTolls: boolean;
  hasFerry: boolean;
}

export interface RoutePlan {
  mode: TravelMode;
  provider: string;
  routes: PlannedRoute[];
  warnings: string[];
}

export interface SavedRoute {
  id: string;
  name: string;
  origin: { label: string; lat: number; lon: number };
  destination: { label: string; lat: number; lon: number };
  mode: TravelMode;
  distanceM: number;
  durationS: number;
  summary: string;
  createdAt: string | null;
}

export interface SharedPlace {
  label: string;
  kind: LocationKind;
  smartAddressId: string;
  plusCode: string;
  latitude: number;
  longitude: number;
  building: SavedLocation["building"];
  department: string;
  commune: string;
  communalSection: string;
  neighborhood: string;
  locality: string;
  streetAddress: string;
  landmarks: Landmark[];
  directions: string;
  expiresAt: string | null;
}

/* ---------------------------------------------------------------- community places */

export const PUBLIC_CATEGORIES = [
  ["restaurant", "Restaurant / food"],
  ["shop", "Shop / store"],
  ["market", "Market"],
  ["hospital", "Hospital / clinic"],
  ["pharmacy", "Pharmacy"],
  ["school", "School / university"],
  ["church", "Church / place of worship"],
  ["bank", "Bank / money transfer"],
  ["hotel", "Hotel / guest house"],
  ["gas", "Gas station"],
  ["transport", "Bus / tap-tap / taxi stop"],
  ["government", "Government office"],
  ["office", "Office / business"],
  ["landmark", "Landmark / monument"],
  ["other", "Other"],
] as const;
export type PublicCategory = (typeof PUBLIC_CATEGORIES)[number][0];
export type PublicPlaceStatus = "pending" | "approved" | "rejected" | "removed";

export interface PublicPlace {
  id: string;
  name: string;
  category: PublicCategory;
  description: string;
  phone: string;
  website: string;
  openingHours: string;
  addressText: string;
  countryCode: string;
  department: string;
  commune: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  status: PublicPlaceStatus;
  /** Reviewer's message (only for the person who added the place). */
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  mine: boolean;
}

export type SavePublicPlaceInput = Omit<PublicPlace, "id" | "status" | "reviewNote" | "submittedAt" | "reviewedAt" | "mine">;

export const categoryLabel = (c: string) => PUBLIC_CATEGORIES.find(([v]) => v === c)?.[1] ?? "Place";

/* ---------------------------------------------------------------- calls */

const enc = encodeURIComponent;

export const mapsApi = {
  config: () => api<MapsConfig>("/map/config"),
  search: (q: string, near?: { lat: number; lon: number }, cc = "ht") =>
    api<PlaceResult[]>(`/map/search?q=${enc(q)}&cc=${enc(cc)}${near ? `&lat=${near.lat}&lon=${near.lon}` : ""}`),
  reverse: (lat: number, lon: number) => api<ReverseResult>(`/map/reverse?lat=${lat}&lon=${lon}`),
  flight: (body: { origin: { lat: number; lon: number }; destination: { lat: number; lon: number }; departure?: string; arrival?: string; language?: string }) =>
    api<FlightPlan>("/map/flight", { method: "POST", json: body }),
  route: (body: { origin: { lat: number; lon: number }; destination: { lat: number; lon: number }; mode: TravelMode; alternatives?: boolean; avoidHighways?: boolean; language?: string }) =>
    api<RoutePlan>("/map/route", { method: "POST", json: body }),
  businesses: (b: { south: number; west: number; north: number; east: number }, category?: string) =>
    api<PlaceResult[]>(`/map/businesses?south=${b.south}&west=${b.west}&north=${b.north}&east=${b.east}${category ? `&category=${enc(category)}` : ""}`),
  streetView: (lat: number, lon: number) =>
    api<{ id?: string; imageUrl?: string; capturedAt?: string | null; viewerUrl?: string; available?: false }>(`/map/street-view?lat=${lat}&lon=${lon}`),

  places: (kind?: LocationKind) => api<SavedLocation[]>(`/map/places${kind ? `?kind=${kind}` : ""}`),
  createPlace: (input: SaveLocationInput) => api<SavedLocation>("/map/places", { method: "POST", json: input }),
  updatePlace: (id: string, input: Partial<SaveLocationInput>) => api<SavedLocation>(`/map/places/${enc(id)}`, { method: "PATCH", json: input }),
  deletePlace: (id: string) => api<{ removed: boolean }>(`/map/places/${enc(id)}`, { method: "DELETE" }),
  sharePlace: (id: string, days = 30) => api<{ token: string; expiresAt: string; path: string }>(`/map/places/${enc(id)}/share`, { method: "POST", json: { days } }),
  unsharePlace: (id: string) => api<{ shared: false }>(`/map/places/${enc(id)}/share`, { method: "DELETE" }),
  shared: (token: string) => api<SharedPlace>(`/map/shared/${enc(token)}`),
  requestVerification: (id: string, message?: string) =>
    api<SavedLocation>(`/map/places/${enc(id)}/verification`, { method: "POST", json: message ? { message } : {} }),

  publicPlaces: (b: { south: number; west: number; north: number; east: number }) =>
    api<PublicPlace[]>(`/map/public-places?south=${b.south}&west=${b.west}&north=${b.north}&east=${b.east}`),
  publicPlace: (id: string) => api<PublicPlace>(`/map/public-places/${enc(id)}`),
  myPublicPlaces: () => api<PublicPlace[]>("/map/public-places/mine"),
  addPublicPlace: (input: SavePublicPlaceInput) => api<PublicPlace>("/map/public-places", { method: "POST", json: input }),
  updatePublicPlace: (id: string, input: Partial<SavePublicPlaceInput>) => api<PublicPlace>(`/map/public-places/${enc(id)}`, { method: "PATCH", json: input }),
  removePublicPlace: (id: string) => api<{ removed: boolean }>(`/map/public-places/${enc(id)}`, { method: "DELETE" }),

  savedRoutes: () => api<SavedRoute[]>("/map/saved-routes"),
  saveRoute: (body: Omit<SavedRoute, "id" | "createdAt">) => api<SavedRoute>("/map/saved-routes", { method: "POST", json: body }),
  deleteRoute: (id: string) => api<{ removed: boolean }>(`/map/saved-routes/${enc(id)}`, { method: "DELETE" }),
};
