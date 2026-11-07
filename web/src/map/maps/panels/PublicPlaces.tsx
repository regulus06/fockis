import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Check, Clock3, Crosshair, Globe, Loader2, MapPin, MapPinPlus, Pencil, Phone, Plus, Store, Trash2, X, Ban } from "lucide-react";

import { categoryGlyph, refreshPublicPlaces, selectPublicPlace } from "../MapCanvas";
import { HAITI_DEPARTMENTS, plusCode } from "../geo";
import { categoryLabel, mapsApi, PUBLIC_CATEGORIES, type PublicCategory, type PublicPlace, type PublicPlaceStatus } from "../mapsApi";
import { getMap, useMaps } from "../mapsStore";
import { startGps } from "../navigation";

/* ============================================================================
   PLACES FOR EVERYONE'S MAP
   Anyone signed in adds a shop, church, school, clinic, market or landmark
   with a pin. Fockis reviewers approve it; then it shows on the map and in
   search for everyone. (Smart Addresses stay private — see PlacePanels.)
============================================================================ */

const st = () => useMaps.getState();

const STATUS: Record<PublicPlaceStatus, { label: string; cls: string }> = {
  pending: { label: "Waiting for review", cls: "is-pending" },
  approved: { label: "On the map", cls: "is-verified" },
  rejected: { label: "Not approved", cls: "is-rejected" },
  removed: { label: "Removed", cls: "is-rejected" },
};

export function PublicStatusBadge({ status }: { status: PublicPlaceStatus }) {
  const s = STATUS[status] ?? STATUS.pending;
  return <span className={`fkm-vbadge ${s.cls}`}>{s.label}</span>;
}

/**
 * Opens the "Add a place" form with the pin at the tapped spot, my GPS
 * position, or the middle of the map.
 */
export function startPublicPlace(at?: { lat: number; lon: number; name?: string }) {
  const map = getMap();
  const s = st();
  const point = at ?? (s.me ? { lat: s.me.lat, lon: s.me.lon } : map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : { lat: 18.5944, lon: -72.3074 });
  const name = at?.name && !/^(Dropped pin|Selected building)$/i.test(at.name) ? at.name : "";
  s.set({
    view: "map",
    selected: null,
    poi: null,
    mobileSheet: "half",
    editor: { purpose: "public", lat: point.lat, lon: point.lon, draft: { name }, captureMethod: !at && s.me ? "gps" : "pin", accuracyM: !at && s.me ? Math.round(s.me.accuracy) : 0 },
  });
  map?.flyTo({ center: [point.lon, point.lat], zoom: Math.max(17, map.getZoom()) });
}

/** Opens one of my places in the form (edits go back to review). */
export function editPublicPlace(p: PublicPlace) {
  st().set({
    view: "map",
    selected: null,
    mobileSheet: "half",
    editor: { purpose: "public", lat: p.latitude, lon: p.longitude, draft: p, captureMethod: "pin" },
  });
  getMap()?.flyTo({ center: [p.longitude, p.latitude], zoom: 18 });
}

/* ---------------------------------------------------------------- form */

