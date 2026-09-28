import { useEffect, useMemo, useRef, useState } from "react";

import mapboxgl from "mapbox-gl";

import "mapbox-gl/dist/mapbox-gl.css";

import type { FockisAddress, MapCoordinate } from "./types";

import { fockisMapApi } from "./mapApi";

import "./fockis-map.css";

type TravelMode = "driving" | "walking" | "cycling" | "air";

type Coordinates = {
longitude: number;
latitude: number;
};

type FockisAddressCompatibility = FockisAddress & {
canManage?: boolean;
coordinate?: MapCoordinate;
location?: MapCoordinate;
coordinates?: MapCoordinate;
longitude?: number;
latitude?: number;
label?: string;
name?: string;
title?: string;
formattedAddress?: string;
addressLine1?: string;
addressLine2?: string;
city?: string;
state?: string;
country?: string;
};

type MapboxFeature = {
id?: string;
place_name?: string;
text?: string;
center?: [number, number];
geometry?: {
coordinates?: [number, number];
};
};

type MapboxGeocodingResponse = {
features?: MapboxFeature[];
};

type MapboxManeuver = {
type?: string;
instruction?: string;
modifier?: string;
location?: [number, number];
};

type MapboxStep = {
distance: number;
duration: number;
name?: string;
mode?: string;
maneuver?: MapboxManeuver;
};

type MapboxLeg = {
steps?: MapboxStep[];
};

type MapboxRoute = {
distance: number;
duration: number;
geometry: {
coordinates: Array<[number, number]>;
};
legs?: MapboxLeg[];
};

type MapboxRouteResponse = {
code?: string;
message?: string;
routes?: MapboxRoute[];
};

const ROUTE_SOURCE_ID = "fockis-route-source";
const ROUTE_LAYER_ID = "fockis-route-layer";
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function distanceBetweenCoordinates(
first: Coordinates,
second: Coordinates,
): number {
const earthRadius = 6371000;

const lat1 = (first.latitude * Math.PI) / 180;
const lat2 = (second.latitude * Math.PI) / 180;

const deltaLat =
((second.latitude - first.latitude) * Math.PI) / 180;

const deltaLon =
((second.longitude - first.longitude) * Math.PI) / 180;

const a =
Math.sin(deltaLat / 2) ** 2 +
Math.cos(lat1) *
Math.cos(lat2) *
Math.sin(deltaLon / 2) ** 2;

const c =
2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

return earthRadius * c;
}

function formatDistance(meters: number): string {
if (meters < 1000) {
return `${Math.round(meters)} m`;
}

return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
const totalMinutes = Math.max(
0,
Math.round(seconds / 60),
);

if (totalMinutes < 60) {
return `${totalMinutes} min`;
}

const hours = Math.floor(totalMinutes / 60);
const minutes = totalMinutes % 60;

if (minutes === 0) {
return `${hours} hr`;
}

return `${hours} hr ${minutes} min`;
}

function instructionForStep(
step?: MapboxStep,
): string {
if (!step) {
return "Continue on your route";
}

if (step.maneuver?.instruction) {
return step.maneuver.instruction;
}

const type = step.maneuver?.type;
const modifier = step.maneuver?.modifier;
const roadName = step.name?.trim();

if (type === "arrive") {
return "You have arrived at your destination";
}

if (type === "depart") {
return roadName
? `Head toward ${roadName}`
: "Head toward your destination";
}

if (type === "turn") {
if (modifier) {
return roadName
? `Turn ${modifier} onto ${roadName}`
: `Turn ${modifier}`;
}
return roadName
  ? `Turn onto ${roadName}`
  : "Turn";
}

if (type === "merge") {
return roadName
? `Merge onto ${roadName}`
: "Merge onto the road";
}

if (type === "roundabout") {
return roadName
? `Enter the roundabout toward ${roadName}`
: "Enter the roundabout";
}

if (type === "fork") {
return roadName
? `Take the fork toward ${roadName}`
: "Take the fork";
}

if (type === "new name") {
return roadName
? `Continue onto ${roadName}`
: "Continue";
}

return roadName
? `Continue on ${roadName}`
: "Continue on your route";
}

