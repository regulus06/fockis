/* ============================================================================
   Client-side geo helpers (preview only — the server is authoritative).
============================================================================ */

const OLC = "23456789CFGHJMPQRVWX";

/** Open Location Code, same algorithm as the server (verified against Google's library). */
export function plusCode(latitude: number, longitude: number, length = 11): string {
  const lat = Math.min(Math.max(latitude, -90), 90);
  let lng = longitude;
  while (lng < -180) lng += 360;
  while (lng >= 180) lng -= 360;
  let latVal = Math.floor(Math.round((lat + 90) * 25_000_000 * 1e6) / 1e6);
  let lngVal = Math.floor(Math.round((lng + 180) * 8_192_000 * 1e6) / 1e6);
  if (lat === 90) latVal -= 1;
  let code = "";
  if (length > 10) {
    for (let i = 0; i < 5; i += 1) {
      code = OLC[(latVal % 5) * 4 + (lngVal % 4)] + code;
      latVal = Math.floor(latVal / 5);
      lngVal = Math.floor(lngVal / 4);
    }
  } else {
    latVal = Math.floor(latVal / 3125);
    lngVal = Math.floor(lngVal / 1024);
  }
  for (let i = 0; i < 5; i += 1) {
    code = OLC[lngVal % 20] + code;
    code = OLC[latVal % 20] + code;
    latVal = Math.floor(latVal / 20);
    lngVal = Math.floor(lngVal / 20);
  }
  return `${code.slice(0, 8)}+${code.slice(8)}`.slice(0, length + 1);
}

export function metersBetween(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLon = ((b[0] - a[0]) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Distance from a point to a polyline, and the index of the closest segment. */
export function distanceToLine(point: [number, number], line: Array<[number, number]>) {
  let best = Infinity;
  let index = 0;
  const kx = Math.cos((point[1] * Math.PI) / 180) * 111_320;
  const ky = 110_540;
  for (let i = 0; i < line.length - 1; i += 1) {
    const ax = (line[i][0] - point[0]) * kx;
    const ay = (line[i][1] - point[1]) * ky;
    const bx = (line[i + 1][0] - point[0]) * kx;
    const by = (line[i + 1][1] - point[1]) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return { distance: best, index };
}

/** Length along the line from a segment index to the end (metres). */
export function remainingLength(line: Array<[number, number]>, fromIndex: number, from: [number, number]) {
  if (!line.length) return 0;
  let total = metersBetween(from, line[Math.min(fromIndex + 1, line.length - 1)]);
  for (let i = fromIndex + 1; i < line.length - 1; i += 1) total += metersBetween(line[i], line[i + 1]);
  return total;
}

export function bearing(a: [number, number], b: [number, number]) {
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function formatDistance(m: number) {
  if (m < 50) return `${Math.max(0, Math.round(m / 5) * 5)} m`;
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0)} km`;
}

export function formatDuration(s: number) {
  const min = Math.max(1, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function boundsOf(coords: Array<[number, number]>): [[number, number], [number, number]] {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [x, y] of coords) {
    w = Math.min(w, x);
    s = Math.min(s, y);
    e = Math.max(e, x);
    n = Math.max(n, y);
  }
  return [
    [w, s],
    [e, n],
  ];
}

export const HAITI_DEPARTMENTS = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"];

export const COUNTRIES = [
  { code: "HT", name: "Haiti", flag: "🇭🇹", center: { lat: 18.5944, lon: -72.3074, zoom: 13 } },
  { code: "DO", name: "Dominican Republic", flag: "🇩🇴", center: { lat: 18.4861, lon: -69.9312, zoom: 12 } },
  { code: "US", name: "United States", flag: "🇺🇸", center: { lat: 40.7128, lon: -74.006, zoom: 11 } },
  { code: "CA", name: "Canada", flag: "🇨🇦", center: { lat: 45.5017, lon: -73.5673, zoom: 11 } },
  { code: "FR", name: "France", flag: "🇫🇷", center: { lat: 48.8566, lon: 2.3522, zoom: 12 } },
];
