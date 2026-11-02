import { Car, ExternalLink, Info, Navigation, Plane, PlaneLanding, PlaneTakeoff } from "lucide-react";

import { formatDuration } from "../geo";
import type { FlightAirport, FlightPlan, GroundLeg } from "../mapsApi";
import { useMaps } from "../mapsStore";
import { planRoute, setFlightMode } from "../navigation";

/* ============================================================================
   FLIGHT OPTION (long distance)
   Real airports and an estimated non-stop flight time. No schedules or fares:
   "Search flights" opens a flight search for the chosen airports.
============================================================================ */

const st = () => useMaps.getState();
const km = (m: number) => `${Math.round(m / 1000).toLocaleString()} km`;
const dist = (m: number) => (m < 10_000 ? `${(m / 1000).toFixed(1)} km` : km(m));

function airportLabel(a: FlightAirport) {
  return `${a.iata} · ${a.city || a.name}`;
}

function AirportSelect({ label, value, options, onChange }: { label: string; value: FlightAirport; options: FlightAirport[]; onChange: (iata: string) => void }) {
  const list = options.some((o) => o.iata === value.iata) ? options : [value, ...options];
  return (
    <label className="fkm-flight__select">
      <span>{label}</span>
      <select value={value.iata} onChange={(e) => onChange(e.target.value)}>
        {list.map((a) => (
          <option key={a.iata} value={a.iata}>
            {a.iata} — {a.name} ({dist(a.distanceM)} away)
          </option>
        ))}
      </select>
    </label>
  );
}

function Leg({ icon, title, leg, fallbackM }: { icon: React.ReactNode; title: string; leg: GroundLeg | null; fallbackM: number }) {
  return (
    <li>
      <span className="fkm-flight__icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{leg ? `${formatDuration(leg.durationS)} · ${dist(leg.distanceM)} by road` : `About ${dist(fallbackM)} away — the drive couldn't be planned`}</small>
      </span>
    </li>
  );
}

/** Driving directions to the departure airport. */
function navigateToAirport(a: FlightAirport) {
  st().set({ flightMode: false, flight: null, plan: null, mode: "driving", destination: { lat: a.lat, lon: a.lon, label: a.name } });
  void planRoute({ fit: true });
}

export function FlightView({ flight }: { flight: FlightPlan }) {
  const replan = (departure: string, arrival: string) => void planRoute({ fit: true, departure, arrival });
  const { departure: dep, arrival: arr } = flight;
  const ground = (flight.toAirport?.durationS ?? 0) + (flight.fromAirport?.durationS ?? 0);

  return (
    <div className="fkm-flight">
      <div className="fkm-flight__hero">
        <div className="fkm-flight__codes">
          <strong>{dep.iata}</strong>
          <span className="fkm-flight__line" aria-hidden="true">
            <Plane size={18} />
          </span>
          <strong>{arr.iata}</strong>
        </div>
        <p className="fkm-summary__time">
          ~{formatDuration(flight.estimatedFlightS)} <span>flight · {km(flight.flightDistanceM)}</span>
        </p>
        <p className="fkm-summary__via">
          {airportLabel(dep)} → {airportLabel(arr)}
          {ground > 0 ? ` · plus ${formatDuration(ground)} by road` : ""}
        </p>
      </div>

      <ol className="fkm-flight__legs">
        <Leg icon={<Car size={18} />} title={`Drive to ${dep.name}`} leg={flight.toAirport} fallbackM={dep.distanceM} />
        <li>
          <span className="fkm-flight__icon is-air">
            <PlaneTakeoff size={18} />
          </span>
          <span>
            <strong>
              Fly {dep.iata} → {arr.iata}
            </strong>
            <small>About {formatDuration(flight.estimatedFlightS)} if non-stop (estimate)</small>
          </span>
        </li>
        <Leg icon={<PlaneLanding size={18} />} title={`From ${arr.name} to your destination`} leg={flight.fromAirport} fallbackM={arr.distanceM} />
      </ol>

      <div className="fkm-flight__choose">
        <AirportSelect label="From airport" value={dep} options={flight.departureOptions} onChange={(iata) => replan(iata, arr.iata)} />
        <AirportSelect label="To airport" value={arr} options={flight.arrivalOptions} onChange={(iata) => replan(dep.iata, iata)} />
      </div>

      <ul className="fkm-warnings">
        {flight.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>

      <a className="fkm-btn fkm-btn--primary fkm-btn--block" href={flight.searchUrl} target="_blank" rel="noreferrer">
        <ExternalLink size={18} /> Search flights {dep.iata} → {arr.iata}
      </a>
      <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--block" onClick={() => navigateToAirport(dep)}>
        <Navigation size={18} /> Directions to {dep.iata} airport
      </button>
      <p className="fkm-attrib">
        <Info size={12} aria-hidden="true" /> Airports: OurAirports · flight time is an estimate, not a schedule
      </p>
    </div>
  );
}

export function FlightTab({ active }: { active: boolean }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? "is-on" : ""} onClick={() => setFlightMode(true)}>
      <Plane size={20} />
      <span>Flight</span>
    </button>
  );
}

/** Shown under a failed road route when the trip is long. */
export function TryFlight() {
  return (
    <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--block fkm-tryflight" onClick={() => setFlightMode(true)}>
      <Plane size={18} /> Too far to drive? See flights
    </button>
  );
}