function maneuverIcon(
step?: MapboxStep,
): string {
const type = step?.maneuver?.type;
const modifier = step?.maneuver?.modifier;

if (type === "arrive") {
return "📍";
}

if (type === "depart") {
return "⬆️";
}

if (type === "roundabout") {
return "↻";
}

if (type === "merge") {
return "↗";
}

if (type === "fork") {
return modifier?.includes("left")
? "↙"
: "↘";
}

if (modifier?.includes("uturn")) {
return "↩";
}

if (modifier?.includes("left")) {
return "←";
}

if (modifier?.includes("right")) {
return "→";
}

return "↑";
}

function getAirDistanceKm(
origin: Coordinates,
destination: Coordinates,
): number {
return (
distanceBetweenCoordinates(
origin,
destination,
) / 1000
);
}

function createAirRoute(
origin: Coordinates,
destination: Coordinates,
): MapboxRoute {
const distanceMeters =
distanceBetweenCoordinates(
origin,
destination,
);

const averageFlightSpeedKmh = 800;

const durationSeconds =
(distanceMeters / 1000 / averageFlightSpeedKmh) *
3600;

return {
distance: distanceMeters,
duration: durationSeconds,
geometry: {
coordinates: [
[origin.longitude, origin.latitude],
[
destination.longitude,
destination.latitude,
],
],
},
legs: [],
};
}

function getAddressCoordinate(
address: FockisAddress,
): MapCoordinate | null {
const value =
address as FockisAddressCompatibility;

if (
value.coordinate &&
typeof value.coordinate.longitude ===
"number" &&
typeof value.coordinate.latitude ===
"number"
) {
return value.coordinate;
}

if (
value.location &&
typeof value.location.longitude ===
"number" &&
typeof value.location.latitude ===
"number"
) {
return value.location;
}

if (
value.coordinates &&
typeof value.coordinates.longitude ===
"number" &&
typeof value.coordinates.latitude ===
"number"
) {
return value.coordinates;
}

if (
typeof value.longitude === "number" &&
typeof value.latitude === "number"
) {
return {
longitude: value.longitude,
latitude: value.latitude,
};
}

return null;
}

function getAddressDisplayName(
address: FockisAddress,
): string {
const value =
address as FockisAddressCompatibility;

return (
value.label ??
value.name ??
value.title ??
value.formattedAddress ??
value.addressLine1 ??
"Fockis Address"
);
}

function getAddressDisplayAddress(
address: FockisAddress,
): string {
const value =
address as FockisAddressCompatibility;

return (
value.formattedAddress ??
[
value.addressLine1,
value.addressLine2,
value.city,
value.state,
value.country,
]
.filter(Boolean)
.join(", ")
);
}

