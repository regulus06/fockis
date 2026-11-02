import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONSource, type MapGeoJSONFeature, type StyleSpecification } from "maplibre-gl";
// MapLibre finds its worker next to its own module, which bundling breaks:
// let Vite bundle the worker (with its shared chunk) and point MapLibre at it.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl(maplibreWorkerUrl);

import { API_BASE, authToken, mapsApi, type Footprint } from "./mapsApi";
import { setMapInstance, useMaps, type Selection } from "./mapsStore";

/* ============================================================================
   MAP CANVAS (MapLibre GL)
   Keeps the map in step with the store: base style, 3D buildings, terrain,
   traffic, routes, the selected building outline and all markers.
============================================================================ */

const ROUTES_SRC = "fk-routes";
const BUILDING_SRC = "fk-building";
const FLIGHT_SRC = "fk-flight";
const TRAFFIC_SRC = "fk-traffic";
const TERRAIN_SRC = "fk-terrain";
const BUILDINGS_3D = "fk-3d-buildings";

const PIN_SVG = `<svg viewBox="0 0 40 52" width="40" height="52" aria-hidden="true"><path d="M20 51s17-17.3 17-30A17 17 0 0 0 3 21c0 12.7 17 30 17 30z" fill="currentColor" stroke="#fff" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>`;

function pinElement(className: string, title = "") {
  const el = document.createElement("div");
  el.className = `fkm-pin ${className}`;
  el.innerHTML = PIN_SVG;
  if (title) el.title = title;
  return el;
}

function vectorSourceId(map: MapLibreMap): string | null {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    if ((layer as { "source-layer"?: string })["source-layer"] === "building" && "source" in layer) return String(layer.source);
  }
  for (const [id, src] of Object.entries(style.sources ?? {})) if (src.type === "vector") return id;
  return null;
}

function footprintOf(feature: MapGeoJSONFeature): Footprint | null {
  const g = feature.geometry;
  if (g.type === "Polygon") return { type: "Polygon", coordinates: g.coordinates as number[][][] };
  if (g.type === "MultiPolygon") return { type: "Polygon", coordinates: (g.coordinates as number[][][][])[0] };
  return null;
}

function emptyFC() {
  return { type: "FeatureCollection" as const, features: [] as GeoJSON.Feature[] };
}

/** Adds Fockis overlays after every style load (setStyle removes them). */
function addOverlays(map: MapLibreMap) {
  const s = useMaps.getState();
  const firstSymbol = map.getStyle().layers?.find((l) => l.type === "symbol")?.id;

  if (!map.getSource(BUILDING_SRC)) map.addSource(BUILDING_SRC, { type: "geojson", data: emptyFC() });
  if (!map.getLayer("fk-building-fill"))
    map.addLayer({ id: "fk-building-fill", type: "fill", source: BUILDING_SRC, paint: { "fill-color": "#1a73e8", "fill-opacity": 0.18 } }, firstSymbol);
  if (!map.getLayer("fk-building-line"))
    map.addLayer({ id: "fk-building-line", type: "line", source: BUILDING_SRC, paint: { "line-color": "#1a73e8", "line-width": 4 } });

  if (!map.getSource(ROUTES_SRC)) map.addSource(ROUTES_SRC, { type: "geojson", data: emptyFC() });
  if (!map.getLayer("fk-route-alt"))
    map.addLayer({
      id: "fk-route-alt",
      type: "line",
      source: ROUTES_SRC,
      filter: ["==", ["get", "selected"], false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#8fb3e8", "line-width": 7, "line-opacity": 0.85 },
    });
  if (!map.getLayer("fk-route-casing"))
    map.addLayer({
      id: "fk-route-casing",
      type: "line",
      source: ROUTES_SRC,
      filter: ["==", ["get", "selected"], true],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": 11 },
    });
  if (!map.getLayer("fk-route-main"))
    map.addLayer({
      id: "fk-route-main",
      type: "line",
      source: ROUTES_SRC,
      filter: ["==", ["get", "selected"], true],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#1a73e8", "line-width": 7 },
    });

  if (!map.getSource(FLIGHT_SRC)) map.addSource(FLIGHT_SRC, { type: "geojson", data: emptyFC() });
  if (!map.getLayer("fk-flight-ground"))
    map.addLayer({
      id: "fk-flight-ground",
      type: "line",
      source: FLIGHT_SRC,
      filter: ["==", ["get", "kind"], "ground"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#1a73e8", "line-width": 5 },
    });
  if (!map.getLayer("fk-flight-air"))
    map.addLayer({
      id: "fk-flight-air",
      type: "line",
      source: FLIGHT_SRC,
      filter: ["==", ["get", "kind"], "air"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#0a2453", "line-width": 3, "line-dasharray": [2, 2] },
    });

  syncThreeD(map);
  syncTraffic(map, s.traffic);
  syncRoutes(map);
  syncFlight(map);
  syncBuilding(map, s.selected?.footprint ?? null);
}

function syncThreeD(map: MapLibreMap) {
  const { threeD, config } = useMaps.getState();
  const vector = vectorSourceId(map);
  if (threeD && vector && !map.getLayer(BUILDINGS_3D)) {
    try {
      map.addLayer(
        {
          id: BUILDINGS_3D,
          type: "fill-extrusion",
          source: vector,
          "source-layer": "building",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 6], 0, "#e7e2f3", 30, "#c9c2e2"],
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.85,
          },
        },
        "fk-building-fill",
      );
    } catch {
      /* this style has no building data */
    }
  } else if (!threeD && map.getLayer(BUILDINGS_3D)) {
    map.removeLayer(BUILDINGS_3D);
  }

  if (threeD && config?.styles.terrain) {
    if (!map.getSource(TERRAIN_SRC)) map.addSource(TERRAIN_SRC, { type: "raster-dem", url: config.styles.terrain, tileSize: 256 });
    map.setTerrain({ source: TERRAIN_SRC, exaggeration: 1.3 });
  } else if (map.getTerrain()) {
    map.setTerrain(null);
  }
}

