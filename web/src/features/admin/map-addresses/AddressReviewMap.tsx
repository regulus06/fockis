import { useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
// MapLibre runs its tile parser in a Web Worker; Vite must bundle it.
// eslint-disable-next-line import/no-unresolved
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

import { mapsApi, type MapsConfig } from "../../../map/maps/mapsApi";
import type { AddressDetail } from "./addressAdminApi";

setWorkerUrl(maplibreWorkerUrl);

let configPromise: Promise<MapsConfig> | null = null;
const loadConfig = () => (configPromise ??= mapsApi.config().catch((e) => {
  configPromise = null;
  throw e;
}));

const NEARBY_COLOR: Record<string, string> = {
  pending: "#e58a00",
  verified: "#1f6bf0",
  approved: "#1f6bf0",
  needs_info: "#e58a00",
  rejected: "#e5484d",
};

/** What the review map needs: a Smart Address, or a place someone added to the map. */
export interface ReviewMapSubject {
  label: string;
  latitude: number;
  longitude: number;
  building?: AddressDetail["building"];
  nearby: Array<{ latitude: number; longitude: number; status: string; distanceM: number; label: string; smartAddressId?: string }>;
}

/** Imagery only (Esri World Imagery) when the server has no satellite style. */
function imageryStyle(config: MapsConfig): StyleSpecification | null {
  const r = config.satelliteRaster;
  if (!r) return null;
  return {
    version: 8,
    sources: { imagery: { type: "raster", tiles: r.tiles, tileSize: r.tileSize, maxzoom: r.maxzoom, attribution: r.attribution } },
    layers: [{ id: "imagery", type: "raster", source: "imagery" }],
  };
}

/**
 * The reviewer's map: the owner's pin, the building outline they picked,
 * other saved addresses within 30 m (small dots), and a satellite view when
 * the map provider offers one.
 */
export default function AddressReviewMap({ address }: { address: ReviewMapSubject }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [config, setConfig] = useState<MapsConfig | null>(null);
  const [error, setError] = useState("");
  const [base, setBase] = useState<"satellite" | "streets">("satellite");

  useEffect(() => {
    loadConfig()
      .then(setConfig)
      .catch(() => setError("The map couldn't load. Use the Google Maps link to check the location."));
  }, []);

  const styleUrl = useMemo<string | StyleSpecification | null>(() => {
    if (!config) return null;
    if (base !== "satellite") return config.styles.streets;
    return config.styles.satellite ?? imageryStyle(config) ?? config.styles.streets;
  }, [config, base]);

  // Create the map once the style is known; switch style in place afterwards.
  useEffect(() => {
    if (!box.current || !styleUrl) return;
    if (map.current) {
      map.current.setStyle(styleUrl);
      return;
    }
    const m = new MapLibreMap({
      container: box.current,
      style: styleUrl,
      center: [address.longitude, address.latitude],
      zoom: 18,
      attributionControl: { compact: true },
    });
    m.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl]);

  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  // Pin, outline and neighbours (re-added after every style change).
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const markers: Marker[] = [];
    const pin = document.createElement("div");
    pin.className = "fkav-pin";
    pin.setAttribute("aria-label", "Address pin");
    for (const n of address.nearby) {
      const dot = document.createElement("div");
      dot.className = "fkav-near";
      dot.style.background = NEARBY_COLOR[n.status] ?? "#6b778f";
      dot.title = `${n.smartAddressId ? `${n.smartAddressId} · ` : ""}${n.label} (${n.distanceM} m)`;
      markers.push(new Marker({ element: dot }).setLngLat([n.longitude, n.latitude]).addTo(m));
    }
    markers.push(new Marker({ element: pin, anchor: "bottom" }).setLngLat([address.longitude, address.latitude]).addTo(m));

    const draw = () => {
      const footprint = address.building?.footprint;
      const data = { type: "FeatureCollection" as const, features: footprint ? [{ type: "Feature" as const, properties: {}, geometry: footprint }] : [] };
      const src = m.getSource("fkav-building") as GeoJSONSource | undefined;
      if (src) src.setData(data);
      else {
        m.addSource("fkav-building", { type: "geojson", data });
        m.addLayer({ id: "fkav-building-fill", type: "fill", source: "fkav-building", paint: { "fill-color": "#1f6bf0", "fill-opacity": 0.18 } });
        m.addLayer({ id: "fkav-building-line", type: "line", source: "fkav-building", paint: { "line-color": "#1f6bf0", "line-width": 2.5 } });
      }
    };
    const onStyle = () => draw();
    if (m.isStyleLoaded()) draw();
    m.on("style.load", onStyle);
    m.jumpTo({ center: [address.longitude, address.latitude] });
    return () => {
      m.off("style.load", onStyle);
      markers.forEach((mk) => mk.remove());
    };
  }, [address, config]);

  const lat = address.latitude.toFixed(6);
  const lon = address.longitude.toFixed(6);

  return (
    <div className="fkav-map">
      {error ? (
        <div className="fkav-map__error">{error}</div>
      ) : (
        <div ref={box} className="fkav-map__canvas" role="img" aria-label={`Map of ${address.label}`} />
      )}
      <div className="fkav-map__bar">
        {config?.satellite ? (
          <div className="fkav-seg" role="group" aria-label="Map type">
            <button type="button" className={base === "satellite" ? "is-on" : ""} onClick={() => setBase("satellite")}>
              Satellite
            </button>
            <button type="button" className={base === "streets" ? "is-on" : ""} onClick={() => setBase("streets")}>
              Map
            </button>
          </div>
        ) : (
          config && <span className="fksm-muted">Satellite needs a MapTiler or Esri key — use Google Maps to check imagery.</span>
        )}
        <span className="fkav-map__links">
          <a className="fksm-link" href={`https://www.google.com/maps/@?api=1&map_action=map&center=${lat},${lon}&zoom=20&basemap=satellite`} target="_blank" rel="noreferrer">
            Google Maps satellite
          </a>
          <a className="fksm-link" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`} target="_blank" rel="noreferrer">
            OpenStreetMap
          </a>
        </span>
      </div>
    </div>
  );
}