export function FockisMap({
onAddressSelected,
}: {
onAddressSelected?: (
address: FockisAddress,
) => void;
}) {
const containerRef =
useRef<HTMLDivElement | null>(null);

const mapRef =
useRef<mapboxgl.Map | null>(null);

const markersRef =
useRef<mapboxgl.Marker[]>([]);

const destinationMarkerRef =
useRef<mapboxgl.Marker | null>(null);

const userLocationMarkerRef =
useRef<mapboxgl.Marker | null>(null);

const watchIdRef =
useRef<number | null>(null);

const [addresses, setAddresses] =
useState<FockisAddress[]>([]);

const [query, setQuery] =
useState("");

const [error, setError] =
useState<string | null>(null);

const [origin, setOrigin] =
useState<Coordinates | null>(null);

const [destination, setDestination] =
useState<Coordinates | null>(null);

const [destinationName, setDestinationName] =
useState("");

const [travelMode, setTravelMode] =
useState<TravelMode>("driving");

const [routeDistance, setRouteDistance] =
useState<number | null>(null);

const [routeDuration, setRouteDuration] =
useState<number | null>(null);

const [remainingDistance, setRemainingDistance] =
useState<number | null>(null);

const [remainingDuration, setRemainingDuration] =
useState<number | null>(null);

const [navigationSteps, setNavigationSteps] =
useState<MapboxStep[]>([]);

const [currentStepIndex, setCurrentStepIndex] =
useState(0);

const [isNavigating, setIsNavigating] =
useState(false);

const [liveLocation, setLiveLocation] =
useState<Coordinates | null>(null);

const [isSearching, setIsSearching] =
useState(false);

const [isRouting, setIsRouting] =
useState(false);

const mapboxToken =
import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const currentStep =
navigationSteps[currentStepIndex];

const nextStep =
navigationSteps[currentStepIndex + 1];

const canManage = useMemo(() => {
return addresses.some(
(address) =>
(
address as FockisAddressCompatibility
).canManage === true,
);
}, [addresses]);

const stopLiveNavigation = () => {
if (watchIdRef.current !== null) {
navigator.geolocation.clearWatch(
watchIdRef.current,
);

  watchIdRef.current = null;
}

setIsNavigating(false);

};

const updateNavigationProgress = (
location: Coordinates,
) => {
if (!destination) {
return;
}
const destinationDistance =
  distanceBetweenCoordinates(
    location,
    destination,
  );

if (destinationDistance <= 40) {
  setRemainingDistance(0);
  setRemainingDuration(0);

  setCurrentStepIndex(
    Math.max(
      navigationSteps.length - 1,
      0,
    ),
  );

  stopLiveNavigation();

  return;
}

if (navigationSteps.length === 0) {
  setRemainingDistance(
    destinationDistance,
  );

  return;
}

let nextIndex = currentStepIndex;

while (
  nextIndex <
  navigationSteps.length - 1
) {
  const maneuverLocation =
    navigationSteps[nextIndex]?.maneuver
      ?.location;

  if (!maneuverLocation) {
    break;
  }

  const distanceToManeuver =
    distanceBetweenCoordinates(
      location,
      {
        longitude: maneuverLocation[0],
        latitude: maneuverLocation[1],
      },
    );

  if (distanceToManeuver > 60) {
    break;
  }

  nextIndex += 1;
}

if (nextIndex !== currentStepIndex) {
  setCurrentStepIndex(nextIndex);
}

const activeStep =
  navigationSteps[nextIndex];

const activeManeuver =
  activeStep?.maneuver?.location;

let activeStepRemainingDistance =
  activeStep?.distance ?? 0;

if (activeManeuver) {
  activeStepRemainingDistance =
    Math.min(
      activeStepRemainingDistance,
      distanceBetweenCoordinates(
        location,
        {
          longitude: activeManeuver[0],
          latitude: activeManeuver[1],
        },
      ),
    );
}

const followingDistance =
  navigationSteps
    .slice(nextIndex + 1)
    .reduce(
      (total, step) =>
        total + step.distance,
      0,
    );

const followingDuration =
  navigationSteps
    .slice(nextIndex + 1)
    .reduce(
      (total, step) =>
        total + step.duration,
      0,
    );

let activeStepRemainingDuration =
  activeStep?.duration ?? 0;

if (
  activeStep &&
  activeStep.distance > 0
) {
  activeStepRemainingDuration =
    activeStep.duration *
    (activeStepRemainingDistance /
      activeStep.distance);
}

setRemainingDistance(
  activeStepRemainingDistance +
    followingDistance,
);

setRemainingDuration(
  activeStepRemainingDuration +
    followingDuration,
);
};

const startLiveNavigation = () => {
if (travelMode === "air") {
return;
}

if (!navigator.geolocation) {
  setError(
    "Live navigation requires location services in your browser.",
  );

  return;
}

setError(null);
setIsNavigating(true);

if (watchIdRef.current !== null) {
  navigator.geolocation.clearWatch(
    watchIdRef.current,
  );
}

watchIdRef.current =
  navigator.geolocation.watchPosition(
    (position) => {
      const location: Coordinates = {
        longitude:
          position.coords.longitude,
        latitude:
          position.coords.latitude,
      };

      setLiveLocation(location);
      setOrigin(location);

      updateNavigationProgress(
        location,
      );

      const map = mapRef.current;

      if (!map) {
        return;
      }

      if (
        !userLocationMarkerRef.current
      ) {
        userLocationMarkerRef.current =
          new mapboxgl.Marker({
            color: "#163a5f",
          })
            .setLngLat([
              location.longitude,
              location.latitude,
            ])
            .addTo(map);
      } else {
        userLocationMarkerRef.current.setLngLat(
          [
            location.longitude,
            location.latitude,
          ],
        );
      }

      map.easeTo({
        center: [
          location.longitude,
          location.latitude,
        ],
        duration: 700,
      });
    },
    (positionError) => {
      setIsNavigating(false);

      if (
        positionError.code ===
        positionError.PERMISSION_DENIED
      ) {
        setError(
          "Location permission was denied. Allow location access to use live turn-by-turn navigation.",
        );
      } else if (
        positionError.code ===
        positionError.POSITION_UNAVAILABLE
      ) {
        setError(
          "Your current location is unavailable.",
        );
      } else {
        setError(
          "Unable to continuously track your location.",
        );
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 15000,
    },
  );

};

useEffect(() => {
if (
!containerRef.current ||
!mapboxToken
) {
return;
}
mapboxgl.accessToken = mapboxToken;

const map = new mapboxgl.Map({
  container: containerRef.current,
  style: "mapbox://styles/mapbox/standard",
  center: [-72.335, 18.594],
  zoom: 6,
});

mapRef.current = map;

map.addControl(
  new mapboxgl.NavigationControl(),
  "top-right",
);

map.addControl(
  new mapboxgl.FullscreenControl(),
  "top-right",
);

map.addControl(
  new mapboxgl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true,
    },
    trackUserLocation: true,
    showUserHeading: true,
  }),
  "top-right",
);

const handleMapLoad = () => {
  if (
    !map.getSource(ROUTE_SOURCE_ID)
  ) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      lineMetrics: true,
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [],
        },
      },
    });
  }

  if (
    !map.getLayer(ROUTE_LAYER_ID)
  ) {
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#163a5f",
        "line-width": 6,
        "line-opacity": 0.92,
      },
    });
  }

  map.resize();
};

