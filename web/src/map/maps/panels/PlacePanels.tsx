import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  BadgeCheck,
  Building2,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  Crosshair,
  Home,
  Landmark as LandmarkIcon,
  Loader2,
  MapPin,
  MapPinPlus,
  MoreVertical,
  Navigation,
  Pencil,
  Plus,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { HAITI_DEPARTMENTS, plusCode } from "../geo";
import { mapsApi, type Landmark, type LocationKind, type SavedLocation } from "../mapsApi";
import { getMap, useMaps, type Selection } from "../mapsStore";
import { directionsTo, directionsLink, shareLink, startGps } from "../navigation";
import { PublicPlaceFacts, startPublicPlace } from "./PublicPlaces";

/* ============================================================================
   SELECTED LOCATION PANEL + SMART ADDRESS EDITOR
============================================================================ */

const st = () => useMaps.getState();

async function copy(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    st().toast(label, "success");
  } catch {
    st().toast(text, "info");
  }
}

export async function refreshPlaces() {
  try {
    const places = await mapsApi.places();
    st().set({ places, placesLoaded: true });
    return places;
  } catch (error) {
    st().set({ placesLoaded: true });
    st().toast(error instanceof Error ? error.message : "Couldn't load your places.", "error");
    return [];
  }
}

const RELATIONS: Array<[Landmark["relation"], string]> = [
  ["near", "Near"],
  ["next_to", "Next to"],
  ["across_from", "Across from"],
  ["behind", "Behind"],
  ["after", "After"],
  ["before", "Before"],
];

const relationLabel = (r: Landmark["relation"]) => RELATIONS.find(([v]) => v === r)?.[1] ?? "Near";

/* ---------------------------------------------------------------- thumbnails */

