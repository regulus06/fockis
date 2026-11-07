import { BadGatewayException, BadRequestException, Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { decodePolyline, haversineMeters } from "./geo-utils";
import { estimateFlightSeconds, flightSearchUrl, greatCircle, nearestAirports, airportByIata, type AirportOption } from "./flights";

/* ============================================================================
   FOCKIS MAPS — PROVIDERS
   Map tiles & satellite:  MapTiler (MAPTILER_KEY, browser key restricted to
                           your domains). Without it: OpenFreeMap streets.
                           Satellite without MapTiler: Esri World Imagery
                           (ESRI_API_KEY, ArcGIS Location Platform; also used
                           instead of MapTiler when MAP_SATELLITE=esri).
   Search & addresses:     MapTiler Geocoding; without it Photon (search-as-
                           you-type, PHOTON_URL), then OSM Nominatim (fair-use,
                           1 request/s, identify with NOMINATIM_EMAIL).
                           Approved community places (map_public_places) and
                           the user's own Smart Addresses come first.
   Routing:                Valhalla (VALHALLA_URL). Default is the public
                           FOSSGIS server — fine for testing, not production.
   Traffic (optional):     TomTom traffic-flow tiles, proxied (key stays
                           on the server).
   Street-level (optional):Mapillary (MAPILLARY_TOKEN), proxied.
============================================================================ */

export type TravelMode = "driving" | "motorcycle" | "walking" | "bicycle";

export interface LatLon {
  lat: number;
  lon: number;
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
  /** True when the house number wasn't found and this is the street. */
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

/** Valhalla maneuver types → a compact kind + direction for icons and voice. */
const MANEUVERS: Record<number, [string, string]> = {
  1: ["depart", "straight"],
  2: ["depart", "right"],
  3: ["depart", "left"],
  4: ["arrive", "straight"],
  5: ["arrive", "right"],
  6: ["arrive", "left"],
  7: ["continue", "straight"],
  8: ["continue", "straight"],
  9: ["turn", "slight right"],
  10: ["turn", "right"],
  11: ["turn", "sharp right"],
  12: ["uturn", "right"],
  13: ["uturn", "left"],
  14: ["turn", "sharp left"],
  15: ["turn", "left"],
  16: ["turn", "slight left"],
  17: ["ramp", "straight"],
  18: ["ramp", "right"],
  19: ["ramp", "left"],
  20: ["exit", "right"],
  21: ["exit", "left"],
  22: ["continue", "straight"],
  23: ["fork", "right"],
  24: ["fork", "left"],
  25: ["merge", "straight"],
  26: ["roundabout", "straight"],
  27: ["roundabout-exit", "straight"],
  28: ["ferry", "straight"],
  29: ["ferry-exit", "straight"],
  37: ["merge", "right"],
  38: ["merge", "left"],
};

const COSTING: Record<TravelMode, string> = {
  driving: "auto",
  motorcycle: process.env.VALHALLA_MOTORCYCLE_COSTING?.trim() || "motorcycle",
  walking: "pedestrian",
  bicycle: "bicycle",
};

class TtlCache<T> {
  private readonly items = new Map<string, { value: T; until: number }>();
  constructor(
    private readonly ttlMs: number,
    private readonly max = 500,
  ) {}
  get(key: string) {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    if (hit.until < Date.now()) {
      this.items.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T) {
    if (this.items.size >= this.max) this.items.delete(this.items.keys().next().value as string);
    this.items.set(key, { value, until: Date.now() + this.ttlMs });
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

@Injectable()
export class GeoService {
  private readonly logger = new Logger(GeoService.name);
  private readonly searchCache = new TtlCache<PlaceResult[]>(5 * 60_000);
  private readonly reverseCache = new TtlCache<ReverseResult>(24 * 3600_000, 2000);
  private lastNominatim = 0;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /* ------------------------------------------------------------------ config */

  private env(name: string) {
    return process.env[name]?.trim() || "";
  }

  get valhallaUrl() {
    return (this.env("VALHALLA_URL") || "https://valhalla1.openstreetmap.de").replace(/\/+$/, "");
  }

  /** Esri World Imagery tiles (ArcGIS Location Platform key). Browser-visible: restrict the key by referrer. */
  private esriImagery() {
    const key = this.env("ESRI_API_KEY");
    if (!key) return null;
    const token = encodeURIComponent(key);
    return {
      tiles: [`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${token}`],
      tileSize: 256,
      maxzoom: 19,
      attribution: "Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    };
  }

  /** Public map configuration for the web and mobile apps. Contains only browser-safe values. */
  config() {
    const key = this.env("MAPTILER_KEY");
    const esri = this.esriImagery();
    const preferEsri = Boolean(esri) && (!key || this.env("MAP_SATELLITE").toLowerCase() === "esri");
    const styles = key
      ? {
          streets: `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`,
          satellite: preferEsri ? null : `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`,
          terrain: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${key}`,
        }
      : {
          streets: "https://tiles.openfreemap.org/styles/liberty",
          satellite: null,
          terrain: null,
        };
    const attribution = [
      key ? "© MapTiler © OpenStreetMap contributors" : "© OpenFreeMap © OpenMapTiles © OpenStreetMap contributors",
      preferEsri && esri ? `Imagery: ${esri.attribution}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      provider: key ? "maptiler" : "openfreemap",
      styles,
      /** Raster satellite drawn under the street labels (Esri). Null when the satellite style above is used. */
      satelliteRaster: preferEsri ? esri : null,
      satelliteProvider: preferEsri ? "esri" : key ? "maptiler" : null,
      satellite: Boolean(key) || Boolean(esri),
      terrain: Boolean(key),
      traffic: Boolean(this.env("TOMTOM_TRAFFIC_KEY")),
      streetView: Boolean(this.env("MAPILLARY_TOKEN")),
      routing: { provider: "valhalla", modes: ["driving", "motorcycle", "walking", "bicycle"], testServer: !this.env("VALHALLA_URL") },
      geocoder: key ? "maptiler" : "photon",
      defaultCenter: { lat: 18.5944, lon: -72.3074, zoom: 13 },
      attribution,
    };
  }

  /* ------------------------------------------------------------------ http */

  private async fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<{ status: number; body: T }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { "User-Agent": `FockisMaps/1.0 (${this.env("NOMINATIM_EMAIL") || "support@fockis.com"})`, Accept: "application/json", ...(init.headers ?? {}) },
      });
      const text = await res.text();
      let body: unknown = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { status: res.status, body: body as T };
    } catch (error) {
      this.logger.warn(`Map provider request failed: ${new URL(url).host} ${String(error)}`);
      throw new BadGatewayException("The map service didn't respond. Try again.");
    } finally {
      clearTimeout(timer);
    }
  }

  private async nominatimTurn() {
    // Nominatim's usage policy: at most one request per second.
    const wait = this.lastNominatim + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    this.lastNominatim = Date.now();
  }

  /* ------------------------------------------------------------------ search */

  async search(userId: string, q: string, near?: LatLon, countryCode = "ht"): Promise<PlaceResult[]> {
    const query = String(q ?? "").trim().slice(0, 120);
    if (query.length < 2) return [];
    const cc = /^[a-z]{2}$/i.test(countryCode) ? countryCode.toLowerCase() : "ht";

    let providerError: unknown = null;
    const [saved, community, businesses, inCountry] = await Promise.all([
      this.searchSaved(userId, query),
      this.searchPublicPlaces(query, cc),
      this.searchBusinesses(query),
      this.searchProvider(query, near, cc).catch((e) => {
        providerError = e;
        return [] as PlaceResult[];
      }),
    ]);
    // The country selector ranks results; it must not hide places abroad
    // ("Springfield, Ohio" from a map centred on Haiti). Fall back to a
    // worldwide search when the selected country has nothing.
    let places = inCountry;
    if (!places.length && !providerError) {
      places = await this.searchProvider(query, undefined, null).catch((e) => {
        providerError = e;
        return [] as PlaceResult[];
      });
    }
    // Many house numbers aren't on OpenStreetMap yet (most of Haiti, plenty
    // of the US). "807 Riggsby Road, …" → find the street and say so.
    const houseNumber = query.match(/^\s*(\d+[a-z]?)[\s,]+(.{3,})$/i);
    if (!places.length && !providerError && houseNumber) {
      const street = houseNumber[2];
      let streets = await this.searchProvider(street, near, cc).catch((e) => {
        providerError = e;
        return [] as PlaceResult[];
      });
      if (!streets.length && !providerError) streets = await this.searchProvider(street, undefined, null).catch(() => [] as PlaceResult[]);
      places = streets.map((p) => ({ ...p, approximate: true }));
    }
    // An outage must not look like "no results".
    if (providerError && !saved.length && !community.length && !businesses.length && !places.length) throw providerError;
    // The same place from the provider and from Fockis: keep the Fockis one.
    const known = [...community, ...businesses];
    places = places.filter((p) => !known.some((k) => k.name.toLowerCase() === p.name.toLowerCase() && haversineMeters(k, p) < 150));
    const all = [...saved, ...community, ...businesses, ...places];
    if (near) {
      all.sort((a, b) => {
        const rank = (p: PlaceResult) => (p.kind === "saved" ? 0 : p.kind === "public" || p.kind === "business" ? 1 : 2);
        return rank(a) - rank(b) || haversineMeters(near, a) - haversineMeters(near, b);
      });
    }
    return all.slice(0, 15);
  }

  private async searchSaved(userId: string, query: string): Promise<PlaceResult[]> {
    const model = this.connection.models["SavedLocation"];
    if (!model || !Types.ObjectId.isValid(userId)) return [];
    const re = new RegExp(escapeRegex(query), "i");
    const rows = (await model
      .find({ userId: new Types.ObjectId(userId), $or: [{ label: re }, { smartAddressId: re }, { neighborhood: re }, { landmarkText: re }] })
      .limit(5)
      .lean()
      .exec()
      .catch(() => [])) as any[];
    return rows.map((r) => ({
      id: String(r._id),
      kind: "saved" as const,
      name: r.label,
      address: [r.smartAddressId, r.neighborhood, r.commune].filter(Boolean).join(" · "),
      lat: r.location.coordinates[1],
      lon: r.location.coordinates[0],
      category: r.kind,
      source: "fockis",
    }));
  }

  /** Places people added to the map that a reviewer approved. */
  private async searchPublicPlaces(query: string, cc: string): Promise<PlaceResult[]> {
    const model = this.connection.models["PublicPlace"];
    if (!model) return [];
    const re = new RegExp(escapeRegex(query), "i");
    const rows = (await model
      .find({ status: "approved", countryCode: { $in: [cc.toUpperCase(), ""] }, $or: [{ name: re }, { addressText: re }, { neighborhood: re }] })
      .limit(6)
      .lean()
      .exec()
      .catch(() => [])) as any[];
    return rows.map((r) => ({
      id: String(r._id),
      kind: "public" as const,
      name: r.name,
      address: [r.addressText, r.neighborhood, r.commune].filter(Boolean).join(", "),
      lat: r.location.coordinates[1],
      lon: r.location.coordinates[0],
      category: r.category,
      source: "fockis",
    }));
  }

  private async searchBusinesses(query: string): Promise<PlaceResult[]> {
    const model = this.connection.models["Business"];
    if (!model) return [];
    const re = new RegExp(escapeRegex(query), "i");
    const rows = (await model
      .find({ status: "ACTIVE", latitude: { $type: "number" }, longitude: { $type: "number" }, name: re })
      .select("name category address latitude longitude logoUrl")
      .limit(5)
      .lean()
      .exec()
      .catch(() => [])) as any[];
    return rows.map((b) => ({
      id: String(b._id),
      kind: "business" as const,
      name: b.name,
      address: b.address ?? "",
      lat: b.latitude,
      lon: b.longitude,
      category: b.category,
      source: "fockis",
      logoUrl: b.logoUrl,
    }));
  }

  private async searchProvider(query: string, near: LatLon | undefined, cc: string | null): Promise<PlaceResult[]> {
    const cacheKey = `${cc ?? "world"}|${query.toLowerCase()}|${near ? `${near.lat.toFixed(2)},${near.lon.toFixed(2)}` : ""}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const key = this.env("MAPTILER_SERVER_KEY") || this.env("MAPTILER_KEY");
    let results: PlaceResult[] = [];
    if (key) {
      const params = new URLSearchParams({ key, limit: "8", language: "fr,en" });
      if (cc) params.set("country", cc);
      if (near) params.set("proximity", `${near.lon},${near.lat}`);
      const { status, body } = await this.fetchJson<any>(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params}`);
      if (status >= 400) throw new BadGatewayException("Search is unavailable right now.");
      results = (body?.features ?? []).map((f: any) => ({
        id: String(f.id),
        kind: "place" as const,
        name: f.text ?? f.place_name ?? query,
        address: f.place_name ?? "",
        lat: f.center?.[1] ?? f.geometry?.coordinates?.[1],
        lon: f.center?.[0] ?? f.geometry?.coordinates?.[0],
        category: f.properties?.categories?.[0] ?? f.place_type?.[0],
        source: "maptiler",
      }));
    } else {
      // Photon is made for search-as-you-type ("boulan" → "Boulangerie …").
      // Nominatim is the fallback (one request per second, full words only).
      const photon = await this.searchPhoton(query, near, cc).catch((error) => {
        this.logger.warn(`Photon search failed: ${String(error)}`);
        return null;
      });
      // Nothing in the selected country from Photon: Nominatim filters by country more strictly.
      if (photon && (photon.length || !cc)) {
        this.searchCache.set(cacheKey, photon);
        return photon;
      }
      await this.nominatimTurn();
      const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "8", addressdetails: "1", "accept-language": "fr,en" });
      if (cc) params.set("countrycodes", cc);
      if (this.env("NOMINATIM_EMAIL")) params.set("email", this.env("NOMINATIM_EMAIL"));
      if (near) params.set("viewbox", `${near.lon - 0.3},${near.lat + 0.3},${near.lon + 0.3},${near.lat - 0.3}`);
      const base = (this.env("NOMINATIM_URL") || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
      const { status, body } = await this.fetchJson<any[]>(`${base}/search?${params}`);
      if (status >= 400 || !Array.isArray(body)) throw new BadGatewayException("Search is unavailable right now.");
      results = body.map((r: any) => ({
        id: `osm-${r.osm_type}-${r.osm_id}`,
        kind: "place" as const,
        name: r.name || String(r.display_name ?? "").split(",")[0],
        address: r.display_name ?? "",
        lat: Number(r.lat),
        lon: Number(r.lon),
        category: r.type,
        source: "nominatim",
      }));
    }
    results = results.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
    this.searchCache.set(cacheKey, results);
    return results;
  }

  /** Country centres for ranking Photon results when the map position isn't known. */
  private static readonly COUNTRY_BIAS: Record<string, LatLon> = {
    ht: { lat: 18.9, lon: -72.6 },
    do: { lat: 18.8, lon: -70.2 },
    us: { lat: 39.8, lon: -98.6 },
    ca: { lat: 56.1, lon: -106.3 },
    fr: { lat: 46.6, lon: 2.4 },
  };

  /**
   * Photon (komoot, OpenStreetMap data). Returns null when it can't answer so
   * the caller falls back to Nominatim. PHOTON_URL points at your own server.
   */
  private async searchPhoton(query: string, near: LatLon | undefined, cc: string | null): Promise<PlaceResult[] | null> {
    const base = (this.env("PHOTON_URL") || "https://photon.komoot.io").replace(/\/+$/, "");
    const bias = near ?? (cc ? GeoService.COUNTRY_BIAS[cc] : undefined);
    const params = new URLSearchParams({ q: query, limit: cc ? "20" : "10" });
    if (bias) {
      params.set("lat", String(bias.lat));
      params.set("lon", String(bias.lon));
      if (near) params.set("zoom", "12");
    }
    const { status, body } = await this.fetchJson<any>(`${base}/api/?${params}`, {}, 6000);
    if (status >= 400 || !Array.isArray(body?.features)) return null;
    const results: PlaceResult[] = [];
    for (const f of body.features as any[]) {
      const p = f.properties ?? {};
      const [lon, lat] = f.geometry?.coordinates ?? [];
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (cc && String(p.countrycode ?? "").toLowerCase() !== cc) continue;
      const street = [p.housenumber, p.street].filter(Boolean).join(" ");
      const name = p.name || street || p.city || p.state || query;
      const address = [p.name ? street : "", p.district || p.locality, p.city, p.state, p.country].filter((v, i, a) => v && a.indexOf(v) === i && v !== name).join(", ");
      results.push({
        id: `osm-${p.osm_type ?? "x"}-${p.osm_id ?? `${lat},${lon}`}`,
        kind: "place",
        name,
        address,
        lat,
        lon,
        category: p.osm_value || p.type,
        source: "photon",
      });
      if (results.length >= 8) break;
    }
    return results;
  }

  /* ------------------------------------------------------------------ reverse */

  async reverse(lat: number, lon: number): Promise<ReverseResult> {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new BadRequestException("Invalid coordinates.");
    }
    const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const cached = this.reverseCache.get(cacheKey);
    if (cached) return cached;

    const key = this.env("MAPTILER_SERVER_KEY") || this.env("MAPTILER_KEY");
    let result: ReverseResult;
    if (key) {
      const { status, body } = await this.fetchJson<any>(`https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${encodeURIComponent(key)}&language=fr,en`);
      if (status >= 400) throw new BadGatewayException("Address lookup is unavailable right now.");
      const features: any[] = body?.features ?? [];
      const byType = (...types: string[]) => features.find((f) => types.some((t) => (f.place_type ?? []).includes(t)))?.text ?? "";
      const country = features.find((f) => (f.place_type ?? []).includes("country"));
      result = {
        name: byType("poi", "address") || byType("neighbourhood", "place") || "",
        address: features[0]?.place_name ?? "",
        country: country?.text ?? "",
        countryCode: String(country?.properties?.country_code ?? "").toUpperCase(),
        department: byType("region"),
        commune: byType("municipality", "county", "place"),
        neighborhood: byType("neighbourhood", "municipal_district"),
        locality: byType("locality", "place"),
        source: "maptiler",
      };
    } else {
      await this.nominatimTurn();
      const base = (this.env("NOMINATIM_URL") || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "18", addressdetails: "1", "accept-language": "fr,en" });
      if (this.env("NOMINATIM_EMAIL")) params.set("email", this.env("NOMINATIM_EMAIL"));
      const { status, body } = await this.fetchJson<any>(`${base}/reverse?${params}`);
      if (status >= 400) throw new BadGatewayException("Address lookup is unavailable right now.");
      const a = body?.address ?? {};
      result = {
        name: body?.name || a.amenity || a.building || a.road || "",
        address: body?.display_name ?? "",
        country: a.country ?? "",
        countryCode: String(a.country_code ?? "").toUpperCase(),
        department: String(a.state ?? "").replace(/^Département (de l'|du |de la |de )?/i, ""),
        commune: a.city || a.town || a.municipality || a.village || a.county || "",
        neighborhood: a.neighbourhood || a.suburb || a.quarter || "",
        locality: a.hamlet || a.village || a.city_district || "",
        source: "nominatim",
      };
    }
    this.reverseCache.set(cacheKey, result);
    return result;
  }

  /* ------------------------------------------------------------------ routing */

  async route(origin: LatLon, destination: LatLon, mode: TravelMode, options: { alternatives?: boolean; language?: string; avoidHighways?: boolean } = {}) {
    for (const p of [origin, destination]) {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) {
        throw new BadRequestException("Choose a valid start and destination.");
      }
    }
    if (haversineMeters(origin, destination) < 5) throw new BadRequestException("You're already there.");
    const costing = COSTING[mode];
    if (!costing) throw new BadRequestException("Unsupported travel mode.");

    const language = /^(fr|en)/i.test(options.language ?? "") ? (String(options.language).toLowerCase().startsWith("fr") ? "fr-FR" : "en-US") : "en-US";
    const body = {
      locations: [
        { lat: origin.lat, lon: origin.lon, type: "break" },
        { lat: destination.lat, lon: destination.lon, type: "break" },
      ],
      costing,
      costing_options: options.avoidHighways ? { [costing]: { use_highways: 0 } } : undefined,
      alternates: options.alternatives === false ? 0 : 2,
      directions_options: { units: "kilometers", language },
    };

    const { status, body: res } = await this.fetchJson<any>(
      `${this.valhallaUrl}/route`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      20_000,
    );

    if (status >= 400) {
      const code = Number(res?.error_code);
      if (code === 171 || code === 170) throw new UnprocessableEntityException("One of the points is too far from a mapped road. Move the pin closer to a road.");
      if (code === 442 || code === 443) throw new UnprocessableEntityException(`No ${mode === "walking" ? "walking" : mode === "bicycle" ? "cycling" : "road"} route was found between these places.`);
      if (code === 154) throw new UnprocessableEntityException("These places are too far apart for this travel mode.");
      if (status === 429) throw new ServiceUnavailableException("The routing service is busy. Try again in a moment.");
      this.logger.warn(`Valhalla error ${status}: ${JSON.stringify(res).slice(0, 300)}`);
      throw new BadGatewayException("Directions are unavailable right now.");
    }

    const trips = [res?.trip, ...(Array.isArray(res?.alternates) ? res.alternates.map((a: any) => a?.trip) : [])].filter(Boolean);
    const routes = trips.map((trip: any) => this.normalizeTrip(trip));
    if (!routes.length) throw new UnprocessableEntityException("No route was found.");

    const warnings: string[] = [];
    const first = routes[0].geometry.coordinates;
    const startGap = haversineMeters(origin, { lon: first[0][0], lat: first[0][1] });
    const endGap = haversineMeters(destination, { lon: first[first.length - 1][0], lat: first[first.length - 1][1] });
    if (startGap > 150) warnings.push(`The route starts ${Math.round(startGap)} m from you, at the nearest mapped road.`);
    if (endGap > 150) warnings.push(`The road ends ${Math.round(endGap)} m from the destination. Continue on foot or follow the written directions.`);
    if (mode === "motorcycle") warnings.push("Motorcycle routes follow mapped roads. Small paths may be missing from the map.");
    if (routes.some((r: PlannedRoute) => r.hasFerry)) warnings.push("This route includes a ferry.");

    return { mode, provider: "valhalla", routes, warnings, origin, destination };
  }

  /* ------------------------------------------------------------------ flights */

  /**
   * Long-distance option: nearest real airports at each end, the drive to and
   * from them, great-circle distance and an ESTIMATED non-stop flight time.
   * No schedules or fares: the result links to a flight search.
   */
  async flight(origin: LatLon, destination: LatLon, options: { departure?: string; arrival?: string; language?: string } = {}) {
    for (const p of [origin, destination]) {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) {
        throw new BadRequestException("Choose a valid start and destination.");
      }
    }
    const direct = haversineMeters(origin, destination);
    if (direct < 150_000) throw new UnprocessableEntityException("These places are too close for a flight. Drive or take the bus instead.");

    const departureOptions = nearestAirports(origin);
    const arrivalOptions = nearestAirports(destination);
    if (!departureOptions.length) throw new UnprocessableEntityException("There's no airport with scheduled flights within 250 km of the start.");
    if (!arrivalOptions.length) throw new UnprocessableEntityException("There's no airport with scheduled flights within 250 km of the destination.");

    const pick = (list: AirportOption[], iata: string | undefined, point: LatLon): AirportOption => {
      if (iata) {
        const chosen = list.find((a) => a.iata === iata.toUpperCase()) ?? airportByIata(iata);
        if (chosen) return { ...chosen, distanceM: Math.round(haversineMeters(point, chosen)) };
      }
      return list[0];
    };
    const departure = pick(departureOptions, options.departure, origin);
    const arrival = pick(arrivalOptions, options.arrival, destination);
    if (departure.iata === arrival.iata) throw new UnprocessableEntityException("Both places use the same airport. Drive instead.");

    // Drive to and from the airports. A failed leg isn't fatal: the flight
    // part is still useful, and the app says the drive couldn't be planned.
    const leg = async (a: LatLon, b: LatLon) => {
      if (haversineMeters(a, b) < 300) return null;
      try {
        const r = await this.route(a, b, "driving", { alternatives: false, language: options.language });
        const best = r.routes[0];
        return { distanceM: best.distanceM, durationS: best.durationS, summary: best.summary, geometry: best.geometry };
      } catch {
        return null;
      }
    };
    const toAirport = await leg(origin, { lat: departure.lat, lon: departure.lon });
    const fromAirport = await leg({ lat: arrival.lat, lon: arrival.lon }, destination);

    const flightDistanceM = Math.round(haversineMeters(departure, arrival));
    const estimatedFlightS = estimateFlightSeconds(flightDistanceM);
    const international = departure.countryCode !== arrival.countryCode;
    const warnings = [
      "Flight time is an estimate for a non-stop flight. Many trips need a connection — check airlines for real schedules and prices.",
      international ? "International flight: plan to be at the airport about 3 hours early, with your passport and any visa you need." : "Plan to be at the airport about 2 hours early.",
    ];
    if (departure.distanceM > 100_000) warnings.push(`The nearest airport with flights is ${Math.round(departure.distanceM / 1000)} km from the start.`);
    if (arrival.distanceM > 100_000) warnings.push(`The nearest airport with flights is ${Math.round(arrival.distanceM / 1000)} km from the destination.`);

    return {
      mode: "flight" as const,
      origin,
      destination,
      departure,
      arrival,
      departureOptions,
      arrivalOptions,
      flightDistanceM,
      estimatedFlightS,
      international,
      toAirport,
      fromAirport,
      arc: { type: "LineString" as const, coordinates: greatCircle(departure, arrival) },
      searchUrl: flightSearchUrl(departure.iata, arrival.iata),
      source: "OurAirports (public domain); flight time estimated",
      warnings,
    };
  }

  normalizeTrip(trip: any): PlannedRoute {
    const coordinates: Array<[number, number]> = [];
    const steps: RouteStep[] = [];
    let hasTolls = false;
    let hasFerry = false;
    for (const leg of trip.legs ?? []) {
      const offset = coordinates.length ? coordinates.length - 1 : 0;
      const shape = decodePolyline(String(leg.shape ?? ""), 6);
      coordinates.push(...(coordinates.length ? shape.slice(1) : shape));
      hasTolls ||= Boolean(leg.summary?.has_toll);
      hasFerry ||= Boolean(leg.summary?.has_ferry);
      for (const m of leg.maneuvers ?? []) {
        const [type, modifier] = MANEUVERS[Number(m.type)] ?? ["continue", "straight"];
        const begin = offset + Number(m.begin_shape_index ?? 0);
        steps.push({
          type,
          modifier,
          instruction: String(m.instruction ?? ""),
          verbalInstruction: String(m.verbal_pre_transition_instruction ?? m.instruction ?? ""),
          verbalAlert: String(m.verbal_transition_alert_instruction ?? ""),
          distanceM: Math.round(Number(m.length ?? 0) * 1000),
          durationS: Math.round(Number(m.time ?? 0)),
          streetNames: Array.isArray(m.street_names) ? m.street_names.map(String) : [],
          location: coordinates[begin] ?? coordinates[0],
          beginIndex: begin,
          endIndex: offset + Number(m.end_shape_index ?? m.begin_shape_index ?? 0),
        });
      }
    }
    // "Via …": the street the route spends the longest distance on.
    const byStreet = new Map<string, number>();
    for (const s of steps) for (const name of s.streetNames) byStreet.set(name, (byStreet.get(name) ?? 0) + s.distanceM);
    const summary = [...byStreet.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    return {
      distanceM: Math.round(Number(trip.summary?.length ?? 0) * 1000),
      durationS: Math.round(Number(trip.summary?.time ?? 0)),
      summary,
      geometry: { type: "LineString", coordinates },
      steps,
      hasTolls,
      hasFerry,
    };
  }

  /** Active Fockis businesses inside a map viewport. */
  async businessesInBounds(bounds: { south: number; west: number; north: number; east: number }, category?: string) {
    const { south, west, north, east } = bounds;
    if (![south, west, north, east].every(Number.isFinite) || north <= south || east <= west || north - south > 2 || east - west > 2) {
      throw new BadRequestException("Zoom in to see businesses.");
    }
    const model = this.connection.models["Business"];
    if (!model) return [];
    const filter: any = { status: "ACTIVE", latitude: { $gte: south, $lte: north }, longitude: { $gte: west, $lte: east } };
    if (category && /^[A-Za-z_-]{2,40}$/.test(category)) filter.category = category;
    const rows = (await model.find(filter).select("name category address latitude longitude logoUrl").limit(200).lean().exec().catch(() => [])) as any[];
    return rows.map((b) => ({
      id: String(b._id),
      kind: "business" as const,
      name: b.name,
      address: b.address ?? "",
      lat: b.latitude,
      lon: b.longitude,
      category: b.category,
      source: "fockis",
      logoUrl: b.logoUrl,
    }));
  }

  /* ------------------------------------------------------------------ optional extras */

  /** Traffic flow tile (TomTom), proxied so the key never reaches the browser. */
  async trafficTile(z: number, x: number, y: number): Promise<Buffer | null> {
    const key = this.env("TOMTOM_TRAFFIC_KEY");
    if (!key) return null;
    if (![z, x, y].every((n) => Number.isInteger(n) && n >= 0) || z > 22) throw new BadRequestException("Invalid tile.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png?key=${encodeURIComponent(key)}&tileSize=256`, { signal: controller.signal });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Nearest street-level photo (Mapillary), proxied. */
  async streetView(lat: number, lon: number) {
    const token = this.env("MAPILLARY_TOKEN");
    if (!token) return null;
    const d = 0.0006; // ≈ 65 m
    const params = new URLSearchParams({
      access_token: token,
      fields: "id,thumb_1024_url,captured_at,computed_geometry",
      bbox: `${lon - d},${lat - d},${lon + d},${lat + d}`,
      limit: "10",
    });
    const { status, body } = await this.fetchJson<any>(`https://graph.mapillary.com/images?${params}`);
    if (status >= 400) return null;
    const images: any[] = body?.data ?? [];
    const best = images
      .filter((i) => i.thumb_1024_url && i.computed_geometry?.coordinates)
      .sort((a, b) => haversineMeters({ lat, lon }, { lon: a.computed_geometry.coordinates[0], lat: a.computed_geometry.coordinates[1] }) - haversineMeters({ lat, lon }, { lon: b.computed_geometry.coordinates[0], lat: b.computed_geometry.coordinates[1] }))[0];
    if (!best) return null;
    return { id: String(best.id), imageUrl: String(best.thumb_1024_url), capturedAt: best.captured_at ? new Date(best.captured_at).toISOString() : null, viewerUrl: `https://www.mapillary.com/app/?pKey=${best.id}` };
  }
}
