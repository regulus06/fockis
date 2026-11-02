# Fockis Maps — providers, setup and status

The new map lives at `/map` (web: `web/src/map/maps/`, API: `apps/api/src/map/geo` and
`apps/api/src/map/places`). The previous Mapbox map is still available at `/map/classic`
while you switch. The official address registry (`/map/addresses…`) is unchanged.

## Environment variables (API)

| Variable | Required | What it does |
|---|---|---|
| `MAPTILER_KEY` | For production | Map styles, satellite imagery, terrain, search. This key is sent to browsers inside the style URL, so **restrict it to your domains** in the MapTiler dashboard (Allowed HTTP origins: `fockis.vercel.app`, your custom domain). |
| `MAPTILER_SERVER_KEY` | Optional | A second, unrestricted MapTiler key used only by the API for search and reverse geocoding. Falls back to `MAPTILER_KEY`. |
| `VALHALLA_URL` | For production | Your Valhalla routing server, e.g. `http://valhalla:8002`. Without it the API uses the public FOSSGIS test server (development only, ~1 request/second, may block you). |
| `VALHALLA_MOTORCYCLE_COSTING` | Optional | `motorcycle` (default) or `motor_scooter` (avoids highways, lower top speed — closer to taxi-motos). |
| `NOMINATIM_URL` / `NOMINATIM_EMAIL` | Only without MapTiler | Search falls back to OpenStreetMap Nominatim (public server: max 1 request/second, no bulk use). Set an email so OSM can contact you. |
| `TOMTOM_TRAFFIC_KEY` | Optional | Turns on the **Traffic** button (TomTom raster flow tiles, proxied by the API so the key stays secret). |
| `MAPILLARY_TOKEN` | Optional | Turns on the **Street View** card (nearest Mapillary street photo, where one exists). |

No new variables are needed in the web app: it reads everything from `GET /map/config`.

## Providers, licences and cost (checked 1 Nov 2026 — confirm before you rely on them)

- **MapTiler Cloud** (tiles, satellite, geocoding). Free plan: 5,000 map sessions and 100,000 requests a month, **non-commercial use only**, service pauses when the quota runs out. Fockis is commercial, so plan for **Flex (about $25–30/month, 500,000 requests)**. Attribution “© MapTiler © OpenStreetMap contributors” is shown on the map.
- **Valhalla** (routing). Open source (MIT), free to self-host. A Haiti + Dominican Republic graph is small; a 2 vCPU / 4 GB server is enough to start (≈ $20–40/month on most clouds). The public FOSSGIS server is for development only.
- **OpenStreetMap data** (roads, buildings, POIs). ODbL — keep the attribution visible. Road and building coverage in Haiti is good in Port-au-Prince and uneven elsewhere; routes and building outlines can only be as good as the map data. Contributions to OSM improve Fockis directly.
- **TomTom Traffic** (optional). 50,000 free tile requests/day, then about $0.08 per 1,000 tiles. Coverage in Haiti is limited; check TomTom's coverage list before promising traffic there.
- **Mapillary** (optional). Free; imagery exists only where people have uploaded it.

## Running Valhalla for Haiti (Docker)

```bash
mkdir -p valhalla_tiles
docker run -dt --name valhalla -p 8002:8002 \
  -v "$PWD/valhalla_tiles:/custom_files" \
  -e tile_urls=https://download.geofabrik.de/central-america/haiti-and-domrep-latest.osm.pbf \
  ghcr.io/valhalla/valhalla-scripted:latest
# then set VALHALLA_URL=http://<server>:8002 on the API
```