map.on("load", handleMapLoad);

const resizeMap = () => {
  map.resize();
};

window.addEventListener(
  "resize",
  resizeMap,
);

const resizeObserver =
  typeof ResizeObserver !==
  "undefined"
    ? new ResizeObserver(() => {
        map.resize();
      })
    : null;

if (
  resizeObserver &&
  containerRef.current
) {
  resizeObserver.observe(
    containerRef.current,
  );
}

return () => {
  window.removeEventListener(
    "resize",
    resizeMap,
  );

  resizeObserver?.disconnect();

  if (watchIdRef.current !== null) {
    navigator.geolocation.clearWatch(
      watchIdRef.current,
    );

    watchIdRef.current = null;
  }

  if (
    userLocationMarkerRef.current
  ) {
    userLocationMarkerRef.current.remove();
    userLocationMarkerRef.current =
      null;
  }

  markersRef.current.forEach(
    (marker) => marker.remove(),
  );

  markersRef.current = [];

  if (
    destinationMarkerRef.current
  ) {
    destinationMarkerRef.current.remove();
    destinationMarkerRef.current =
      null;
  }

  map.remove();
  mapRef.current = null;
};
}, [mapboxToken]);

useEffect(() => {
let cancelled = false;

fockisMapApi
  .listAddresses({
    countryCode: "HT",
  })
  .then((data) => {
    if (!cancelled) {
      setAddresses(data);
    }
  })
  .catch((requestError) => {
    if (!cancelled) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load Fockis addresses.",
      );
    }
  });

return () => {
  cancelled = true;
};

}, []);

useEffect(() => {
const map = mapRef.current;
if (!map) {
  return;
}

markersRef.current.forEach(
  (marker) => marker.remove(),
);

markersRef.current = [];

addresses.forEach((address) => {
  const coordinate =
    getAddressCoordinate(address);

  if (!coordinate) {
    return;
  }

  const marker = new mapboxgl.Marker({
    color: canManage
      ? "#b8862f"
      : "#163a5f",
  })
    .setLngLat([
      coordinate.longitude,
      coordinate.latitude,
    ])
    .setPopup(
      new mapboxgl.Popup({
        offset: 24,
      }).setHTML(`
        <div class="fockis-map-popup">
          <strong>${escapeHtml(
            getAddressDisplayName(
              address,
            ),
          )}</strong>
          <div>${escapeHtml(
            getAddressDisplayAddress(
              address,
            ),
          )}</div>
        </div>
      `),
    )
    .addTo(map);

  marker
    .getElement()
    .addEventListener(
      "click",
      () => {
        onAddressSelected?.(
          address,
        );
      },
    );

  markersRef.current.push(marker);
});
}, [
addresses,
canManage,
onAddressSelected,
]);