function PlaceImage({ lat, lon }: { lat: number; lon: number }) {
  const config = useMaps((s) => s.config);
  const [street, setStreet] = useState<{ imageUrl: string; viewerUrl: string } | null>(null);
  useEffect(() => {
    setStreet(null);
    if (!config?.streetView) return;
    let alive = true;
    mapsApi
      .streetView(lat, lon)
      .then((r) => alive && r.imageUrl && r.viewerUrl && setStreet({ imageUrl: r.imageUrl, viewerUrl: r.viewerUrl }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [lat, lon, config?.streetView]);

  const satellite = useMemo(() => {
    const key = config?.styles.satellite?.match(/[?&]key=([^&]+)/)?.[1];
    if (key) return `https://api.maptiler.com/maps/satellite/static/${lon.toFixed(6)},${lat.toFixed(6)},18/240x180.png?key=${key}&attribution=false`;
    // Esri imagery: the zoom-18 tile that contains the place.
    const tile = config?.satelliteRaster?.tiles[0];
    if (!tile) return "";
    const z = 18;
    const n = 2 ** z;
    const x = Math.floor(((lon + 180) / 360) * n);
    const rad = (lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
    return tile.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
  }, [config, lat, lon]);

  if (street) {
    return (
      <a className="fkm-thumb" href={street.viewerUrl} target="_blank" rel="noopener noreferrer" title="Street-level photo (Mapillary)">
        <img src={street.imageUrl} alt="Street-level view near this place" />
      </a>
    );
  }
  if (satellite) {
    return (
      <span className="fkm-thumb">
        <img src={satellite} alt="Satellite view of this place" />
      </span>
    );
  }
  return (
    <span className="fkm-thumb fkm-thumb--empty">
      <MapPin size={28} />
    </span>
  );
}

export function StreetViewCard() {
  const selected = useMaps((s) => s.selected);
  const config = useMaps((s) => s.config);
  const [img, setImg] = useState<{ imageUrl: string; viewerUrl: string } | null>(null);
  useEffect(() => {
    setImg(null);
    if (!selected || !config?.streetView) return;
    let alive = true;
    mapsApi
      .streetView(selected.lat, selected.lon)
      .then((r) => alive && r.imageUrl && r.viewerUrl && setImg({ imageUrl: r.imageUrl, viewerUrl: r.viewerUrl }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [selected, config?.streetView]);
  if (!img) return null;
  return (
    <a className="fkm-streetcard" href={img.viewerUrl} target="_blank" rel="noopener noreferrer">
      <img src={img.imageUrl} alt="Nearest street-level photo" />
      <span>
        <strong>Street View</strong>
        <small>(Limited areas · Mapillary)</small>
      </span>
    </a>
  );
}

/* ---------------------------------------------------------------- panel */

/* ----------------------------------------------------------------------------
   VERIFICATION STATUS (owner's view)
---------------------------------------------------------------------------- */

const VERIFICATION_UI = {
  pending: { icon: Clock3, title: "Waiting for verification", text: "Fockis staff will check this address. You'll get a notification when it's done." },
  verified: { icon: BadgeCheck, title: "Verified by Fockis", text: "Staff checked this address. Moving the pin or changing the address sends it back for review." },
  needs_info: { icon: CircleAlert, title: "More information needed", text: "" },
  rejected: { icon: Ban, title: "Not verified", text: "" },
} as const;

export function VerificationBadge({ place }: { place: SavedLocation }) {
  const status = place.verification?.status ?? "pending";
  const Icon = VERIFICATION_UI[status].icon;
  const short = { pending: "Pending", verified: "Verified", needs_info: "Info needed", rejected: "Not verified" }[status];
  return (
    <span className={`fkm-vbadge is-${status}`} title={VERIFICATION_UI[status].title}>
      <Icon size={13} aria-hidden="true" /> {short}
    </span>
  );
}

function VerificationBox({ place, onEdit }: { place: SavedLocation; onEdit: () => void }) {
  const v = place.verification ?? { status: "pending" as const, note: "", requestedAt: null, reviewedAt: null };
  const ui = VERIFICATION_UI[v.status];
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const canResubmit = v.status === "needs_info" || v.status === "rejected";

  const resubmit = async () => {
    setBusy(true);
    try {
      const updated = await mapsApi.requestVerification(place.id, reply.trim() || undefined);
      await refreshPlaces();
      const sel = st().selected;
      if (sel?.saved?.id === place.id) st().set({ selected: { ...sel, saved: updated } });
      setReplying(false);
      setReply("");
      st().toast("Sent back to Fockis for review", "success");
    } catch (error) {
      st().toast(error instanceof Error ? error.message : "Couldn't send it for review.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`fkm-verify is-${v.status}`} role="status">
      <div className="fkm-verify__head">
        <ui.icon size={19} aria-hidden="true" />
        <strong>{ui.title}</strong>
      </div>
      {v.note && canResubmit ? <p className="fkm-verify__note">“{v.note}”</p> : ui.text ? <p>{ui.text}</p> : null}
      {canResubmit && (
        <>
          <p>Edit the address to fix it (that sends it back automatically), or reply and send it back as it is.</p>
          {replying && (
            <textarea
              value={reply}
              maxLength={500}
              rows={3}
              placeholder="Reply to the reviewer (optional)"
              onChange={(e) => setReply(e.target.value)}
              aria-label="Reply to the reviewer"
            />
          )}
          <div className="fkm-verify__actions">
            <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--sm" onClick={onEdit}>
              <Pencil size={15} /> Edit address
            </button>
            {replying ? (
              <button type="button" className="fkm-btn fkm-btn--primary fkm-btn--sm" onClick={() => void resubmit()} disabled={busy}>
                {busy ? <Loader2 size={15} className="fkm-spin" /> : <Check size={15} />} Send for review
              </button>
            ) : (
              <button type="button" className="fkm-btn fkm-btn--outline fkm-btn--sm" onClick={() => setReplying(true)}>
                Send back as is
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function PlacePanel({ selection }: { selection: Selection }) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const saved = selection.saved;
  const community = selection.publicPlace;
  // Opened from search or a link: fetch the community place's details.
  useEffect(() => {
    if (!selection.publicId || selection.publicPlace) return;
    let alive = true;
    mapsApi
      .publicPlace(selection.publicId)
      .then((p) => {
        const current = st().selected;
        if (alive && current?.publicId === p.id) st().set({ selected: { ...current, publicPlace: p, name: p.name } });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [selection.publicId, selection.publicPlace]);
  const r = selection.reverse;
  const coords = `${selection.lat.toFixed(4)}, ${selection.lon.toFixed(4)}`;
  const area = saved
    ? [saved.neighborhood, saved.commune, saved.department].filter(Boolean).join(", ")
    : r
      ? [r.neighborhood, r.commune, r.department].filter(Boolean).join(", ") || r.address
      : selection.address || "";
  const landmark = saved?.landmarks?.[0];

  const share = async () => {
    if (saved) {
      setBusy(true);
      try {
        const link = await mapsApi.sharePlace(saved.id, 30);
        await shareLink(saved.label, `${window.location.origin}${link.path}`);
        void refreshPlaces();
      } catch (error) {
        st().toast(error instanceof Error ? error.message : "Couldn't create a share link.", "error");
      } finally {
        setBusy(false);
      }
    } else {
      await shareLink(selection.name, directionsLink({ lat: selection.lat, lon: selection.lon, label: selection.name }, st().mode));
    }
  };

  const remove = async () => {
    if (!saved || !window.confirm(`Delete "${saved.label}"? Its Smart Address ${saved.smartAddressId} will stop working.`)) return;
    try {
      await mapsApi.deletePlace(saved.id);
      st().set({ selected: null });
      st().toast("Place deleted", "success");
      void refreshPlaces();
    } catch (error) {
      st().toast(error instanceof Error ? error.message : "Couldn't delete.", "error");
    }
  };

  const edit = () => {
    const target = saved ?? null;
    st().set({
      editor: {
        id: target?.id,
        lat: selection.lat,
        lon: selection.lon,
        footprint: target?.building?.footprint ?? selection.footprint ?? null,
        osmId: target?.building?.osmId ?? selection.osmId ?? "",
        captureMethod: target?.captureMethod ?? (selection.footprint ? "building" : selection.source === "gps" ? "gps" : "pin"),
      },
    });
  };

  return (
    <section className="fkm-card fkm-place" aria-label="Selected location">
      <header className="fkm-card__head">
        {selection.publicId ? <MapPin size={22} className="fkm-accent" /> : <Home size={22} className="fkm-accent" />}
        <h2>{selection.publicId ? "Place" : "Selected Location"}</h2>
        <div className="fkm-menu-anchor">
          <button type="button" className="fkm-icon" onClick={() => setMenu((v) => !v)} aria-label="More options" aria-expanded={menu}>
            <MoreVertical size={20} />
          </button>
          {menu && (
            <div className="fkm-menu" role="menu" onMouseLeave={() => setMenu(false)}>
              <button type="button" role="menuitem" onClick={() => (setMenu(false), void copy(`${selection.lat.toFixed(6)}, ${selection.lon.toFixed(6)}`, "Coordinates copied"))}>
                <Copy size={16} /> Copy coordinates
              </button>
              <button type="button" role="menuitem" onClick={() => (setMenu(false), void copy(saved?.plusCode ?? plusCode(selection.lat, selection.lon), "Plus Code copied"))}>
                <Copy size={16} /> Copy Plus Code
              </button>
              <button type="button" role="menuitem" onClick={() => (setMenu(false), edit())}>
                {saved ? <Pencil size={16} /> : <Plus size={16} />} {saved ? "Edit Smart Address" : "Save as Smart Address"}
              </button>
              {!saved && !selection.publicId && (
                <button type="button" role="menuitem" onClick={() => (setMenu(false), startPublicPlace({ lat: selection.lat, lon: selection.lon, name: selection.name }))}>
                  <MapPinPlus size={16} /> Add this place to the map
                </button>
              )}
              {saved?.shared && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setMenu(false);
                    await mapsApi.unsharePlace(saved.id).catch(() => undefined);
                    st().toast("Share link turned off", "success");
                    void refreshPlaces();
                  }}
                >
                  <X size={16} /> Stop sharing
                </button>
              )}
              {saved && (
                <button type="button" role="menuitem" className="is-danger" onClick={() => (setMenu(false), void remove())}>
                  <Trash2 size={16} /> Delete place
                </button>
              )}
              <button type="button" role="menuitem" onClick={() => (setMenu(false), st().set({ selected: null }))}>
                <X size={16} /> Close
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="fkm-place__hero">
        <PlaceImage lat={selection.lat} lon={selection.lon} />
        <div>
          <h3>{saved?.label ?? community?.name ?? selection.name}</h3>
          <button type="button" className="fkm-coords" onClick={() => void copy(`${selection.lat.toFixed(6)}, ${selection.lon.toFixed(6)}`, "Coordinates copied")} title="Copy coordinates">
            {coords} <Copy size={16} />
          </button>
        </div>
      </div>

      {saved ? (
        <button type="button" className="fkm-smart" onClick={() => void copy(saved.smartAddressId, "Smart Address copied")}>
          <Building2 size={20} />
          <span>
            <small>Fockis Smart Address</small>
            <strong>{saved.smartAddressId}</strong>
          </span>
          <Copy size={18} />
        </button>
      ) : null}
      {community ? (
        <PublicPlaceFacts place={community} />
      ) : selection.publicId ? (
        <Loader2 className="fkm-spin fkm-center" />
      ) : saved ? (
        <VerificationBox place={saved} onEdit={edit} />
      ) : (
        <div className="fkm-newplace">
          <button type="button" className="fkm-smart fkm-smart--new" onClick={edit}>
            <Plus size={20} />
            <span>
              <small>Private · only you and people you share with</small>
              <strong>Save as my Smart Address</strong>
            </span>
          </button>
          <button type="button" className="fkm-smart fkm-smart--new fkm-smart--public" onClick={() => startPublicPlace({ lat: selection.lat, lon: selection.lon, name: selection.name })}>
            <MapPinPlus size={20} />
            <span>
              <small>Shop, church, school… missing from the map?</small>
              <strong>Add this place for everyone</strong>
            </span>
          </button>
        </div>
      )}

      <ul className="fkm-facts">
        {area && !community && (
          <li>
            <MapPin size={19} /> {area}
          </li>
        )}
        <li>
          <Crosshair size={19} /> Plus Code {saved?.plusCode ?? plusCode(selection.lat, selection.lon)}
        </li>
        {landmark && (
          <li>
            <LandmarkIcon size={19} /> {relationLabel(landmark.relation)} {landmark.name}
          </li>
        )}
        {saved?.directions && (
          <li>
            <Navigation size={19} /> {saved.directions}
          </li>
        )}
        {selection.footprint && !saved && (
          <li className="fkm-muted">
            <Building2 size={19} /> Building outline from OpenStreetMap. Check it's the right one before saving.
          </li>
        )}
      </ul>

      <div className="fkm-actions">
        <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => void share()} disabled={busy}>
          {busy ? <Loader2 size={18} className="fkm-spin" /> : <Share2 size={18} />} Share Location
        </button>
        <button type="button" className="fkm-btn fkm-btn--outline" onClick={() => directionsTo({ lat: selection.lat, lon: selection.lon, label: saved?.label ?? selection.name })}>
          <Navigation size={18} /> Get Directions
        </button>
      </div>
      {saved?.shared && saved.shareExpiresAt && <p className="fkm-note">Shared by link until {new Date(saved.shareExpiresAt).toLocaleDateString()}.</p>}
    </section>
  );
}

/* ---------------------------------------------------------------- editor */

const KINDS: Array<[LocationKind, string]> = [
  ["home", "Home"],
  ["work", "Work"],
  ["family", "Family"],
  ["saved", "Saved place"],
];

export function SmartAddressEditor() {
  const editor = useMaps((s) => s.editor)!;
  const places = useMaps((s) => s.places);
  const country = useMaps((s) => s.country);
  const existing = places.find((p) => p.id === editor.id);
  const [label, setLabel] = useState(existing?.label ?? "");
  const [kind, setKind] = useState<LocationKind>(existing?.kind ?? editor.kind ?? (places.some((p) => p.kind === "home") ? "saved" : "home"));
  const [department, setDepartment] = useState(existing?.department ?? "");
  const [commune, setCommune] = useState(existing?.commune ?? "");
  const [section, setSection] = useState(existing?.communalSection ?? "");
  const [neighborhood, setNeighborhood] = useState(existing?.neighborhood ?? "");
  const [locality, setLocality] = useState(existing?.locality ?? "");
  const [street, setStreet] = useState(existing?.streetAddress ?? "");
  const [landmarks, setLandmarks] = useState<Landmark[]>(existing?.landmarks?.length ? existing.landmarks : [{ name: "", relation: "near" }]);
  const [directions, setDirections] = useState(existing?.directions ?? "");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const lookedUp = useRef("");

  // Fill the area fields from the pin (only fields the user hasn't typed in).
  useEffect(() => {
    const key = `${editor.lat.toFixed(4)},${editor.lon.toFixed(4)}`;
    if (lookedUp.current === key) return;
    lookedUp.current = key;
    const t = window.setTimeout(() => {
      mapsApi
        .reverse(editor.lat, editor.lon)
        .then((r) => {
          setDepartment((v) => v || HAITI_DEPARTMENTS.find((d) => r.department.toLowerCase().includes(d.toLowerCase())) || r.department);
          setCommune((v) => v || r.commune);
          setNeighborhood((v) => v || r.neighborhood);
          setLocality((v) => v || (r.locality !== r.commune ? r.locality : ""));
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
    if (!ok || !me) {
      setError(st().geoError || "Your location isn't available.");
      return;
    }
    st().set({ editor: { ...editor, lat: me.lat, lon: me.lon, footprint: null, osmId: "", captureMethod: "gps", accuracyM: Math.round(me.accuracy) } });
    st().set({ following: false });
    getMap()?.flyTo({ center: [me.lon, me.lat], zoom: 18 });
  };

  const save = async () => {
    setError("");
    if (!label.trim()) return setError("Give this place a name, like “My Home”.");
    const cleanLandmarks = landmarks.filter((l) => l.name.trim().length >= 2).map((l) => ({ ...l, name: l.name.trim() }));
    const payload = {
      kind,
      label: label.trim(),
      latitude: Number(editor.lat.toFixed(7)),
      longitude: Number(editor.lon.toFixed(7)),
      captureMethod: editor.captureMethod,
      accuracyM: editor.accuracyM ?? 0,
      building: editor.footprint ? { source: "osm" as const, osmId: editor.osmId ?? "", footprint: editor.footprint } : { source: "pin" as const },
      countryCode: country,
      department,
      commune,
      communalSection: section,
      neighborhood,
      locality,
      streetAddress: street,
      landmarks: cleanLandmarks,
      directions,
    };
    setSaving(true);
    try {
      const saved: SavedLocation = editor.id ? await mapsApi.updatePlace(editor.id, payload) : await mapsApi.createPlace(payload);
      await refreshPlaces();
      st().set({ editor: null, selected: { lat: saved.latitude, lon: saved.longitude, name: saved.label, source: "saved", saved, footprint: saved.building?.footprint ?? null } });
      st().toast(editor.id ? "Smart Address updated" : `Saved · ${saved.smartAddressId}`, "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this place.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="fkm-card fkm-editor" aria-label="Smart Address">
      <header className="fkm-card__head">
        <Building2 size={22} className="fkm-accent" />
        <h2>{editor.id ? "Edit Smart Address" : "New Smart Address"}</h2>
        <button type="button" className="fkm-icon" onClick={() => st().set({ editor: null })} aria-label="Cancel">
          <X size={20} />
        </button>
      </header>

      <div className="fkm-editor__scroll">
        <div className="fkm-step">
          <b>1</b>
          <div>
            <strong>Place the pin on your door or building</strong>
            <p className="fkm-muted">Tap the map, drag the pin, tap a building outline, or use your phone's GPS.</p>
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
                {locating ? <Loader2 size={16} className="fkm-spin" /> : <Crosshair size={16} />} Use my GPS
              </button>
              <span className="fkm-muted fkm-small">
                {editor.captureMethod === "gps" && editor.accuracyM ? `GPS accuracy ±${editor.accuracyM} m` : editor.footprint ? "Building selected" : "Pin placed by hand"}
              </span>
            </div>
          </div>
        </div>

        <div className="fkm-step">
          <b>2</b>
          <div className="fkm-fields">
            <label className="fkm-field fkm-field--wide">
              Name
              <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder="My Home" />
            </label>
            <div className="fkm-kinds fkm-field--wide" role="radiogroup" aria-label="Type">
              {KINDS.map(([value, text]) => (
                <button key={value} type="button" role="radio" aria-checked={kind === value} className={kind === value ? "is-on" : ""} onClick={() => setKind(value)}>
                  {value === "saved" ? <Star size={15} /> : value === "home" ? <Home size={15} /> : null} {text}
                </button>
              ))}
            </div>
            <label className="fkm-field">
              Department
              {country === "HT" ? (
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
              Commune
              <input value={commune} onChange={(e) => setCommune(e.target.value)} maxLength={80} placeholder="Delmas" />
            </label>
            <label className="fkm-field">
              Communal section
              <input value={section} onChange={(e) => setSection(e.target.value)} maxLength={80} placeholder="Optional" />
            </label>
            <label className="fkm-field">
              Neighborhood
              <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} placeholder="Delmas 33" />
            </label>
            <label className="fkm-field">
              Locality
              <input value={locality} onChange={(e) => setLocality(e.target.value)} maxLength={80} placeholder="Optional" />
            </label>
            <label className="fkm-field">
              Street & number
              <input value={street} onChange={(e) => setStreet(e.target.value)} maxLength={160} placeholder="Optional" />
            </label>
          </div>
        </div>

        <div className="fkm-step">
          <b>3</b>
          <div className="fkm-fields">
            <span className="fkm-field fkm-field--wide">Landmarks nearby</span>
            {landmarks.map((l, i) => (
              <div key={i} className="fkm-landmark fkm-field--wide">
                <select value={l.relation} onChange={(e) => setLandmarks((ls) => ls.map((x, j) => (j === i ? { ...x, relation: e.target.value as Landmark["relation"] } : x)))} aria-label="Relation">
                  {RELATIONS.map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  value={l.name}
                  maxLength={80}
                  placeholder="Église Baptiste de Delmas"
                  onChange={(e) => setLandmarks((ls) => ls.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  aria-label="Landmark"
                />
                <button type="button" className="fkm-icon" onClick={() => setLandmarks((ls) => ls.filter((_, j) => j !== i))} aria-label="Remove landmark" disabled={landmarks.length === 1}>
                  <X size={16} />
                </button>
              </div>
            ))}
            {landmarks.length < 5 && (
              <button type="button" className="fkm-link fkm-field--wide" onClick={() => setLandmarks((ls) => [...ls, { name: "", relation: "near" }])}>
                <Plus size={15} /> Add landmark
              </button>
            )}
            <label className="fkm-field fkm-field--wide">
              Directions for visitors and couriers
              <textarea value={directions} onChange={(e) => setDirections(e.target.value)} maxLength={500} rows={3} placeholder="Second house after the school, on the left. Blue gate." />
              <small className="fkm-muted">{directions.length}/500</small>
            </label>
          </div>
        </div>
      </div>

      <p className="fkm-editor__review">
        <BadgeCheck size={16} aria-hidden="true" />
        {editor.id
          ? "Moving the pin or changing the address sends it to Fockis staff for verification again."
          : "After you save, Fockis staff verify this address. You'll get a notification."}
      </p>
      {error && (
        <p className="fkm-error" role="alert">
          {error}
        </p>
      )}
      <div className="fkm-actions">
        <button type="button" className="fkm-btn fkm-btn--outline" onClick={() => st().set({ editor: null })}>
          Cancel
        </button>
        <button type="button" className="fkm-btn fkm-btn--primary" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 size={18} className="fkm-spin" /> : <Check size={18} />} {editor.id ? "Save changes" : "Save Smart Address"}
        </button>
      </div>
    </section>
  );
}