The first start builds the routing graph (several minutes). Re-run with fresh data
every few weeks to pick up OpenStreetMap edits (see the image's README for `force_rebuild`).

## API added

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/map/config` | public | Browser-safe styles, enabled features, attribution |
| GET | `/map/search?q=&lat=&lon=&cc=` | user | Your saved places, Fockis businesses, then MapTiler/Nominatim |
| GET | `/map/reverse?lat=&lon=` | user | Department, commune, neighbourhood for a point |
| POST | `/map/route` | user | Valhalla route + alternatives, normalised steps, warnings |
| POST | `/map/flight` | user | Long-distance option: nearest airports, drives to/from them, great-circle distance, estimated flight time, flight-search link |
| POST | `/map/places/:id/verification` | owner | Send an address back for review after "needs info" / "rejected" |
| GET | `/admin/map/addresses` (+ `/counts`, `/:id`) | `map.addresses.view` | Address verification queue and detail |
| POST | `/admin/map/addresses/:id/review` | `map.addresses.verify` | Verify / ask for info / reject (message required for the last two) |
| GET | `/map/businesses?south=&west=&north=&east=` | user | Active Fockis businesses in view |
| GET | `/map/tiles/traffic/:z/:x/:y` | user | Traffic tile proxy (204 when not configured) |
| GET | `/map/street-view?lat=&lon=` | user | Nearest Mapillary photo |
| GET/POST | `/map/places` | user | List / create Smart Addresses |
| GET/PATCH/DELETE | `/map/places/:id` | owner | Read / edit / delete (the FSA ID never changes) |
| POST/DELETE | `/map/places/:id/share` | owner | Create or revoke a 30-day share link |
| GET | `/map/shared/:token` | public | What a share-link visitor sees (no owner ID) |
| GET/POST/DELETE | `/map/saved-routes` | user | Saved routes |

New collections: `map_saved_locations` (2dsphere index), `map_counters`, `map_saved_routes`.

## Status

**Working (tested against a mock server and unit tests; not yet against live providers from this environment):**
- Fockis Maps screen from the design (desktop, tablet, phone), Map/Satellite/3D, layers, compass, zoom, GPS.
- Smart Address: pin, drag, GPS capture with accuracy, building outline pick, FSA ID, Plus Code, department/commune/section/neighbourhood/locality, landmarks, written directions, multiple places, share links.
- Directions: driving, motorcycle, walking, bicycle; alternatives; steps; warnings for off-road destinations; share and save routes; deep links (`/map?to=lat,lon&label=…&mode=…`).
- Navigation: GPS tracking, next-turn banner, spoken prompts (browser speech), automatic rerouting, arrival, screen wake lock.
- Nearby places (Gas, Food, Hotels, Hospitals, More) from OpenStreetMap data in the map tiles; Fockis businesses on the map.

**Needs your provider setup:** satellite & terrain (MapTiler key), production routing (your Valhalla), traffic (TomTom key), street photos (Mapillary token).

**Not built yet (next phases):** Fockis Delivery (couriers, assignment, live tracking, delivery PIN/QR), offline map packages, map admin tools. The Delivery and Couriers menu items say “Soon” and do nothing else.

## Flights (long distance)

- Airports come from **OurAirports** (public domain, https://ourairports.com/data/), bundled in `geo/data/airports.data.ts`: large and medium airports with scheduled passenger service and an IATA code (3,245 airports, generated 1 Nov 2026). Refresh it from `airports.csv` with the same filter now and then.
- Flight time is an **estimate** for a non-stop flight (30 min + distance at ~800 km/h). There are no schedules, connections or fares: the app links to Google Flights for the chosen airports. Showing real schedules and prices would need a paid flight API (e.g. Duffel or Amadeus) and an agreement to sell or display tickets.
- Drives to and from the airports use the same Valhalla routing; if a drive can't be planned, the flight is still shown with the straight-line distance.

## Things to know

- Satellite imagery is a picture; Fockis never claims to recognise a house from it. A house is identified by the user's pin or by an OpenStreetMap building outline the user picked.
- Exact coordinates of a saved place are visible only to its owner and to people with a share link the owner created.
- 3D buildings use OpenStreetMap building heights where they exist; many Haitian buildings have no height and show as low blocks.
