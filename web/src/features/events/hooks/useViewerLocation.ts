import { useCallback, useState } from "react";

import type { ViewerLocation } from "../types/event.types";

const STORAGE_KEY = "fockis.events.location";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type LocationStatus = "idle" | "locating" | "granted" | "denied" | "unavailable";

/**
 * Location used for "Nearby" and for distance in feed recommendations.
 * Only ever requested after an explicit tap. The approximate position is
 * remembered on this device for 24 hours so the feed can use it too;
 * "Stop using my location" removes it.
 */
export function readStoredLocation(): ViewerLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return null;

    const value = JSON.parse(raw);

    if (
      typeof value?.latitude === "number" &&
      typeof value?.longitude === "number" &&
      Date.now() - Number(value.at || 0) < MAX_AGE_MS
    ) {
      return { latitude: value.latitude, longitude: value.longitude };
    }
  } catch {
    // Storage unavailable or corrupt: behave as if never granted.
  }

  return null;
}

function store(location: ViewerLocation | null) {
  try {
    if (location) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          // ~1 km precision is plenty for event discovery.
          latitude: Math.round(location.latitude * 100) / 100,
          longitude: Math.round(location.longitude * 100) / 100,
          at: Date.now(),
        }),
      );
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}

export function useViewerLocation() {
  const [location, setLocation] = useState<ViewerLocation | null>(readStoredLocation);
  const [status, setStatus] = useState<LocationStatus>(() => (readStoredLocation() ? "granted" : "idle"));

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };

        store(next);
        setLocation(readStoredLocation() ?? next);
        setStatus("granted");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 15_000 },
    );
  }, []);

  const clear = useCallback(() => {
    store(null);
    setLocation(null);
    setStatus("idle");
  }, []);

  return { location, status, request, clear };
}