const searchDestination = async () => {
const trimmedQuery = query.trim();
if (!trimmedQuery) {
  return;
}

if (!mapboxToken) {
  setError(
    "VITE_MAPBOX_ACCESS_TOKEN is not configured.",
  );

  return;
}

setIsSearching(true);
setError(null);

try {
  const response = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(
      trimmedQuery,
    )}&limit=5&access_token=${encodeURIComponent(
      mapboxToken,
    )}`,
  );

  if (!response.ok) {
    throw new Error(
      "Unable to search for that destination.",
    );
  }

  const data =
    (await response.json()) as MapboxGeocodingResponse;

  const feature = data.features?.[0];

  if (!feature) {
    throw new Error(
      "No destination was found.",
    );
  }

  const coordinates =
    feature.center ??
    feature.geometry?.coordinates;

  if (!coordinates) {
    throw new Error(
      "The destination does not have map coordinates.",
    );
  }

  const nextDestination: Coordinates =
    {
      longitude: coordinates[0],
      latitude: coordinates[1],
    };

  const name =
    feature.place_name ??
    feature.text ??
    trimmedQuery;

  setDestination(
    nextDestination,
  );

  setDestinationName(name);

  if (
    destinationMarkerRef.current
  ) {
    destinationMarkerRef.current.remove();
  }

  const map = mapRef.current;

  if (map) {
    destinationMarkerRef.current =
      new mapboxgl.Marker({
        color: "#b8862f",
      })
        .setLngLat([
          nextDestination.longitude,
          nextDestination.latitude,
        ])
        .setPopup(
          new mapboxgl.Popup({
            offset: 24,
          }).setText(name),
        )
        .addTo(map);

    map.flyTo({
      center: [
        nextDestination.longitude,
        nextDestination.latitude,
      ],
      zoom: 13,
      duration: 1200,
    });
  }
} catch (requestError) {
  setError(
    requestError instanceof Error
      ? requestError.message
      : "Unable to search for the destination.",
  );
} finally {
  setIsSearching(false);
}

};

const useCurrentLocation = () => {
if (!navigator.geolocation) {
setError(
"Your browser does not support location services.",
);
  return;
}

setError(null);

navigator.geolocation.getCurrentPosition(
  (position) => {
    const location: Coordinates =
      {
        longitude:
          position.coords.longitude,
        latitude:
          position.coords.latitude,
      };

    setOrigin(location);
    setLiveLocation(location);

    const map = mapRef.current;

    if (map) {
      map.flyTo({
        center: [
          location.longitude,
          location.latitude,
        ],
        zoom: 15,
        duration: 1200,
      });
    }
  },
  (positionError) => {
    if (
      positionError.code ===
      positionError.PERMISSION_DENIED
    ) {
      setError(
        "Location permission was denied. Allow location access to use your current location.",
      );
    } else {
      setError(
        "Unable to determine your current location.",
      );
    }
  },
  {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
  },
);

};

const getDirections = async () => {
if (!origin) {
setError(
"Set your starting location first.",
);
  return;
}

if (!destination) {
  setError(
    "Search for a destination first.",
  );

  return;
}

if (!mapboxToken) {
  setError(
    "VITE_MAPBOX_ACCESS_TOKEN is not configured.",
  );

  return;
}

setIsRouting(true);
setError(null);
stopLiveNavigation();

try {
  let route: MapboxRoute;

  if (travelMode === "air") {
    route = createAirRoute(
      origin,
      destination,
    );

    setNavigationSteps([]);
    setCurrentStepIndex(0);
  } else {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson&steps=true&voice_instructions=true&banner_instructions=true&access_token=${encodeURIComponent(
        mapboxToken,
      )}`,
    );

    if (!response.ok) {
      throw new Error(
        "Unable to calculate the road route.",
      );
    }

    const data =
      (await response.json()) as MapboxRouteResponse;

    if (
      !data.routes ||
      data.routes.length === 0
    ) {
      throw new Error(
        data.message ??
          "No route was found between these locations.",
      );
    }

    route = data.routes[0];

    const steps =
      route.legs?.flatMap(
        (leg) => leg.steps ?? [],
      ) ?? [];

    setNavigationSteps(steps);
    setCurrentStepIndex(0);
  }

  setRouteDistance(route.distance);
  setRouteDuration(route.duration);
  setRemainingDistance(
    route.distance,
  );
  setRemainingDuration(
    route.duration,
  );

  const map = mapRef.current;

  if (!map) {
    return;
  }

  const source =
    map.getSource(
      ROUTE_SOURCE_ID,
    ) as
      | mapboxgl.GeoJSONSource
      | undefined;

  if (!source) {
    throw new Error(
      "The Fockis route layer is not ready yet.",
    );
  }

  source.setData({
    type: "Feature",
    properties: {
      travelMode,
    },
    geometry: {
      type: "LineString",
      coordinates:
        route.geometry.coordinates,
    },
  });

  if (
    map.getLayer(
      ROUTE_LAYER_ID,
    )
  ) {
    map.setPaintProperty(
      ROUTE_LAYER_ID,
      "line-dasharray",
      travelMode === "air"
        ? [2, 2]
        : [1, 0],
    );
  }

  if (
    route.geometry.coordinates.length >
    0
  ) {
    const bounds =
      route.geometry.coordinates.reduce(
        (
          currentBounds,
          coordinate,
        ) =>
          currentBounds.extend(
            coordinate as [
              number,
              number,
            ],
          ),
        new mapboxgl.LngLatBounds(
          route.geometry
            .coordinates[0],
          route.geometry
            .coordinates[0],
        ),
      );

    map.fitBounds(bounds, {
      padding: {
        top: 180,
        bottom: 180,
        left: 80,
        right: 80,
      },
      duration: 1200,
    });
  }

  if (travelMode !== "air") {
    startLiveNavigation();
  }
} catch (requestError) {
  setError(
    requestError instanceof Error
      ? requestError.message
      : "Unable to calculate directions.",
  );
} finally {
  setIsRouting(false);
}
};

