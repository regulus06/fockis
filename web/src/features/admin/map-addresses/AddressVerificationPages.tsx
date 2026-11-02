import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  CircleAlert,
  Clock3,
  Copy,
  History,
  MapPin,
  MapPinned,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAdminNotificationStore } from "../store/adminNotificationStore";
import { useAdminAccess } from "../permissions/adminAccess";
import { PERMISSIONS } from "../permissions/permission.constants";
import { Card, Pager, PersonCell, Pill, SmEmpty, SmError, SmLoading, formatDateTime, timeAgo, useAdminQuery, type Tone } from "../support/components/SmParts";
import { adminError } from "../support/supportAdminApi";
import { addressAdminApi, type AddressDetail, type AddressStatus, type ReviewAction } from "./addressAdminApi";
import AddressReviewMap from "./AddressReviewMap";
import "../support/styles/SupportMod.scss";
import "./AddressVerification.scss";

/* ============================================================================
   ADMIN · MAPS · ADDRESS VERIFICATION
   /admin/map/addresses        queue (pending first, oldest first)
   /admin/map/addresses/:id    review one address
============================================================================ */

const STATUS: Record<AddressStatus, { label: string; tone: Tone; icon: typeof Clock3 }> = {
  pending: { label: "Pending", tone: "amber", icon: Clock3 },
  needs_info: { label: "Info needed", tone: "purple", icon: CircleAlert },
  verified: { label: "Verified", tone: "blue", icon: BadgeCheck },
  rejected: { label: "Rejected", tone: "red", icon: Ban },
};
const TABS: AddressStatus[] = ["pending", "needs_info", "verified", "rejected"];

const CAPTURE: Record<string, string> = { gps: "GPS on site", pin: "Pin on map", search: "From search", building: "Building on map" };
const RELATION: Record<string, string> = { near: "Near", next_to: "Next to", across_from: "Across from", behind: "Behind", after: "After", before: "Before" };
const HISTORY: Record<string, string> = {
  submitted: "Submitted by the owner",
  resubmitted: "Sent back for review by the owner",
  changed: "Owner changed a verified address",
  verified: "Verified",
  needs_info: "Asked the owner for more information",
  rejected: "Rejected",
};

