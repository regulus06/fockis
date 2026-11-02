/* ============================================================================
   GEO UTILITIES (no external services)
   - Open Location Code (Plus Codes) encoding — algorithm from the public
     specification (github.com/google/open-location-code, Apache-2.0).
   - Polyline decoding (Valhalla returns precision-6 encoded shapes).
   - Distances.
============================================================================ */

const OLC_ALPHABET = "23456789CFGHJMPQRVWX";
const OLC_SEPARATOR = "+";
const LAT_MAX = 90;
const LNG_MAX = 180;
const PAIR_CODE_LENGTH = 10;
const GRID_ROWS = 5;
const GRID_COLS = 4;

/**
 * Encodes a coordinate as a full Plus Code. Length 10 ≈ 14 m × 14 m,
 * length 11 ≈ 3.5 m × 2.8 m (default — precise enough for a house).
 */
export function encodePlusCode(latitude: number, longitude: number, codeLength = 11): string {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Invalid coordinate");
  let lat = Math.min(Math.max(latitude, -LAT_MAX), LAT_MAX);
  let lng = longitude;
  while (lng < -LNG_MAX) lng += 360;
  while (lng >= LNG_MAX) lng -= 360;

  // Integer arithmetic as in the reference implementation:
  // FINAL_LAT_PRECISION = 20^3 * 5^5 = 25,000,000; FINAL_LNG_PRECISION = 20^3 * 4^5 = 8,192,000.
  const latPrecision = 8000 * 3125;
  const lngPrecision = 8000 * 1024;
  let latVal = Math.floor(Math.round((lat + LAT_MAX) * latPrecision * 1e6) / 1e6);
  let lngVal = Math.floor(Math.round((lng + LNG_MAX) * lngPrecision * 1e6) / 1e6);
  if (lat === LAT_MAX) latVal -= 1;

  let code = "";
  // Grid part (beyond 10 digits).
  if (codeLength > PAIR_CODE_LENGTH) {
    for (let i = 0; i < 5; i += 1) {
      const latDigit = latVal % GRID_ROWS;
      const lngDigit = lngVal % GRID_COLS;
      code = OLC_ALPHABET[latDigit * GRID_COLS + lngDigit] + code;
      latVal = Math.floor(latVal / GRID_ROWS);
      lngVal = Math.floor(lngVal / GRID_COLS);
    }
  } else {
    latVal = Math.floor(latVal / Math.pow(GRID_ROWS, 5));
    lngVal = Math.floor(lngVal / Math.pow(GRID_COLS, 5));
  }
  // Pair part.
  for (let i = 0; i < PAIR_CODE_LENGTH / 2; i += 1) {
    code = OLC_ALPHABET[lngVal % 20] + code;
    code = OLC_ALPHABET[latVal % 20] + code;
    latVal = Math.floor(latVal / 20);
    lngVal = Math.floor(lngVal / 20);
  }
  code = code.slice(0, 8) + OLC_SEPARATOR + code.slice(8);
  const total = Math.min(Math.max(codeLength, 2), 15);
  // Keep the requested length (separator counts as an extra character).
  return code.slice(0, total + 1);
}

/** Decodes a Google/Valhalla encoded polyline into [lng, lat] pairs. */
export function decodePolyline(encoded: string, precision = 6): Array<[number, number]> {
  const factor = Math.pow(10, precision);
  const out: Array<[number, number]> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push([lng / factor, lat / factor]);
  }
  return out;
}

/** Encodes [lng, lat] pairs (for compact storage of saved routes). */
export function encodePolyline(coordinates: Array<[number, number]>, precision = 6): string {
  const factor = Math.pow(10, precision);
  let prevLat = 0;
  let prevLng = 0;
  let out = "";
  const enc = (value: number) => {
    let v = value < 0 ? ~(value << 1) : value << 1;
    let s = "";
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return s + String.fromCharCode(v + 63);
  };
  for (const [lng, lat] of coordinates) {
    const la = Math.round(lat * factor);
    const ln = Math.round(lng * factor);
    out += enc(la - prevLat) + enc(ln - prevLng);
    prevLat = la;
    prevLng = ln;
  }
  return out;
}

export function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export const HAITI_DEPARTMENTS = ["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"] as const;