const clearRoute = () => {
stopLiveNavigation();
setRouteDistance(null);
setRouteDuration(null);
setRemainingDistance(null);
setRemainingDuration(null);
setNavigationSteps([]);
setCurrentStepIndex(0);
setLiveLocation(null);
setDestination(null);
setDestinationName("");

if (
  destinationMarkerRef.current
) {
  destinationMarkerRef.current.remove();
  destinationMarkerRef.current =
    null;
}

if (
  userLocationMarkerRef.current
) {
  userLocationMarkerRef.current.remove();
  userLocationMarkerRef.current =
    null;
}

const map = mapRef.current;

if (!map) {
  return;
}

const source =
  map.getSource(
    ROUTE_SOURCE_ID,
  ) as
    | mapboxgl.GeoJSONSource
    | undefined;

source?.setData({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [],
  },
});

if (
  map.getLayer(
    ROUTE_LAYER_ID,
  )
) {
  map.setPaintProperty(
    ROUTE_LAYER_ID,
    "line-dasharray",
    [1, 0],
  );
}

};

const handleSearchKeyDown = (
event: React.KeyboardEvent<HTMLInputElement>,
) => {
if (event.key === "Enter") {
event.preventDefault();
void searchDestination();
}
};

if (!mapboxToken) {
return ( <div className="fockis-map-page"> <div className="fockis-map-error">
VITE_MAPBOX_ACCESS_TOKEN is not
configured. </div> </div>
);
}

