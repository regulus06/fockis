import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Ban, Building2, Clock3, Copy, History, MapPin, MapPinPlus, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { useAdminNotificationStore } from "../store/adminNotificationStore";
import { useAdminAccess } from "../permissions/adminAccess";
import { PERMISSIONS } from "../permissions/permission.constants";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, formatDateTime, timeAgo, useAdminQuery, type Tone } from "../support/components/SmParts";
import { adminError } from "../support/supportAdminApi";
import { categoryLabel } from "../../../map/maps/mapsApi";
import { publicPlacesAdminApi, type PublicPlaceDetail, type PublicPlaceStatus, type PublicReviewAction } from "./publicPlacesAdminApi";
import AddressReviewMap from "./AddressReviewMap";
import "../support/styles/SupportMod.scss";
import "./AddressVerification.scss";

/* ============================================================================
   ADMIN · MAPS · PLACES PEOPLE ADDED
   /admin/map/places        queue (waiting first, oldest first)
   /admin/map/places/:id    review one place
   Approved places show on everyone's map and in search.
============================================================================ */

const STATUS: Record<PublicPlaceStatus, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "amber" },
  approved: { label: "On the map", tone: "blue" },
  rejected: { label: "Rejected", tone: "red" },
  removed: { label: "Removed", tone: "red" },
};
const TABS: PublicPlaceStatus[] = ["pending", "approved", "rejected", "removed"];
const HISTORY: Record<string, string> = {
  submitted: "Added by the user",
  edited: "Changed by the user (back to review)",
  approved: "Approved",
  rejected: "Rejected",
  removed: "Removed from the map",
  withdrawn: "Removed by the user",
};