export function PublicPlaceEditor() {
  const editor = useMaps((s) => s.editor)!;
  const country = useMaps((s) => s.country);
  const draft = editor.draft ?? {};
  const editing = Boolean(draft.id);
  const [name, setName] = useState(draft.name ?? "");
  const [category, setCategory] = useState<PublicCategory | "">(draft.category ?? "");
  const [description, setDescription] = useState(draft.description ?? "");
  const [phone, setPhone] = useState(draft.phone ?? "");
  const [website, setWebsite] = useState(draft.website ?? "");
  const [hours, setHours] = useState(draft.openingHours ?? "");
  const [addressText, setAddressText] = useState(draft.addressText ?? "");
  const [department, setDepartment] = useState(draft.department ?? "");
  const [commune, setCommune] = useState(draft.commune ?? "");
  const [neighborhood, setNeighborhood] = useState(draft.neighborhood ?? "");
  const [countryCode, setCountryCode] = useState(draft.countryCode || country);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const lookedUp = useRef("");

  // Fill the area from the pin (only fields the person hasn't typed in).
  useEffect(() => {
    const key = `${editor.lat.toFixed(4)},${editor.lon.toFixed(4)}`;
    if (lookedUp.current === key) return;
    lookedUp.current = key;
    const t = window.setTimeout(() => {
      mapsApi
        .reverse(editor.lat, editor.lon)
        .then((r) => {
          if (r.countryCode) setCountryCode(r.countryCode);
          setDepartment((v) => v || HAITI_DEPARTMENTS.find((d) => r.department.toLowerCase().includes(d.toLowerCase())) || r.department);
          setCommune((v) => v || r.commune);
          setNeighborhood((v) => v || r.neighborhood);
        })
        .catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(t);
  }, [editor.lat, editor.lon]);

  const useGps = async () => {
    setLocating(true);
    const ok = await startGps();
    setLocating(false);
    const me = st().me;
    if (!ok || !me) return setError(st().geoError || "Your location isn't available.");
    st().set({ editor: { ...editor, lat: me.lat, lon: me.lon, captureMethod: "gps", accuracyM: Math.round(me.accuracy) }, following: false });
    getMap()?.flyTo({ center: [me.lon, me.lat], zoom: 18 });
  };

  const close = () => st().set({ editor: null });

  const save = async () => {
    setError("");
    if (name.trim().length < 2) return setError("Write the name of the place, like “Boulangerie St-Pierre”.");
    if (!category) return setError("Choose what kind of place it is.");
    const payload = {
      name: name.trim(),
      category,
      latitude: Number(editor.lat.toFixed(7)),
      longitude: Number(editor.lon.toFixed(7)),
      description: description.trim(),
      phone: phone.trim(),
      website: website.trim(),
      openingHours: hours.trim(),
      addressText: addressText.trim(),
      countryCode: (countryCode || "").toUpperCase(),
      department: department.trim(),
      commune: commune.trim(),
      neighborhood: neighborhood.trim(),
    };
    setSaving(true);
    try {
      const saved = draft.id ? await mapsApi.updatePublicPlace(draft.id, payload) : await mapsApi.addPublicPlace(payload);
      st().set({ editor: null, view: "contributions" });
      st().toast(draft.id ? "Changes sent for review" : `“${saved.name}” sent for review. You'll get a notification.`, "success");
      refreshPublicPlaces();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send this place.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="fkm-card fkm-editor fkm-contrib" aria-label="Add a place to the map">
      <header className="fkm-card__head">
        <MapPinPlus size={22} className="fkm-accent" />
        <h2>{editing ? "Edit place" : "Add a place to the map"}</h2>
        <button type="button" className="fkm-icon" onClick={close} aria-label="Cancel">
          <X size={20} />
        </button>
      </header>

      <div className="fkm-editor__scroll">
        <div className="fkm-step">
          <b>1</b>
          <div>
            <strong>Put the pin on the entrance</strong>
            <p className="fkm-muted">Tap the map or drag the green pin. Switch to Satellite to see the roofs and streets.</p>
            <div className="fkm-pinbox">
              <span>
                <small>Plus Code</small>
                <strong>{plusCode(editor.lat, editor.lon)}</strong>
              </span>
              <span>
                <small>Coordinates</small>
                <strong>
                  {editor.lat.toFixed(5)}, {editor.lon.toFixed(5)}
                </strong>
              </span>
            </div>
            <div className="fkm-row">
              <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--sm" onClick={() => void useGps()} disabled={locating}>
                {locating ? <Loader2 size={16} className="fkm-spin" /> : <Crosshair size={16} />} I'm here now
              </button>
              {editor.captureMethod === "gps" && editor.accuracyM ? <span className="fkm-muted fkm-small">GPS accuracy ±{editor.accuracyM} m</span> : null}
            </div>
          </div>
        </div>

        <div className="fkm-step">
          <b>2</b>
          <div className="fkm-fields">
            <label className="fkm-field fkm-field--wide">
              Name of the place
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="Boulangerie St-Pierre" autoComplete="off" />
            </label>
            <label className="fkm-field fkm-field--wide">
              What is it?
              <select value={category} onChange={(e) => setCategory(e.target.value as PublicCategory)}>
                <option value="">Choose a category…</option>
                {PUBLIC_CATEGORIES.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="fkm-field fkm-field--wide">
              Address or how to find it <span className="fkm-optional">optional</span>
              <input value={addressText} onChange={(e) => setAddressText(e.target.value)} maxLength={200} placeholder="Rue Grégoire #12, next to the gas station" />
            </label>
            <label className="fkm-field">
              Department
              {countryCode === "HT" ? (
                <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Choose…</option>
                  {HAITI_DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                  {department && !HAITI_DEPARTMENTS.includes(department) && <option>{department}</option>}
                </select>
              ) : (
                <input value={department} onChange={(e) => setDepartment(e.target.value)} maxLength={80} />
              )}
            </label>
            <label className="fkm-field">
              Commune / city
              <input value={commune} onChange={(e) => setCommune(e.target.value)} maxLength={80} placeholder="Pétion-Ville" />
            </label>
            <label className="fkm-field fkm-field--wide">
              Neighbourhood <span className="fkm-optional">optional</span>
              <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} placeholder="Delmas 75" />
            </label>
          </div>
        </div>

        <div className="fkm-step">
          <b>3</b>
          <div className="fkm-fields">
            <span className="fkm-field fkm-field--wide">
              Details <span className="fkm-optional">all optional</span>
            </span>
            <label className="fkm-field">
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} inputMode="tel" placeholder="+509 3700 0000" />
            </label>
            <label className="fkm-field">
              Opening hours
              <input value={hours} onChange={(e) => setHours(e.target.value)} maxLength={200} placeholder="Mon–Sat 7am–6pm" />
            </label>
            <label className="fkm-field fkm-field--wide">
              Website or page
              <input value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200} inputMode="url" placeholder="bellbakery.ht" />
            </label>
            <label className="fkm-field fkm-field--wide">
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={3} placeholder="Fresh bread every morning, pâté, cakes for events." />
              <small className="fkm-muted">{description.length}/600</small>
            </label>
          </div>
        </div>
      </div>

      <p className="fkm-editor__review">
        <BadgeCheck size={16} aria-hidden="true" />
        {editing
          ? "Changes are checked again by Fockis before they show on the map."
          : "Fockis checks every new place. Once approved, everyone sees it on the map and in search. You'll get a notification."}
      </p>
      {error && (
        <p className="fkm-error" role="alert">
          {error}
        </p>
      )}
      <div className="fkm-actions">
        <button type="button" className="fkm-btn fkm-btn--outline" onClick={close}>
          Cancel
        </button>
        <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 size={18} className="fkm-spin" /> : <Check size={18} />} {editing ? "Send changes" : "Send for review"}
        </button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- my contributions */

export function ContributionsPanel() {
  const [items, setItems] = useState<PublicPlace[] | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    mapsApi
      .myPublicPlaces()
      .then((r) => (setItems(r), setError("")))
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn't load your places."));

  useEffect(() => {
    void load();
  }, []);

  const remove = async (p: PublicPlace) => {
    if (!window.confirm(`Remove “${p.name}” from the map?`)) return;
    try {
      await mapsApi.removePublicPlace(p.id);
      st().toast("Place removed", "success");
      refreshPublicPlaces();
      void load();
    } catch (e) {
      st().toast(e instanceof Error ? e.message : "Couldn't remove it.", "error");
    }
  };

  const open = (p: PublicPlace) => {
    selectPublicPlace(p);
    st().set({ view: "map" });
    getMap()?.flyTo({ center: [p.longitude, p.latitude], zoom: 18 });
  };

  return (
    <section className="fkm-card fkm-listpanel fkm-contrib">
      <header className="fkm-card__head">
        <Store size={22} className="fkm-accent" />
        <h2>Places I added</h2>
        <button type="button" className="fkm-btn fkm-btn--primary fkm-btn--sm" onClick={() => startPublicPlace()}>
          <Plus size={16} /> Add
        </button>
      </header>
      <p className="fkm-muted">Shops, churches, schools, clinics, markets… anything missing from the map. Fockis checks each place before everyone can see it.</p>
      {error ? (
        <p className="fkm-error" role="alert">
          {error}
        </p>
      ) : !items ? (
        <Loader2 className="fkm-spin fkm-center" />
      ) : !items.length ? (
        <button type="button" className="fkm-cta" onClick={() => startPublicPlace()}>
          <MapPinPlus size={20} /> Add the first place you know
        </button>
      ) : (
        <ul className="fkm-rows">
          {items.map((p) => (
            <li key={p.id} className="fkm-contrib__item">
              <div className="fkm-row">
                <span className="fkm-row__icon fkm-row__icon--glyph" aria-hidden="true">
                  {categoryGlyph(p.category)}
                </span>
                <button type="button" className="fkm-row__body" onClick={() => open(p)}>
                  <strong>
                    {p.name} <PublicStatusBadge status={p.status} />
                  </strong>
                  <small>
                    {categoryLabel(p.category)}
                    {[p.neighborhood, p.commune].filter(Boolean).length ? ` · ${[p.neighborhood, p.commune].filter(Boolean).join(", ")}` : ""}
                  </small>
                </button>
                <button type="button" className="fkm-icon" onClick={() => editPublicPlace(p)} aria-label={`Edit ${p.name}`}>
                  <Pencil size={17} />
                </button>
                <button type="button" className="fkm-icon" onClick={() => void remove(p)} aria-label={`Remove ${p.name}`}>
                  <Trash2 size={17} />
                </button>
              </div>
              {p.status === "rejected" && p.reviewNote && (
                <p className="fkm-contrib__note">
                  <Ban size={14} aria-hidden="true" /> {p.reviewNote} — edit the place to send it again.
                </p>
              )}
              {p.status === "pending" && (
                <p className="fkm-contrib__note is-pending">
                  <Clock3 size={14} aria-hidden="true" /> Only you can see it until Fockis approves it.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- details in the place panel */

export function PublicPlaceFacts({ place }: { place: PublicPlace }) {
  const site = place.website ? place.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : "";
  return (
    <>
      <p className="fkm-community-tag">
        <span aria-hidden="true">{categoryGlyph(place.category)}</span> {categoryLabel(place.category)}
        {place.mine && place.status !== "approved" ? <PublicStatusBadge status={place.status} /> : <span className="fkm-community-tag__by">Added by the Fockis community</span>}
      </p>
      {place.description && <p className="fkm-community-desc">{place.description}</p>}
      <ul className="fkm-facts">
        {(place.addressText || place.neighborhood || place.commune) && (
          <li>
            <MapPin size={19} /> {[place.addressText, place.neighborhood, place.commune, place.department].filter(Boolean).join(", ")}
          </li>
        )}
        {place.phone && (
          <li>
            <Phone size={19} /> <a href={`tel:${place.phone.replace(/[^0-9+]/g, "")}`}>{place.phone}</a>
          </li>
        )}
        {place.openingHours && (
          <li>
            <Clock3 size={19} /> {place.openingHours}
          </li>
        )}
        {site && (
          <li>
            <Globe size={19} />{" "}
            <a href={place.website} target="_blank" rel="noopener noreferrer nofollow">
              {site}
            </a>
          </li>
        )}
      </ul>
      {place.mine && (
        <button type="button" className="fkm-link" onClick={() => editPublicPlace(place)}>
          <Pencil size={15} /> Edit this place
        </button>
      )}
    </>
  );
}