function syncTraffic(map: MapLibreMap, on: boolean) {
  const available = useMaps.getState().config?.traffic;
  if (on && available && !map.getSource(TRAFFIC_SRC)) {
    map.addSource(TRAFFIC_SRC, { type: "raster", tiles: [`${API_BASE}/map/tiles/traffic/{z}/{x}/{y}`], tileSize: 256, minzoom: 6, maxzoom: 20 });
    map.addLayer({ id: "fk-traffic", type: "raster", source: TRAFFIC_SRC, paint: { "raster-opacity": 0.9 } }, "fk-route-alt");
  } else if (!on && map.getSource(TRAFFIC_SRC)) {
    if (map.getLayer("fk-traffic")) map.removeLayer("fk-traffic");
    map.removeSource(TRAFFIC_SRC);
  }
}

function syncRoutes(map: MapLibreMap) {
  const { plan, routeIndex } = useMaps.getState();
  const src = map.getSource(ROUTES_SRC) as GeoJSONSource | undefined;
  if (!src) return;
  const features: GeoJSON.Feature[] = (plan?.routes ?? []).map((r, i) => ({
    type: "Feature",
    properties: { index: i, selected: i === routeIndex },
    geometry: r.geometry,
  }));
  // Draw the selected route last (on top).
  features.sort((a, b) => Number(a.properties?.selected) - Number(b.properties?.selected));
  src.setData({ type: "FeatureCollection", features });
}

function syncFlight(map: MapLibreMap) {
  const { flight } = useMaps.getState();
  const src = map.getSource(FLIGHT_SRC) as GeoJSONSource | undefined;
  if (!src) return;
  const features: GeoJSON.Feature[] = [];
  if (flight) {
    for (const leg of [flight.toAirport, flight.fromAirport]) if (leg) features.push({ type: "Feature", properties: { kind: "ground" }, geometry: leg.geometry });
    features.push({ type: "Feature", properties: { kind: "air" }, geometry: flight.arc });
  }
  src.setData({ type: "FeatureCollection", features });
}

