import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FockisAddress, MapCoordinate } from "./types";
import { fockisMapApi } from "./mapApi";
import "./fockis-map.css";

const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

if (token) {
  mapboxgl.accessToken = token;
}

type Props = {
  initialCenter?: MapCoordinate;
  initialZoom?: number;
  canManage?: boolean;
  onAddressSelected?: (address: FockisAddress) => void;
};

export function FockisMap({
  initialCenter = { latitude: 18.5392, longitude: -72.3364 },
  initialZoom = 11,
  canManage = false,
  onAddressSelected,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [addresses, setAddresses] = useState<FockisAddress[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const center = useMemo(
    () => [initialCenter.longitude, initialCenter.latitude] as [number, number],
    [initialCenter.latitude, initialCenter.longitude],
  );

  useEffect(() => {
    if (!token) {
      setError("VITE_MAPBOX_ACCESS_TOKEN is not configured.");
      return;
    }
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center,
      zoom: initialZoom,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center, initialZoom]);

  useEffect(() => {
    fockisMapApi
      .listAddresses({ countryCode: "HT" })
      .then(setAddresses)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load Fockis locations."));
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = addresses.map((address) => {
      const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(
        `<strong>${escapeHtml(address.fockisAddressId)}</strong><br/>` +
        `${escapeHtml(address.addressLine ?? address.neighborhood ?? address.communeOrCity ?? "")}`,
      );

      const marker = new mapboxgl.Marker()
        .setLngLat([address.longitude, address.latitude])
        .setPopup(popup)
        .addTo(map);

      marker.getElement().addEventListener("click", () => {
        onAddressSelected?.(address);
      });

      return marker;
    });
  }, [addresses, onAddressSelected]);

  async function search() {
    setError("");
    if (!query.trim()) return;

    try {
      const result = await fockisMapApi.listAddresses({ q: query.trim() });
      setAddresses(result);

      if (result[0] && mapRef.current) {
        mapRef.current.flyTo({
          center: [result[0].longitude, result[0].latitude],
          zoom: 15,
          essential: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    }
  }

  return (
    <section className="fockis-map-shell" aria-label="Fockis Map">
      <div className="fockis-map-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void search();
          }}
          placeholder="Search Fockis addresses"
          aria-label="Search Fockis addresses"
        />
        <button type="button" onClick={() => void search()}>
          Search
        </button>
        {canManage && <span className="fockis-map-role">Management mode</span>}
      </div>

      {error && <div className="fockis-map-error" role="alert">{error}</div>}
      <div ref={containerRef} className="fockis-map-canvas" />
    </section>
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
