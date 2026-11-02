import { AIRPORTS_JSON, type AirportRow } from "./data/airports.data";
import { haversineMeters } from "./geo-utils";

/* ============================================================================
   FLIGHTS — long-distance option for directions.
   Real airports (OurAirports, public domain) + great-circle distance and an
   ESTIMATED non-stop flight time. There is no schedule or fare data here:
   the app links to a flight search for real flights and prices.
============================================================================ */

export interface Airport {
  iata: string;
  name: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  large: boolean;
}

export interface AirportOption extends Airport {
  /** Straight-line distance from the start or destination. */
  distanceM: number;
}

let cache: Airport[] | null = null;

export function airports(): Airport[] {
  if (!cache) {
    cache = (JSON.parse(AIRPORTS_JSON) as AirportRow[]).map(([iata, name, city, countryCode, lat, lon, large]) => ({ iata, name, city, countryCode, lat, lon, large: large === 1 }));
  }
  return cache;
}

export function airportByIata(iata: string): Airport | undefined {
  const code = String(iata ?? "").trim().toUpperCase();
  return airports().find((a) => a.iata === code);
}

/** Airports with scheduled flights within 250 km, best first. */
export const AIRPORT_RADIUS_M = 250_000;

export function nearestAirports(point: { lat: number; lon: number }, limit = 3): AirportOption[] {
  const out: AirportOption[] = [];
  // Cheap bounding box before the exact distance (~2.5° covers 250 km at the equator).
  const dLat = 2.5;
  const dLon = 2.5 / Math.max(0.2, Math.cos((point.lat * Math.PI) / 180));
  for (const a of airports()) {
    if (Math.abs(a.lat - point.lat) > dLat) continue;
    let dl = Math.abs(a.lon - point.lon);
    if (dl > 180) dl = 360 - dl;
    if (dl > dLon) continue;
    const distanceM = haversineMeters(point, a);
    if (distanceM <= AIRPORT_RADIUS_M) out.push({ ...a, distanceM: Math.round(distanceM) });
  }
  // A large international airport up to ~60 km further is usually the better
  // choice than a small regional one (more routes, more connections).
  const score = (a: AirportOption) => a.distanceM - (a.large ? 60_000 : 0);
  return out.sort((a, b) => score(a) - score(b)).slice(0, limit);
}

/**
 * Typical block time for a non-stop flight: ~30 min taxi/climb/descent plus
 * cruise at ~800 km/h. An estimate only, never a schedule.
 */
export function estimateFlightSeconds(distanceM: number): number {
  return Math.round(30 * 60 + (distanceM / 1000 / 800) * 3600);
}

/** Points along the great circle, longitudes kept continuous across ±180°. */
export function greatCircle(a: { lat: number; lon: number }, b: { lat: number; lon: number }, segments = 64): Array<[number, number]> {
  const rad = Math.PI / 180;
  const [φ1, λ1, φ2, λ2] = [a.lat * rad, a.lon * rad, b.lat * rad, b.lon * rad];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d === 0) return [[a.lon, a.lat], [b.lon, b.lat]];
  const pts: Array<[number, number]> = [];
  let prevLon = a.lon;
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / rad;
    let lon = Math.atan2(y, x) / rad;
    while (lon - prevLon > 180) lon -= 360;
    while (lon - prevLon < -180) lon += 360;
    prevLon = lon;
    pts.push([Number(lon.toFixed(5)), Number(lat.toFixed(5))]);
  }
  return pts;
}

export function flightSearchUrl(from: string, to: string): string {
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${from} to ${to}`)}`;
}