return ( <div className="fockis-map-page"> <div className="fockis-map-toolbar"> <div className="fockis-map-search">
<input
value={query}
onChange={(event) =>
setQuery(event.target.value)
}
onKeyDown={
handleSearchKeyDown
}
placeholder="Where do you want to go?"
aria-label="Search destination"
/>

```
      <button
        type="button"
        onClick={() =>
          void searchDestination()
        }
        disabled={
          isSearching ||
          !query.trim()
        }
      >
        {isSearching
          ? "Searching..."
          : "Search"}
      </button>
    </div>

    <div className="fockis-map-controls">
      <button
        type="button"
        onClick={
          useCurrentLocation
        }
      >
        Use My Location
      </button>

      <select
        value={travelMode}
        onChange={(event) =>
          setTravelMode(
            event.target
              .value as TravelMode,
          )
        }
        aria-label="Travel mode"
      >
        <option value="driving">
          🚗 Driving
        </option>

        <option value="walking">
          🚶 Walking
        </option>

        <option value="cycling">
          🚴 Cycling
        </option>

        <option value="air">
          ✈️ Plane
        </option>
      </select>

      <button
        type="button"
        onClick={() =>
          void getDirections()
        }
        disabled={
          isRouting ||
          !origin ||
          !destination
        }
      >
        {isRouting
          ? "Finding Route..."
          : "Get Directions"}
      </button>

      {routeDistance !== null && (
        <button
          type="button"
          onClick={clearRoute}
        >
          Clear Route
        </button>
      )}
    </div>
  </div>

  {error && (
    <div className="fockis-map-error">
      {error}
    </div>
  )}

  {destinationName && (
    <div className="fockis-map-destination">
      <strong>
        Destination:
      </strong>{" "}
      {destinationName}
    </div>
  )}

  {routeDistance !== null &&
    routeDuration !== null && (
      <div className="fockis-map-route-summary">
        <div>
          <span>Route</span>

          <strong>
            {formatDistance(
              routeDistance,
            )}
          </strong>
        </div>

        <div>
          <span>ETA</span>

          <strong>
            {formatDuration(
              routeDuration,
            )}
          </strong>
        </div>

        {travelMode === "air" &&
          origin &&
          destination && (
            <div>
              <span>
                Air Distance
              </span>

              <strong>
                {getAirDistanceKm(
                  origin,
                  destination,
                ).toFixed(1)}{" "}
                km
              </strong>
            </div>
          )}
      </div>
    )}

  {travelMode !== "air" &&
    navigationSteps.length > 0 &&
    routeDistance !== null && (
      <div className="fockis-map-navigation-panel">
        <div className="fockis-map-navigation-header">
          <span>
            {isNavigating
              ? "LIVE NAVIGATION"
              : "TURN-BY-TURN"}
          </span>

          {isNavigating && (
            <button
              type="button"
              onClick={
                stopLiveNavigation
              }
            >
              Stop Navigation
            </button>
          )}
        </div>

        <div className="fockis-map-next-turn">
          <div className="fockis-map-maneuver-icon">
            {maneuverIcon(
              currentStep,
            )}
          </div>

          <div className="fockis-map-next-turn-content">
            <strong>
              {instructionForStep(
                currentStep,
              )}
            </strong>

            {currentStep && (
              <span>
                {formatDistance(
                  currentStep.distance,
                )}

                {currentStep.name
                  ? ` • ${currentStep.name}`
                  : ""}
              </span>
            )}
          </div>
        </div>

        {remainingDistance !==
          null && (
          <div className="fockis-map-navigation-stats">
            <div>
              <span>
                Remaining
              </span>

              <strong>
                {formatDistance(
                  remainingDistance,
                )}
              </strong>
            </div>

            {remainingDuration !==
              null && (
              <div>
                <span>ETA</span>

                <strong>
                  {formatDuration(
                    remainingDuration,
                  )}
                </strong>
              </div>
            )}
          </div>
        )}

        {nextStep && (
          <div className="fockis-map-following-turn">
            <span>Next</span>

            <strong>
              {maneuverIcon(
                nextStep,
              )}{" "}
              {instructionForStep(
                nextStep,
              )}
            </strong>
          </div>
        )}

        {!isNavigating && (
          <button
            type="button"
            className="fockis-map-start-navigation"
            onClick={
              startLiveNavigation
            }
          >
            Start Live Navigation
          </button>
        )}

        {liveLocation && (
          <div className="fockis-map-location-status">
            ● Your location is
            being tracked
          </div>
        )}
      </div>
    )}

  <div
    ref={containerRef}
    className="fockis-map-canvas"
  />
</div>
);
}
