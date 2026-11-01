import { useEffect, useRef, useState } from "react";
import { MapPinOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getBusinessRoute, getCategoryLabel, hasCoordinates } from "../../utils/businessUtils";
import type { NearbyItem } from "./NearbyBusinesses";

import "mapbox-gl/dist/mapbox-gl.css";

interface Props {
  items: NearbyItem[];
  center: { lat: number; lng: number } | null;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/**
 * Map of businesses with saved coordinates. Uses the app's existing Mapbox
 * setup (mapbox-gl + VITE_MAPBOX_ACCESS_TOKEN, as in src/map/FockisMap) and
 * is only loaded when the visitor switches to Map View.
 */
export default function BusinessesMap({ items, center }: Props) {
  const navigate = useNavigate();
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
  const located = items.filter(({ business }) => hasCoordinates(business));

  useEffect(() => {
    if (!token || !container.current) return;

    let disposed = false;
    let cleanup = () => {};

    import("mapbox-gl")
      .then(({ default: mapboxgl }) => {
        if (disposed || !container.current) return;

        mapboxgl.accessToken = token;

        const first = located[0]?.business;
        const map = new mapboxgl.Map({
          container: container.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center
            ? [center.lng, center.lat]
            : first
              ? [first.longitude!, first.latitude!]
              : [-82.9988, 39.9612],
          zoom: 11,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        const bounds = new mapboxgl.LngLatBounds();

        located.forEach(({ business }) => {
          const element = document.createElement("button");

          element.type = "button";
          element.className = "fkbd-map__marker";
          element.setAttribute("aria-label", business.name);
          element.addEventListener("click", (clickEvent) => {
            clickEvent.stopPropagation();
          });

          const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(
            `<strong>${escapeHtml(business.name)}</strong><br/><span>${escapeHtml(getCategoryLabel(business.category))}</span><br/><a href="${getBusinessRoute(business.id)}" data-route="${getBusinessRoute(business.id)}">View business →</a>`,
          );

          popup.on("open", () => {
            popup
              .getElement()
              ?.querySelector<HTMLAnchorElement>("a[data-route]")
              ?.addEventListener("click", (clickEvent) => {
                clickEvent.preventDefault();
                navigate(getBusinessRoute(business.id));
              });
          });

          new mapboxgl.Marker({ element }).setLngLat([business.longitude!, business.latitude!]).setPopup(popup).addTo(map);
          bounds.extend([business.longitude!, business.latitude!]);
        });

        if (center) bounds.extend([center.lng, center.lat]);
        if (!bounds.isEmpty() && located.length > 1) map.fitBounds(bounds, { padding: 48, maxZoom: 14 });

        cleanup = () => map.remove();
      })
      .catch(() => setError("The map couldn't load. The list view still works."));

    return () => {
      disposed = true;
      cleanup();
    };
    // Rebuild when the set of businesses or centre changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, center?.lat, center?.lng, located.map(({ business }) => business.id).join(",")]);

  if (!token || error) {
    return (
      <div className="fkbd-map fkbd-map--empty" role="status">
        <MapPinOff size={26} aria-hidden="true" />
        <p>{error || "Map view needs VITE_MAPBOX_ACCESS_TOKEN, the same key the Fockis map uses."}</p>
      </div>
    );
  }

  return (
    <div className="fkbd-map">
      <div ref={container} className="fkbd-map__canvas" aria-label="Map of nearby businesses" />
      {located.length === 0 && <p className="fkbd-map__note">No businesses here have saved map coordinates yet.</p>}
    </div>
  );
}