export function AddressStatusPill({ status }: { status: AddressStatus }) {
  const s = STATUS[status] ?? STATUS.pending;
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

const placeLine = (a: { neighborhood?: string; locality?: string; commune?: string; department?: string; country?: string }) =>
  [a.neighborhood || a.locality, a.commune, a.department, a.country].filter(Boolean).join(", ");

/* ---------------------------------------------------------------- queue */

function QueuePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as AddressStatus | null) ?? "pending";
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

  const list = useAdminQuery(() => addressAdminApi.list({ status, q, country, page }), [status, q, country, page]);
  const counts = list.data?.counts;

  return (
    <Card title="Address Verification" icon={<MapPinned size={20} />}>
      <p className="fksm-muted fkav-intro">
        Every Smart Address people add comes here. Check the pin against the map and satellite imagery, the written details and nearby addresses, then verify it,
        ask the owner for more information, or reject it. The owner is notified each time.
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
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search FSA ID, name, Plus Code, neighbourhood…" aria-label="Search addresses" />
        </form>
        <input
          className="fksm-input fkav-cc"
          value={country}
          maxLength={2}
          placeholder="Country (HT)"
          aria-label="Country code"
          onChange={(e) => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
            if (v.length === 0 || v.length === 2) set("country", v || null);
            else {
              const next = new URLSearchParams(params);
              next.set("country", v);
              setParams(next, { replace: true });
            }
          }}
        />
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty
          icon={<MapPinned size={24} />}
          title={status === "pending" ? "No addresses waiting" : `No ${STATUS[status].label.toLowerCase()} addresses`}
          text={status === "pending" ? "New Smart Addresses appear here as soon as someone saves one." : undefined}
        />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Smart Address</th>
                  <th>Location</th>
                  <th>Owner</th>
                  <th>Captured</th>
                  <th>{status === "pending" ? "Waiting" : "Reviewed"}</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((a) => (
                  <tr key={a.id} className="is-clickable" onClick={() => navigate(`/admin/map/addresses/${a.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{a.label}</strong>
                        <span>{a.smartAddressId}</span>
                      </span>
                    </td>
                    <td>{placeLine(a) || a.plusCode}</td>
                    <td>
                      <PersonCell person={a.owner} fallback="Deleted account" />
                    </td>
                    <td>
                      {CAPTURE[a.captureMethod] ?? a.captureMethod}
                      {a.hasBuilding && <span className="fksm-muted"> · building</span>}
                    </td>
                    <td className="fksm-date">{timeAgo(status === "pending" ? a.requestedAt : a.reviewedAt ?? a.requestedAt)}</td>
                    <td>
                      <AddressStatusPill status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(p) => set("page", String(p))} />
        </>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- review */

const CHECKS = [
  "The pin is on a building or plot, not a road, field or water",
  "The neighbourhood and commune match where the pin is",
  "The landmarks and directions make sense for this spot",
  "It isn't a duplicate of a nearby address",
];

function DecisionCard({ address, onDone }: { address: AddressDetail; onDone: (a: AddressDetail) => void }) {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const { can } = useAdminAccess();
  const canVerify = can([PERMISSIONS.MAP_ADDRESSES_VERIFY]);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));

  useEffect(() => {
    setAction(null);
    setNote("");
    setChecked(CHECKS.map(() => false));
  }, [address.id, address.status]);

  if (!canVerify) {
    return (
      <Card title="Decision" icon={<ShieldCheck size={18} />}>
        <p className="fksm-muted">You can view addresses but not verify them (needs the “Verify Addresses” permission).</p>
      </Card>
    );
  }

  const submit = async () => {
    if (!action) return;
    if (action !== "verify" && note.trim().length < 5) {
      toast("error", action === "reject" ? "Tell the owner why it can't be verified." : "Tell the owner what's missing.");
      return;
    }
    setBusy(true);
    try {
      const updated = await addressAdminApi.review(address.id, action, note.trim());
      toast("success", action === "verify" ? "Address verified — the owner was notified." : action === "reject" ? "Address rejected — the owner was notified." : "Request sent to the owner.");
      onDone(updated);
    } catch (error) {
      toast("error", adminError(error, "Couldn't save the decision."));
    } finally {
      setBusy(false);
    }
  };

  const options: { value: ReviewAction; label: string; hide?: boolean }[] = [
    { value: "verify", label: "Verify", hide: address.status === "verified" },
    { value: "needs_info", label: "Ask for info", hide: address.status === "needs_info" },
    { value: "reject", label: address.status === "verified" ? "Revoke" : "Reject", hide: address.status === "rejected" },
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
              className={`fksm-btn fksm-btn--sm ${action === o.value ? (o.value === "reject" ? "fksm-btn--danger" : "fksm-btn--primary") : "fksm-btn--secondary"}`}
              onClick={() => setAction(o.value)}
            >
              {o.label}
            </button>
          ))}
      </div>
      {action && (
        <div className="fksm-field" style={{ marginTop: 12 }}>
          <label htmlFor="fkav-note">
            {action === "verify" ? "Note to the owner (optional)" : action === "reject" ? "Why can't it be verified?" : "What does the owner need to add or fix?"}
            {action !== "verify" && <span className="fksm-required"> *</span>}
          </label>
          <textarea
            id="fkav-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={action === "reject" ? "e.g. The pin is in the middle of the road." : action === "needs_info" ? "e.g. Please add a landmark and the colour of the gate." : ""}
          />
          <small className="fksm-muted">The owner sees this message.</small>
        </div>
      )}
      {action && (
        <button
          type="button"
          className={`fksm-btn ${action === "reject" ? "fksm-btn--danger" : "fksm-btn--primary"} fksm-btn--block`}
          style={{ marginTop: 12 }}
          disabled={busy || (action === "verify" && !checked.every(Boolean))}
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : action === "verify" ? "Verify address" : action === "reject" ? (address.status === "verified" ? "Revoke verification" : "Reject address") : "Send request to owner"}
        </button>
      )}
      {action === "verify" && !checked.every(Boolean) && <p className="fksm-muted fkav-hint">Tick every check to verify.</p>}
    </Card>
  );
}

function DetailPage() {
  const { id = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const detail = useAdminQuery(() => addressAdminApi.detail(id), [id]);
  const a = detail.data;

  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => toast("success", "Copied"));
  };

  return (
    <div className="fksm fkav">
      <Link to="/admin/map/addresses" className="fksm-back">
        <ArrowLeft size={16} /> Back to Address Verification
      </Link>
      {detail.loading && !a ? (
        <SmLoading />
      ) : detail.error || !a ? (
        <SmError message={detail.error ?? "Address not found."} onRetry={detail.refetch} />
      ) : (
        <div className="fksm-detail fkav-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{a.label}</h2>
                  <div className="fksm-detail-head__meta">
                    <button type="button" className="fkav-copy" onClick={() => copy(a.smartAddressId)} title="Copy">
                      {a.smartAddressId} <Copy size={13} />
                    </button>
                    ·<span>{a.kind}</span>·<span>Submitted {formatDateTime(a.requestedAt)}</span>
                  </div>
                </div>
                <AddressStatusPill status={a.status} />
              </div>
              {a.note && a.status !== "pending" && (
                <p className={`fksm-notice ${a.status === "rejected" ? "fksm-notice--error" : a.status === "verified" ? "fksm-notice--info" : "fksm-notice--warn"}`} style={{ marginTop: 12 }}>
                  Message to owner: “{a.note}”{a.reviewedBy ? ` — ${a.reviewedBy.username ? `@${a.reviewedBy.username}` : a.reviewedBy.name}` : ""}
                </p>
              )}
              <AddressReviewMap address={a} />
            </Card>

            <Card title="Address details" icon={<MapPin size={18} />}>
              <dl className="fksm-facts fkav-facts">
                <div>
                  <dt>Coordinates</dt>
                  <dd>
                    <button type="button" className="fkav-copy" onClick={() => copy(`${a.latitude.toFixed(6)}, ${a.longitude.toFixed(6)}`)}>
                      {a.latitude.toFixed(6)}, {a.longitude.toFixed(6)} <Copy size={13} />
                    </button>
                  </dd>
                </div>
                <div><dt>Plus Code</dt><dd>{a.plusCode}</dd></div>
                <div>
                  <dt>How it was captured</dt>
                  <dd>
                    {CAPTURE[a.captureMethod] ?? a.captureMethod}
                    {a.captureMethod === "gps" && a.accuracyM ? ` (±${Math.round(a.accuracyM)} m)` : ""}
                  </dd>
                </div>
                <div><dt>Building</dt><dd>{a.building?.source === "osm" ? `Outline selected (OSM ${a.building.osmId || "building"})` : "Pin only, no building outline"}</dd></div>
                {a.streetAddress && <div><dt>Street address</dt><dd>{a.streetAddress}</dd></div>}
                {(a.neighborhood || a.locality) && <div><dt>Neighbourhood</dt><dd>{[a.neighborhood, a.locality].filter(Boolean).join(" · ")}</dd></div>}
                {a.communalSection && <div><dt>Communal section</dt><dd>{a.communalSection}</dd></div>}
                {a.commune && <div><dt>Commune</dt><dd>{a.commune}</dd></div>}
                {a.department && <div><dt>Department</dt><dd>{a.department}</dd></div>}
                <div><dt>Country</dt><dd>{[a.country, a.countryCode].filter(Boolean).join(" · ") || "—"}</dd></div>
              </dl>
              <h3 className="fkav-sub">Landmarks</h3>
              {a.landmarks.length ? (
                <ul className="fkav-landmarks">
                  {a.landmarks.map((l, i) => (
                    <li key={i}>
                      <span>{RELATION[l.relation] ?? l.relation}</span> {l.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No landmarks given.</p>
              )}
              <h3 className="fkav-sub">Directions</h3>
              {a.directions ? <p className="fkav-directions">{a.directions}</p> : <p className="fksm-muted">No written directions.</p>}
            </Card>

            <Card title="History" icon={<History size={18} />}>
              <ol className="fksm-timeline">
                {a.history.map((h, i) => (
                  <li key={i}>
                    <span className={`fksm-timeline__icon${h.action === "rejected" ? " fksm-timeline__icon--red" : h.action === "needs_info" || h.action === "changed" ? " fksm-timeline__icon--amber" : h.action === "verified" ? " fksm-timeline__icon--green" : ""}`}>
                      {h.action === "verified" ? <BadgeCheck size={17} /> : h.action === "rejected" ? <Ban size={17} /> : h.action === "needs_info" ? <CircleAlert size={17} /> : <MapPin size={17} />}
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
            <DecisionCard address={a} onDone={(updated) => detail.setData(updated)} />

            <Card title="Owner" icon={<UserRound size={18} />}>
              <PersonCell person={a.owner} fallback="Deleted account" />
              <dl className="fksm-facts" style={{ marginTop: 10 }}>
                {a.ownerStats.memberSince && <div><dt>Member since</dt><dd>{new Date(a.ownerStats.memberSince).toLocaleDateString()}</dd></div>}
                <div><dt>Saved addresses</dt><dd>{a.ownerStats.addresses}</dd></div>
                <div><dt>Verified</dt><dd>{a.ownerStats.verified}</dd></div>
                <div><dt>Rejected</dt><dd>{a.ownerStats.rejected}</dd></div>
              </dl>
              {a.owner && (
                <Link className="fksm-link" to={`/admin/users/${a.owner.id}`} style={{ display: "inline-block", marginTop: 8 }}>
                  Open user profile
                </Link>
              )}
            </Card>

            <Card title="Within 30 m" icon={<Building2 size={18} />}>
              {a.nearby.length ? (
                <ul className="fkav-nearby">
                  {a.nearby.map((n) => (
                    <li key={n.id}>
                      <Link to={`/admin/map/addresses/${n.id}`} className="fksm-link">
                        {n.smartAddressId}
                      </Link>
                      <span>
                        {n.label} · {n.distanceM} m{n.sameOwner ? " · same owner" : ""}
                      </span>
                      <AddressStatusPill status={n.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No other saved addresses nearby.</p>
              )}
              {a.nearby.some((n) => n.sameOwner) && <p className="fksm-notice fksm-notice--warn" style={{ marginTop: 8 }}>The same owner has another address here — it may be a duplicate.</p>}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddressVerificationRoutes() {
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
