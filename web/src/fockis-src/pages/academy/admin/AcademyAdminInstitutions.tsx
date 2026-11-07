import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/academy/market/Icon";
import { Badge, Stat } from "../../../components/academy/market/Shared";
import { FaModal } from "../../../components/academy/market/FaBlocks";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { mediaUrl } from "../../../lib/studioApi";
import { INSTITUTION_TYPE_LABEL, STATUS_LABEL, STATUS_TONE, adminSchoolsApi, type AdminInstitution, type InstitutionStatus } from "../../../lib/institutionsApi";
import "../../../styles/academy-market.scss";

/**
 * /academy/admin/institutions — Fockis Academy administrators review schools:
 * approve, reject (with reason), block (with reason) and unblock.
 * Blocking hides the school's classes and stops its students from signing in.
 */
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const FILTERS: (InstitutionStatus | "")[] = ["pending", "approved", "rejected", "blocked", ""];

export default function AcademyAdminInstitutions() {
  const [status, setStatus] = useState<InstitutionStatus | "">("pending");
  const [q, setQ] = useState("");
  const list = useAcademyLoad(() => adminSchoolsApi.list(status || undefined), [status]);
  const [openId, setOpenId] = useState<string | null>(null);

  const totals = list.state.status === "ready" ? list.state.data.totals : {};
  const items = (list.state.status === "ready" ? list.state.data.items : []).filter((i) =>
    `${i.name} ${i.domain} ${i.owner?.email ?? ""} ${i.city ?? ""} ${i.country ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <div className="fa-root fa-adm-inst">
      <div className="fa-stats fa-stats--4">
        <Stat icon="clock" value={String(totals.pending ?? 0)} label="Waiting for review" tone="amber" />
        <Stat icon="verified" value={String(totals.approved ?? 0)} label="Approved" tone="green" />
        <Stat icon="help" value={String(totals.rejected ?? 0)} label="Rejected" tone="red" />
        <Stat icon="lock" value={String(totals.blocked ?? 0)} label="Blocked" tone="purple" />
      </div>
      <div className="fa-card fa-pad">
        <div className="fa-cardhead">
          <div className="fa-seg fa-seg--sm">
            {FILTERS.map((f) => (
              <button key={f || "all"} className={status === f ? "is-on" : ""} onClick={() => setStatus(f)}>
                {f ? STATUS_LABEL[f] : "All"}
              </button>
            ))}
          </div>
          <label className="fa-search">
            <Icon name="search" size={14} />
            <input value={q} placeholder="Name, domain or owner email" onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {list.state.status === "loading" && <p className="fa-muted">Loading…</p>}
        {list.state.status === "error" && <p className="fa-error">{list.state.error}</p>}
        {list.state.status === "ready" && items.length === 0 && <p className="fa-muted">Nothing here.</p>}
        {items.length > 0 && (
          <div className="fa-tablewrap">
            <table className="fa-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Domain</th>
                  <th>Owner</th>
                  <th>Students</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i._id}>
                    <td>
                      <div className="fa-adm-inst__name">
                        <span className="fa-sch-logo">{i.logoUrl ? <img src={mediaUrl(i.logoUrl)} alt="" /> : <Icon name="building" size={16} />}</span>
                        <div>
                          <b>{i.name}</b>
                          <small className="fa-muted">
                            {INSTITUTION_TYPE_LABEL[i.type]}
                            {i.city || i.country ? ` · ${[i.city, i.country].filter(Boolean).join(", ")}` : ""}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code>{i.domain}</code>
                    </td>
                    <td>
                      {i.owner?.name}
                      <br />
                      <small className="fa-muted">{i.owner?.email}</small>
                    </td>
                    <td>{i.students}</td>
                    <td>{fmt(i.createdAt)}</td>
                    <td>
                      <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                    </td>
                    <td>
                      <button className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => setOpenId(i._id)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {openId && <ReviewModal id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} />}
    </div>
  );
}

function ReviewModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const d = useAcademyLoad(() => adminSchoolsApi.get(id), [id]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(action: "approve" | "reject" | "block" | "unblock") {
    if ((action === "reject" || action === "block") && !reason.trim()) return setErr("Write the reason — the school will see it.");
    setBusy(true);
    setErr(null);
    try {
      const next =
        action === "approve"
          ? await adminSchoolsApi.approve(id)
          : action === "reject"
            ? await adminSchoolsApi.reject(id, reason.trim())
            : action === "block"
              ? await adminSchoolsApi.block(id, reason.trim())
              : await adminSchoolsApi.unblock(id);
      d.setData(() => next);
      setReason("");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  const i: AdminInstitution | null = d.state.status === "ready" ? d.state.data : null;
  return (
    <FaModal title={i ? i.name : "School"} onClose={onClose}>
      {d.state.status === "loading" && <p className="fa-muted">Loading…</p>}
      {d.state.status === "error" && <p className="fa-error">{d.state.error}</p>}
      {i && (
        <div className="fa-adm-review">
          <div className="fa-st-head__meta">
            <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
            <code>{i.domain}</code>
            <span>{INSTITUTION_TYPE_LABEL[i.type]}</span>
          </div>
          {i.statusReason && <p className="fa-note">Reason on file: {i.statusReason}</p>}
          <dl className="fa-verify-details">
            <dt>Owner</dt>
            <dd>
              {i.owner?.name} · {i.owner?.email}
            </dd>
            <dt>Location</dt>
            <dd>{[i.address, i.city, i.country].filter(Boolean).join(", ") || "—"}</dd>
            <dt>Contact</dt>
            <dd>{[i.contactEmail, i.phone].filter(Boolean).join(" · ") || "—"}</dd>
            <dt>Website</dt>
            <dd>
              {i.website ? (
                <a href={i.website} target="_blank" rel="noreferrer">
                  {i.website}
                </a>
              ) : (
                "—"
              )}
            </dd>
            <dt>Registration no.</dt>
            <dd>{i.registrationNumber || "—"}</dd>
            <dt>Proof document</dt>
            <dd>
              {i.proofUrl ? (
                <a href={i.proofUrl} target="_blank" rel="noreferrer">
                  <Icon name="file" size={13} /> {i.proofFileName || "Open PDF"}
                </a>
              ) : (
                "Not provided"
              )}
            </dd>
            <dt>Students / classes</dt>
            <dd>
              {i.students} / {i.classes ?? 0}
            </dd>
            <dt>Submitted</dt>
            <dd>{fmt(i.createdAt)}</dd>
          </dl>
          {i.description && <p className="fa-muted fa-prewrap">{i.description}</p>}
          {i.history?.length > 0 && (
            <ul className="fa-sch-history">
              {[...i.history].reverse().map((h, k) => (
                <li key={k}>
                  <b>{h.action}</b> {fmt(h.at)}
                  {h.byName ? ` · ${h.byName}` : ""}
                  {h.reason ? ` — ${h.reason}` : ""}
                </li>
              ))}
            </ul>
          )}
          {i.status !== "blocked" && i.status !== "approved" && (
            <label className="fa-field">
              <span>Reason (required to reject or block — the school sees it)</span>
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          )}
          {i.status === "approved" && (
            <label className="fa-field">
              <span>Reason for blocking (the school sees it)</span>
              <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          )}
          {err && <p className="fa-error">{err}</p>}
          <div className="fa-adm-review__btns">
            {(i.status === "pending" || i.status === "rejected") && (
              <button className="fa-btn fa-btn--primary fa-btn--sm" disabled={busy} onClick={() => run("approve")}>
                <Icon name="check" size={13} /> Approve
              </button>
            )}
            {i.status === "pending" && (
              <button className="fa-btn fa-btn--outline fa-btn--sm" disabled={busy} onClick={() => run("reject")}>
                Reject
              </button>
            )}
            {i.status !== "blocked" && (
              <button className="fa-btn fa-btn--danger fa-btn--sm" disabled={busy} onClick={() => run("block")}>
                <Icon name="lock" size={13} /> Block
              </button>
            )}
            {i.status === "blocked" && (
              <button className="fa-btn fa-btn--primary fa-btn--sm" disabled={busy} onClick={() => run("unblock")}>
                Unblock
              </button>
            )}
            {i.status === "approved" && (
              <Link className="fa-link" to={`/academy/schools/${i.slug}`} target="_blank">
                Public page
              </Link>
            )}
          </div>
        </div>
      )}
    </FaModal>
  );
}
