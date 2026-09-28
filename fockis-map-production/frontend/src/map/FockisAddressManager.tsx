import { useEffect, useState } from "react";
import { fockisMapApi } from "./mapApi";
import type { FockisAddress } from "./types";
import "./fockis-map.css";

export function FockisAddressManager() {
  const [addresses, setAddresses] = useState<FockisAddress[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("Haiti");
  const [countryCode, setCountryCode] = useState("HT");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [buildingName, setBuildingName] = useState("");

  async function refresh() {
    try {
      setAddresses(await fockisMapApi.listAddresses({ countryCode }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load addresses.");
    }
  }

  useEffect(() => {
    void refresh();
  }, [countryCode]);

  async function create() {
    setBusy(true);
    setError("");
    try {
      await fockisMapApi.createAddress({
        country,
        countryCode,
        communeOrCity: city || undefined,
        departmentOrRegion: region || undefined,
        neighborhood: neighborhood || undefined,
        addressLine: addressLine || undefined,
        buildingName: buildingName || undefined,
        latitude: Number(latitude),
        longitude: Number(longitude),
      });
      setCity("");
      setRegion("");
      setNeighborhood("");
      setAddressLine("");
      setBuildingName("");
      setLatitude("");
      setLongitude("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create address.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fockis-address-manager">
      <h1>Fockis Address Management</h1>
      <p>Only authorized address managers can create or deactivate official Fockis addresses.</p>

      <div className="fockis-address-form">
        <label>Country<input value={country} onChange={(e) => setCountry(e.target.value)} /></label>
        <label>Country code<input value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} maxLength={2} /></label>
        <label>Department / Region<input value={region} onChange={(e) => setRegion(e.target.value)} /></label>
        <label>Commune / City<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
        <label>Neighborhood<input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} /></label>
        <label>Building name<input value={buildingName} onChange={(e) => setBuildingName(e.target.value)} /></label>
        <label>Address / landmark<input value={addressLine} onChange={(e) => setAddressLine(e.target.value)} /></label>
        <label>Latitude<input inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></label>
        <label>Longitude<input inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></label>
        <button disabled={busy} type="button" onClick={() => void create()}>
          {busy ? "Creating..." : "Create Fockis Address"}
        </button>
      </div>

      {error && <div className="fockis-map-error" role="alert">{error}</div>}

      <div className="fockis-address-list">
        {addresses.map((address) => (
          <article key={address.id}>
            <strong>{address.fockisAddressId}</strong>
            <span>{address.addressLine ?? address.neighborhood ?? address.communeOrCity ?? address.country}</span>
            <span>{address.units.length} unit(s)</span>
            <span>{address.status}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