function StatusPill({ status }: { status: PublicPlaceStatus }) {
  const s = STATUS[status] ?? STATUS.pending;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

const placeLine = (p: { addressText?: string; neighborhood?: string; commune?: string; department?: string; countryCode?: string }) =>
  [p.neighborhood, p.commune, p.department, p.countryCode].filter(Boolean).join(", ");

/* ---------------------------------------------------------------- queue */

function QueuePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as PublicPlaceStatus | null) ?? "pending";
  const q = params.get("q") ?? "";
  const country = params.get("country") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(q);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next, { replace: true });
  };

  const list = useAdminQuery(() => publicPlacesAdminApi.list({ status, q, country, page }), [status, q, country, page]);
  const counts = list.data?.counts;

  return (
    <Card title="Places added to the map" icon={<MapPinPlus size={20} />}>
      <p className="fksm-muted fkav-intro">
        Shops, churches, schools, clinics and landmarks people add. Check the pin against the satellite view, the name and the details, then approve it (everyone sees it on the map
        and in search) or reject it with a reason. The person who added it is notified. <Link className="fksm-link" to="/admin/map/addresses">Smart Address verification →</Link>
      </p>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={status === t} className={status === t ? "is-active" : ""} onClick={() => set("status", t === "pending" ? null : t)}>
            {STATUS[t].label}
            {counts && <span className={`fkav-count${t === "pending" && counts.pending ? " is-hot" : ""}`}>{counts[t].toLocaleString()}</span>}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set("q", draft.trim() || null);
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search name, neighbourhood, commune…" aria-label="Search places" />
        </form>
        <input
          className="fksm-input fkav-cc"
          value={country}
          maxLength={2}
          placeholder="Country (HT)"
          aria-label="Country code"
          onChange={(e) => set("country", e.target.value.toUpperCase().replace(/[^A-Z]/g, "") || null)}
        />
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty
          icon={<MapPinPlus size={24} />}
          title={status === "pending" ? "No places waiting" : `No ${STATUS[status].label.toLowerCase()} places`}
          text={status === "pending" ? "Places appear here as soon as someone adds one." : undefined}
        />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Location</th>
                  <th>Added by</th>
                  <th>{status === "pending" ? "Waiting" : "Reviewed"}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((p) => (
                  <tr key={p.id} className="is-clickable" onClick={() => navigate(`/admin/map/places/${p.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{p.name}</strong>
                        <span>{categoryLabel(p.category)}</span>
                      </span>
                    </td>
                    <td>{placeLine(p) || `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`}</td>
                    <td>
                      <PersonCell person={p.addedBy} fallback="Deleted account" />
                    </td>
                    <td className="fksm-date">{timeAgo(status === "pending" ? p.submittedAt : (p.reviewedAt ?? p.submittedAt))}</td>
                    <td>
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set("page", String(n))} />
        </>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- review */

const CHECKS = [
  "The pin is on the place itself (its entrance or building), not on a road",
  "The name and category look real, not an advert or a joke",
  "It isn't already on the map nearby",
  "Phone, website and description contain nothing offensive or personal",
];

function DecisionCard({ place, onDone }: { place: PublicPlaceDetail; onDone: (p: PublicPlaceDetail) => void }) {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { can } = useAdminAccess();
  const canDecide = can([PERMISSIONS.MAP_ADDRESSES_VERIFY]);
  const [action, setAction] = useState<PublicReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));

  useEffect(() => {
    setAction(null);
    setNote("");
    setChecked(CHECKS.map(() => false));
  }, [place.id, place.status]);

  if (!canDecide) {
    return (
      <Card title="Decision" icon={<ShieldCheck size={18} />}>
        <p className="fksm-muted">You can view places but not approve them (needs the “Verify Addresses” permission).</p>
      </Card>
    );
  }

  const submit = async () => {
    if (!action) return;
    if (action === "reject" && note.trim().length < 3) {
      toast("error", "Tell the person why the place can't be added.");
      return;
    }
    setBusy(true);
    try {
      const updated = await publicPlacesAdminApi.review(place.id, action, note.trim());
      toast("success", action === "approve" ? "Approved — the place is now on the map." : action === "reject" ? "Rejected — the person was notified." : "Removed from the map.");
      onDone(updated);
    } catch (error) {
      toast("error", adminError(error, "Couldn't save the decision."));
    } finally {
      setBusy(false);
    }
  };

  const options: { value: PublicReviewAction; label: string; hide?: boolean }[] = [
    { value: "approve", label: "Approve", hide: place.status === "approved" },
    { value: "reject", label: "Reject", hide: place.status === "rejected" || place.status === "approved" },
    { value: "remove", label: "Remove from map", hide: place.status === "removed" || place.status === "pending" },
  ];

  return (
    <Card title="Decision" icon={<ShieldCheck size={18} />}>
      <ul className="fkav-checks" aria-label="Checklist">
        {CHECKS.map((c, i) => (
          <li key={c}>
            <label className="fksm-check">
              <input type="checkbox" checked={checked[i]} onChange={(e) => setChecked((v) => v.map((x, j) => (j === i ? e.target.checked : x)))} />
              <span>{c}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="fkav-actions" role="group" aria-label="Decision">
        {options
          .filter((o) => !o.hide)
          .map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={action === o.value}
              className={`fksm-btn fksm-btn--sm ${action === o.value ? (o.value === "approve" ? "fksm-btn--primary" : "fksm-btn--danger") : "fksm-btn--secondary"}`}
              onClick={() => setAction(o.value)}
            >
              {o.label}
            </button>
          ))}
      </div>
      {action && (
        <div className="fksm-field" style={{ marginTop: 12 }}>
          <label htmlFor="fkpp-note">
            {action === "approve" ? "Note to the person (optional)" : action === "reject" ? "Why can't it be added?" : "Why is it being removed? (optional)"}
            {action === "reject" && <span className="fksm-required"> *</span>}
          </label>
          <textarea
            id="fkpp-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={action === "reject" ? "e.g. The pin is on the road — move it to the entrance." : action === "remove" ? "e.g. The shop has closed." : ""}
          />
          <small className="fksm-muted">The person who added the place sees this message.</small>
        </div>
      )}
      {action && (
        <button
          type="button"
          className={`fksm-btn ${action === "approve" ? "fksm-btn--primary" : "fksm-btn--danger"} fksm-btn--block`}
          style={{ marginTop: 12 }}
          disabled={busy || (action === "approve" && !checked.every(Boolean))}
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : action === "approve" ? "Approve and show on the map" : action === "reject" ? "Reject place" : "Remove from the map"}
        </button>
      )}
      {action === "approve" && !checked.every(Boolean) && <p className="fksm-muted fkav-hint">Tick every check to approve.</p>}
    </Card>
  );
}

function DetailPage() {
  const { id = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const detail = useAdminQuery(() => publicPlacesAdminApi.detail(id), [id]);
  const p = detail.data;

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => toast("success", "Copied"));
  };

  return (
    <div className="fksm fkav">
      <Link to="/admin/map/places" className="fksm-back">
        <ArrowLeft size={16} /> Back to places added
      </Link>
      {detail.loading && !p ? (
        <SmLoading />
      ) : detail.error || !p ? (
        <SmError message={detail.error ?? "Place not found."} onRetry={detail.refetch} />
      ) : (
        <div className="fksm-detail fkav-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{p.name}</h2>
                  <div className="fksm-detail-head__meta">
                    <span>{categoryLabel(p.category)}</span>·<span>Added {formatDateTime(p.submittedAt)}</span>
                  </div>
                </div>
                <StatusPill status={p.status} />
              </div>
              {p.reviewNote && p.status !== "pending" && (
                <p className={`fksm-notice ${p.status === "approved" ? "fksm-notice--info" : "fksm-notice--error"}`} style={{ marginTop: 12 }}>
                  Message sent: “{p.reviewNote}”
                </p>
              )}
              <AddressReviewMap address={{ label: p.name, latitude: p.latitude, longitude: p.longitude, nearby: p.nearby.map((n) => ({ ...n, label: n.name })) }} />
            </Card>

            <Card title="Details" icon={<MapPin size={18} />}>
              <dl className="fksm-facts fkav-facts">
                <div>
                  <dt>Coordinates</dt>
                  <dd>
                    <button type="button" className="fkav-copy" onClick={() => copy(`${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`)}>
                      {p.latitude.toFixed(6)}, {p.longitude.toFixed(6)} <Copy size={13} />
                    </button>
                  </dd>
                </div>
                {p.addressText && <div><dt>Address / directions</dt><dd>{p.addressText}</dd></div>}
                {p.neighborhood && <div><dt>Neighbourhood</dt><dd>{p.neighborhood}</dd></div>}
                {p.commune && <div><dt>Commune</dt><dd>{p.commune}</dd></div>}
                {p.department && <div><dt>Department</dt><dd>{p.department}</dd></div>}
                <div><dt>Country</dt><dd>{p.countryCode || "—"}</dd></div>
                {p.phone && <div><dt>Phone</dt><dd>{p.phone}</dd></div>}
                {p.openingHours && <div><dt>Hours</dt><dd>{p.openingHours}</dd></div>}
                {p.website && (
                  <div>
                    <dt>Website</dt>
                    <dd>
                      <a className="fksm-link" href={p.website} target="_blank" rel="noopener noreferrer nofollow">
                        {p.website}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              <h3 className="fkav-sub">Description</h3>
              {p.description ? <p className="fkav-directions">{p.description}</p> : <p className="fksm-muted">No description.</p>}
            </Card>

            <Card title="History" icon={<History size={18} />}>
              <ol className="fksm-timeline">
                {p.history.map((h, i) => (
                  <li key={i}>
                    <span
                      className={`fksm-timeline__icon${h.action === "rejected" || h.action === "removed" || h.action === "withdrawn" ? " fksm-timeline__icon--red" : h.action === "edited" ? " fksm-timeline__icon--amber" : h.action === "approved" ? " fksm-timeline__icon--green" : ""}`}
                    >
                      {h.action === "approved" ? <BadgeCheck size={17} /> : h.action === "rejected" ? <Ban size={17} /> : h.action === "removed" || h.action === "withdrawn" ? <Trash2 size={17} /> : h.action === "edited" ? <Clock3 size={17} /> : <MapPin size={17} />}
                    </span>
                    <div>
                      <strong>{HISTORY[h.action] ?? h.action}</strong>
                      <p>{h.by ? (h.by.username ? `@${h.by.username}` : h.by.name) : "System"}</p>
                      {h.note && <p>“{h.note}”</p>}
                    </div>
                    <time dateTime={h.at ?? undefined}>{formatDateTime(h.at)}</time>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="fksm-stack">
            <DecisionCard place={p} onDone={(updated) => detail.setData(updated)} />

            <Card title="Added by" icon={<UserRound size={18} />}>
              <PersonCell person={p.addedBy} fallback="Deleted account" />
              <dl className="fksm-facts" style={{ marginTop: 10 }}>
                <div><dt>Places of theirs on the map</dt><dd>{p.addedByApprovedCount}</dd></div>
              </dl>
              {p.addedBy && (
                <Link className="fksm-link" to={`/admin/users/${p.addedBy.id}`} style={{ display: "inline-block", marginTop: 8 }}>
                  Open user profile
                </Link>
              )}
            </Card>

            <Card title="Within 80 m" icon={<Building2 size={18} />}>
              {p.nearby.length ? (
                <ul className="fkav-nearby">
                  {p.nearby.map((n) => (
                    <li key={n.id}>
                      <Link to={`/admin/map/places/${n.id}`} className="fksm-link">
                        {n.name}
                      </Link>
                      <span>
                        {categoryLabel(n.category)} · {n.distanceM} m{n.sameName ? " · same name" : ""}
                      </span>
                      <StatusPill status={n.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No other added places nearby.</p>
              )}
              {p.nearby.some((n) => n.sameName) && <p className="fksm-notice fksm-notice--warn" style={{ marginTop: 8 }}>A place with the same name is already nearby — it may be a duplicate.</p>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicPlacesReviewRoutes() {
  return (
    <Routes>
      <Route
        index
        element={
          <div className="fksm fkav">
            <QueuePage />
          </div>
        }
      />
      <Route path=":id" element={<DetailPage />} />
    </Routes>
  );
}