function airportElement(iata: string, title: string) {
  const el = document.createElement("div");
  el.className = "fkm-airport";
  el.title = title;
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg><span>${iata}</span>`;
  return el;
}

function syncBuilding(map: MapLibreMap, footprint: Footprint | null) {
  const src = map.getSource(BUILDING_SRC) as GeoJSONSource | undefined;
  src?.setData(footprint ? { type: "Feature", properties: {}, geometry: footprint } : emptyFC());
}

async function describe(selection: Selection) {
  try {
    const r = await mapsApi.reverse(selection.lat, selection.lon);
    const current = useMaps.getState().selected;
    if (current && current.lat === selection.lat && current.lon === selection.lon) {
      useMaps.getState().set({
        selected: {
          ...current,
          reverse: r,
          name: current.source === "click" && (!current.name || current.name === "Dropped pin") ? r.name || r.neighborhood || "Dropped pin" : current.name,
          address: current.address || r.address,
        },
      });
    }
  } catch {
    /* address lookup is optional */
  }
}

export function selectPoint(selection: Selection) {
  useMaps.getState().set({ selected: { ...selection, reverse: selection.reverse ?? null }, poi: useMaps.getState().poi, mobileSheet: "half" });
  if (!selection.saved && selection.source !== "business") void describe(selection);
}

export default function MapCanvas() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<{ selected?: Marker; me?: Marker; destination?: Marker; editor?: Marker; extra: Marker[]; places: Marker[] }>({ extra: [], places: [] });
  const config = useMaps((s) => s.config);
  const base = useMaps((s) => s.base);
  const threeD = useMaps((s) => s.threeD);
  const traffic = useMaps((s) => s.traffic);
  const plan = useMaps((s) => s.plan);
  const flight = useMaps((s) => s.flight);
  const routeIndex = useMaps((s) => s.routeIndex);
  const selected = useMaps((s) => s.selected);
  const me = useMaps((s) => s.me);
  const destination = useMaps((s) => s.destination);
  const editor = useMaps((s) => s.editor);
  const poi = useMaps((s) => s.poi);
  const places = useMaps((s) => s.places);
  const navActive = useMaps((s) => s.nav.active);

  /* ---------- create the map ---------- */
  useEffect(() => {
    if (!config || !container.current || mapRef.current) return;
    const s = useMaps.getState();
    const url = s.base === "satellite" && config.styles.satellite ? config.styles.satellite : config.styles.streets;
    if (s.base === "satellite" && !config.styles.satellite) s.set({ base: "map" });
    const map = new MapLibreMap({
      container: container.current,
      style: url,
      center: [config.defaultCenter.lon, config.defaultCenter.lat],
      zoom: config.defaultCenter.zoom,
      attributionControl: { compact: true },
      maxPitch: 75,
      transformRequest: (requestUrl) => {
        // Our own tile proxy needs the user's session.
        if (requestUrl.startsWith(API_BASE)) {
          const token = authToken();
          return { url: requestUrl, headers: token ? { Authorization: `Bearer ${token}` } : {} };
        }
        return { url: requestUrl };
      },
    });
    mapRef.current = map;
    setMapInstance(map);

    map.on("style.load", () => addOverlays(map));
    map.on("error", (e) => {
      const message = String((e as { error?: Error }).error?.message ?? "");
      if (/style|Failed to fetch/i.test(message) && !map.isStyleLoaded()) useMaps.getState().set({ configError: "The map couldn't load. Check your connection." });
    });
    map.on("dragstart", () => useMaps.getState().set({ following: false }));

    map.on("click", (e) => {
      const st = useMaps.getState();
      if (st.nav.active) return;
      if (st.editor) {
        st.set({ editor: { ...st.editor, lat: e.lngLat.lat, lon: e.lngLat.lng, footprint: null, osmId: "", captureMethod: "pin" } });
        return;
      }
      const buildingLayers = (map.getStyle().layers ?? [])
        .filter(
          (l) =>
            (l as { "source-layer"?: string })["source-layer"] === "building" ||
            l.id === BUILDINGS_3D ||
            ((l.type === "fill" || l.type === "fill-extrusion") && /building/i.test(l.id) && !l.id.startsWith("fk-")),
        )
        .map((l) => l.id);
      const pad = 3;
      const box: [[number, number], [number, number]] = [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad],
      ];
      const poiLayers = (map.getStyle().layers ?? []).filter((l) => (l as { "source-layer"?: string })["source-layer"] === "poi").map((l) => l.id);
      const poiHit = poiLayers.length ? map.queryRenderedFeatures(box, { layers: poiLayers })[0] : undefined;
      if (poiHit && poiHit.properties?.name) {
        const [lon, lat] = poiHit.geometry.type === "Point" ? (poiHit.geometry.coordinates as [number, number]) : [e.lngLat.lng, e.lngLat.lat];
        selectPoint({ lat, lon, name: String(poiHit.properties.name), source: "poi", category: String(poiHit.properties.class ?? "") });
        return;
      }
      const building = buildingLayers.length ? map.queryRenderedFeatures(e.point, { layers: buildingLayers })[0] : undefined;
      selectPoint({
        lat: e.lngLat.lat,
        lon: e.lngLat.lng,
        name: building ? "Selected building" : "Dropped pin",
        source: "click",
        footprint: building ? footprintOf(building) : null,
        osmId: building?.id !== undefined ? String(building.id) : "",
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [config]);

  /* ---------- base style ---------- */
  const firstBase = useRef(true);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !config) return;
    if (firstBase.current) {
      firstBase.current = false;
      return;
    }
    const url = base === "satellite" && config.styles.satellite ? config.styles.satellite : config.styles.streets;
    map.setStyle(url as string | StyleSpecification);
  }, [base, config]);

  /* ---------- 3D, traffic, routes, building ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncThreeD(map);
    map.easeTo({ pitch: threeD ? 60 : 0, bearing: threeD ? map.getBearing() || -17 : 0, duration: 800 });
  }, [threeD]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) syncTraffic(map, traffic);
  }, [traffic]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) syncRoutes(map);
  }, [plan, routeIndex]);

  // Flight: dashed great-circle arc, drives to/from the airports, airport tags.
  const airportMarkers = useRef<Marker[]>([]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.isStyleLoaded()) syncFlight(map);
    airportMarkers.current.forEach((m) => m.remove());
    airportMarkers.current = flight
      ? [flight.departure, flight.arrival].map((a) => new Marker({ element: airportElement(a.iata, a.name) }).setLngLat([a.lon, a.lat]).addTo(map))
      : [];
  }, [flight]);

  useEffect(() => {
    const map = mapRef.current;
    const footprint = editor ? (editor.footprint ?? null) : (selected?.footprint ?? selected?.saved?.building?.footprint ?? null);
    if (map?.isStyleLoaded()) syncBuilding(map, footprint);
  }, [selected, editor]);

  /* ---------- markers ---------- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.selected?.remove();
    markers.current.selected = undefined;
    if (selected && !editor && !(destination && navActive)) {
      markers.current.selected = new Marker({ element: pinElement("is-selected", selected.name), anchor: "bottom" }).setLngLat([selected.lon, selected.lat]).addTo(map);
    }
  }, [selected, editor, destination, navActive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.destination?.remove();
    markers.current.destination = undefined;
    if (destination && (plan || flight)) {
      const el = pinElement("is-destination", destination.label);
      const tag = document.createElement("span");
      tag.className = "fkm-pin__tag";
      tag.textContent = destination.label;
      el.appendChild(tag);
      markers.current.destination = new Marker({ element: el, anchor: "bottom" }).setLngLat([destination.lon, destination.lat]).addTo(map);
    }
  }, [destination, plan, flight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!me) {
      markers.current.me?.remove();
      markers.current.me = undefined;
      return;
    }
    if (!markers.current.me) {
      const el = document.createElement("div");
      el.className = "fkm-me";
      el.innerHTML = '<span class="fkm-me__halo"></span><span class="fkm-me__cone"></span><span class="fkm-me__dot"></span>';
      markers.current.me = new Marker({ element: el, rotationAlignment: "map" }).setLngLat([me.lon, me.lat]).addTo(map);
    }
    markers.current.me.setLngLat([me.lon, me.lat]);
    const el = markers.current.me.getElement();
    el.classList.toggle("has-heading", me.heading !== null);
    if (me.heading !== null) markers.current.me.setRotation(me.heading);
  }, [me]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.editor?.remove();
    markers.current.editor = undefined;
    if (!editor) return;
    const marker = new Marker({ element: pinElement("is-editor", "Drag to adjust"), anchor: "bottom", draggable: true }).setLngLat([editor.lon, editor.lat]).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      const st = useMaps.getState();
      if (st.editor) st.set({ editor: { ...st.editor, lat: p.lat, lon: p.lng, captureMethod: st.editor.footprint ? "building" : "pin" } });
    });
    markers.current.editor = marker;
  }, [editor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.extra.forEach((m) => m.remove());
    markers.current.extra = (poi?.items ?? []).map((item) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `fkm-poi fkm-poi--${poi?.category ?? "place"}`;
      el.title = item.name;
      el.textContent = item.name.slice(0, 1).toUpperCase();
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectPoint({ lat: item.lat, lon: item.lon, name: item.name, address: item.address, source: item.kind === "business" ? "business" : "poi", category: item.category, logoUrl: item.logoUrl, businessId: item.kind === "business" ? item.id : undefined });
      });
      return new Marker({ element: el }).setLngLat([item.lon, item.lat]).addTo(map);
    });
  }, [poi]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markers.current.places.forEach((m) => m.remove());
    markers.current.places = places
      .filter((p) => p.id !== selected?.saved?.id)
      .map((p) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = `fkm-saved fkm-saved--${p.kind}`;
        el.title = p.label;
        el.innerHTML = p.kind === "home" ? "⌂" : p.kind === "work" ? "▣" : "★";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectPoint({ lat: p.latitude, lon: p.longitude, name: p.label, source: "saved", saved: p, footprint: p.building?.footprint ?? null });
        });
        return new Marker({ element: el }).setLngLat([p.longitude, p.latitude]).addTo(map);
      });
  }, [places, selected]);

  return <div ref={container} className="fkm-canvas" aria-label="Map" role="region" />;
}
