/**
 * AdminSupport.tsx — Support & Donations (history, refunds, monthly totals,
 * campaigns, CSV export) and Media Requests (tips, coverage, interviews…).
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Download, ImagePlus, Inbox, Loader2, Lock, Pencil, Plus } from "lucide-react";

import { Empty, Modal, Skeleton, Thumb } from "../NewsParts";
import { REQUEST_STATUS_LABELS, REQUEST_TYPES, fmtDate, money, newsApi, newsError, timeAgo, type Campaign, type DonationsAdmin, type RequestDetail, type RequestRow, type TeamView } from "../newsApi";
import { PageTitle, useAdmin } from "./AdminShell";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function csv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(["﻿" + [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================================================================
 * Donations & campaigns
 * ========================================================================== */

export function DonationsPage() {
  const { outlet, can, notify } = useAdmin();
  const [filter, setFilter] = useState<{ frequency?: string; status?: string }>({});
  const [d, setD] = useState<DonationsAdmin | null>(null);
  const [camps, setCamps] = useState<{ canManage: boolean; items: Campaign[] } | null>(null);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [error, setError] = useState("");
  const load = () => {
    newsApi
      .donations(outlet.id, filter)
      .then(setD)
      .catch((err) => setError(newsError(err)));
    newsApi
      .campaigns(outlet.id)
      .then(setCamps)
      .catch(() => setCamps({ canManage: false, items: [] }));
  };
  useEffect(load, [outlet.id, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...(d?.monthly.map((m) => m.total) ?? [1]));
  const cur = d?.currency ?? "USD";

  return (
    <>
      <PageTitle
        title="Support & Donations"
        sub="Reader support processed by Fockis payments (Stripe). Figures come from verified payments only."
        actions={
          <button
            type="button"
            className="nm-btn nm-btn--ghost"
            onClick={async () => {
              try {
                const r = await newsApi.exportDonations(outlet.id);
                csv(r.items, `${outlet.slug}-donations.csv`);
              } catch (err) {
                notify("error", newsError(err));
              }
            }}
          >
            <Download /> Export CSV
          </button>
        }
      />
      {error && <p className="nm-form-error">{error}</p>}
      {!d && !error && <Skeleton h={200} />}
      {d && (
        <>
          <div className="nma-stats">
            <div className="nma-stat">
              <span>
                <small>Total donations</small>
                <b>{money(d.summary.total, cur)}</b>
                <em>{d.summary.count} gifts</em>
              </span>
            </div>
            <div className="nma-stat">
              <span>
                <small>One-time</small>
                <b>{money(d.summary.oneTime, cur)}</b>
              </span>
            </div>
            <div className="nma-stat">
              <span>
                <small>Recurring</small>
                <b>{money(d.summary.recurring, cur)}</b>
                <em>{d.summary.activePledges} active pledges</em>
              </span>
            </div>
          </div>
          <section className="nm-card">
            <h2 className="nm-card__title">Monthly totals — {new Date().getFullYear()}</h2>
            <div className="nma-bars nma-bars--months">
              {d.monthly.map((m) => (
                <span key={m.month} title={money(m.total, cur)}>
                  <i style={{ height: `${Math.max(2, Math.round((m.total / max) * 100))}%` }} />
                  <small>{MONTHS[m.month - 1]}</small>
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="nm-section">
        <header className="nm-sechead">
          <h2>Campaigns</h2>
          {camps?.canManage && (
            <button type="button" className="nm-btn nm-btn--primary nm-btn--sm" onClick={() => setEditing("new")}>
              <Plus /> New campaign
            </button>
          )}
        </header>
        {camps && camps.items.length === 0 && <p className="nm-muted">No campaigns yet. Create one for a specific goal, like new equipment.</p>}
        <div className="nm-grid3">
          {camps?.items.map((c) => (
            <article key={c.id} className="nm-card nma-camp">
              <Thumb src={c.coverUrl} className="nma-camp__img" />
              <div className="nma-camp__body">
                <b>{c.title}</b>
                <span className={`nma-pill nma-pill--${c.status === "active" ? "green" : "grey"}`}>{c.status}</span>
                <div className="nm-progress nm-progress--green">
                  <span style={{ width: `${c.progress}%` }} />
                </div>
                <small>
                  {money(c.raised, c.currency)} of {money(c.goal, c.currency)} · {c.supporters} supporters{c.deadline ? ` · ends ${fmtDate(c.deadline)}` : ""}
                </small>
                {camps.canManage && (
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => setEditing(c)}>
                    <Pencil /> Edit / post update
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="nm-section">
        <header className="nm-sechead">
          <h2>Donation history</h2>
          <div className="nm-row-actions">
            <select className="nm-input nm-input--sm" value={filter.frequency ?? ""} onChange={(ev) => setFilter({ ...filter, frequency: ev.target.value || undefined })} aria-label="Frequency">
              <option value="">All types</option>
              <option value="once">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
            </select>
            <select className="nm-input nm-input--sm" value={filter.status ?? ""} onChange={(ev) => setFilter({ ...filter, status: ev.target.value || undefined })} aria-label="Status">
              <option value="">Paid & refunded</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
        </header>
        <p className="nm-muted nm-small">
          <Lock /> Donor names are shown only when the donor chose to display them.
        </p>
        {d && d.items.length === 0 && <Empty title="No donations yet" />}
        {d && d.items.length > 0 && (
          <section className="nm-card nm-card--flush">
            <div className="nm-tablewrap">
              <table className="nm-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Donor</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Campaign</th>
                    <th>Message</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((x) => (
                    <tr key={x.id}>
                      <td>{fmtDate(x.paidAt)}</td>
                      <td>{x.donor}</td>
                      <td>{money(x.amount, x.currency)}</td>
                      <td>{x.frequency === "once" ? "One-time" : x.frequency}</td>
                      <td>{x.campaign || "—"}</td>
                      <td className="nma-msg">{x.message || "—"}</td>
                      <td>{x.status === "refunded" ? <span className="nm-greypill">Refunded</span> : <span className="nm-okpill">Paid</span>}</td>
                      <td>
                        {d.canRefund && x.status === "paid" && can("manage_donations") && (
                          <button
                            type="button"
                            className="nm-link nm-link--danger"
                            onClick={async () => {
                              if (!window.confirm(`Refund ${money(x.amount, x.currency)} to the donor? This cannot be undone.`)) return;
                              try {
                                await newsApi.refund(outlet.id, x.id);
                                notify("ok", "Refund issued.");
                                load();
                              } catch (err) {
                                notify("error", newsError(err));
                              }
                            }}
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>
      {editing && (
        <CampaignDialog
          c={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            notify("ok", "Campaign saved.");
            load();
          }}
        />
      )}
    </>
  );
}

function CampaignDialog({ c, onClose, onDone }: { c: Campaign | null; onClose: () => void; onDone: () => void }) {
  const { outlet } = useAdmin();
  const [f, setF] = useState({ title: c?.title ?? "", description: c?.description ?? "", goal: c ? String(c.goal) : "", deadline: c?.deadline ?? "", status: c?.status ?? "active", coverUrl: c?.coverUrl ?? "", update: "" });
  const [busy, setBusy] = useState<"" | "save" | "img">("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement | null>(null);
  async function save(ev: FormEvent) {
    ev.preventDefault();
    if (f.title.trim().length < 3) return setError("Give the campaign a title.");
    if (!(Number(f.goal) >= 1)) return setError("Set a fundraising goal.");
    setBusy("save");
    setError("");
    try {
      await newsApi.saveCampaign(outlet.id, c?.id ?? null, { ...f, goal: Number(f.goal) });
      onDone();
    } catch (err) {
      setError(newsError(err));
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal
      title={c ? "Edit campaign" : "New campaign"}
      subtitle="Amounts raised are calculated from verified donations only."
      onClose={onClose}
      busy={busy === "save"}
      footer={
        <>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="nma-camp" className="nm-btn nm-btn--primary" disabled={Boolean(busy)}>
            {busy === "save" && <Loader2 className="nm-spin" />} Save
          </button>
        </>
      }
    >
      <form id="nma-camp" className="nm-form" onSubmit={save}>
        <label className="nm-field">
          <span className="nm-field__label">Title *</span>
          <input className="nm-input" maxLength={160} value={f.title} onChange={(ev) => setF({ ...f, title: ev.target.value })} placeholder="Help Us Upgrade Our News Equipment" />
        </label>
        <label className="nm-field">
          <span className="nm-field__label">Description</span>
          <textarea className="nm-input" rows={4} maxLength={5000} value={f.description} onChange={(ev) => setF({ ...f, description: ev.target.value })} />
        </label>
        <div className="nm-form-row">
          <label className="nm-field">
            <span className="nm-field__label">Goal ({outlet.settings.currency}) *</span>
            <input className="nm-input" type="number" min={1} step="0.01" value={f.goal} onChange={(ev) => setF({ ...f, goal: ev.target.value })} />
          </label>
          <label className="nm-field">
            <span className="nm-field__label">Deadline</span>
            <input className="nm-input" type="date" value={f.deadline} onChange={(ev) => setF({ ...f, deadline: ev.target.value })} />
          </label>
          <label className="nm-field">
            <span className="nm-field__label">Status</span>
            <select className="nm-input" value={f.status} onChange={(ev) => setF({ ...f, status: ev.target.value as Campaign["status"] })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <div className="nm-field">
          <span className="nm-field__label">Cover image</span>
          <span className="nma-inline">
            {f.coverUrl && <img src={f.coverUrl} alt="" className="nma-thumbprev" />}
            <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => input.current?.click()} disabled={Boolean(busy)}>
              {busy === "img" ? <Loader2 className="nm-spin" /> : <ImagePlus />} Choose image
            </button>
          </span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              setBusy("img");
              try {
                const url = await newsApi.uploadFile(file);
                setF((x) => ({ ...x, coverUrl: url }));
              } catch (err) {
                setError(newsError(err));
              } finally {
                setBusy("");
              }
            }}
          />
        </div>
        {c && (
          <label className="nm-field">
            <span className="nm-field__label">Post a campaign update (optional)</span>
            <textarea className="nm-input" rows={2} maxLength={1000} value={f.update} onChange={(ev) => setF({ ...f, update: ev.target.value })} />
          </label>
        )}
        {error && <p className="nm-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Requests
 * ========================================================================== */

const TYPE_LABEL = Object.fromEntries(REQUEST_TYPES.map((t) => [t.id, t.label.replace(/^(Request |Submit )(an? )?/, "")]));

export function RequestsPage() {
  const { outlet } = useAdmin();
  const [type, setType] = useState("");
  const [status, setStatus] = useState("open");
  const [data, setData] = useState<{ items: RequestRow[]; total: number; openByType: Record<string, number> } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    newsApi
      .requests(outlet.id, { type: type || undefined, status: status || undefined })
      .then(setData)
      .catch((err) => setError(newsError(err)));
  useEffect(() => {
    void load();
  }, [outlet.id, type, status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageTitle title="Media Requests" sub="News tips, coverage and interview requests, stories, advertising, partnerships, corrections and inquiries." />
      <div className="nm-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!type} className={!type ? "is-on" : ""} onClick={() => setType("")}>
          All <span>{Object.values(data?.openByType ?? {}).reduce((a, b) => a + b, 0)}</span>
        </button>
        {REQUEST_TYPES.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={type === t.id} className={type === t.id ? "is-on" : ""} onClick={() => setType(t.id)}>
            {TYPE_LABEL[t.id]} <span>{data?.openByType[t.id] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="nma-toolbar">
        <select className="nm-input nm-input--sm" value={status} onChange={(ev) => setStatus(ev.target.value)} aria-label="Status">
          <option value="open">Open</option>
          <option value="">All</option>
          {Object.entries(REQUEST_STATUS_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <small className="nm-muted">
          <Lock /> Confidential submissions are visible only to staff allowed to see them.
        </small>
      </div>
      {error && <p className="nm-form-error">{error}</p>}
      {!data && !error && <Skeleton h={200} />}
      {data && data.items.length === 0 && <Empty icon={Inbox} title="No requests" />}
      {data && data.items.length > 0 && (
        <section className="nm-card nm-card--flush">
          <div className="nm-tablewrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>From</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="nma-click" onClick={() => setOpen(r.id)}>
                    <td>
                      <code>{r.reference}</code>
                    </td>
                    <td>
                      {TYPE_LABEL[r.type]}
                      {r.confidential && <Lock className="nma-lock" aria-label="Confidential" />}
                    </td>
                    <td>
                      <b>{r.subject}</b>
                    </td>
                    <td>{r.contactName || "—"}</td>
                    <td>
                      <span className={`nma-pill nma-pill--${r.priority === "urgent" || r.priority === "high" ? "red" : "grey"}`}>{r.priority}</span>
                    </td>
                    <td>{REQUEST_STATUS_LABELS[r.status]}</td>
                    <td>{r.assigneeName || "—"}</td>
                    <td>{timeAgo(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {open && (
        <RequestDialog
          id={open}
          onClose={() => {
            setOpen(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function RequestDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { outlet, notify } = useAdmin();
  const [r, setR] = useState<RequestDetail | null>(null);
  const [team, setTeam] = useState<TeamView | null>(null);
  const [note, setNote] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    newsApi
      .request(outlet.id, id)
      .then(setR)
      .catch((err) => setError(newsError(err)));
    newsApi
      .team(outlet.id)
      .then(setTeam)
      .catch(() => setTeam(null));
  }, [outlet.id, id]);
  async function update(input: Record<string, unknown>, ok: string) {
    setBusy(true);
    setError("");
    try {
      setR(await newsApi.updateRequest(outlet.id, id, input));
      notify("ok", ok);
    } catch (err) {
      setError(newsError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={r ? `${r.typeLabel} · ${r.reference}` : "Request"} onClose={onClose} wide busy={busy}>
      {!r && !error && <Skeleton h={200} />}
      {error && <p className="nm-form-error">{error}</p>}
      {r && (
        <div className="nma-req">
          <div className="nma-req__main">
            <h3>{r.subject}</h3>
            {r.confidential && (
              <p className="nm-note nm-note--amber">
                <Lock /> Confidential{r.anonymous ? " and anonymous" : ""}. Do not share the source's identity.
              </p>
            )}
            <p className="nm-pre">{r.description}</p>
            {r.attachments.length > 0 && (
              <div className="nma-lib">
                {r.attachments.map((a) => (
                  <a key={a} href={a} target="_blank" rel="noreferrer">
                    <img src={a} alt="" onError={(ev) => ((ev.target as HTMLImageElement).style.display = "none")} />
                    Open attachment
                  </a>
                ))}
              </div>
            )}
            <dl className="nm-dl">
              {r.contactName && (
                <>
                  <dt>Name</dt>
                  <dd>{r.contactName}</dd>
                </>
              )}
              {r.email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${r.email}`}>{r.email}</a>
                  </dd>
                </>
              )}
              {r.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>{r.phone}</dd>
                </>
              )}
              {r.location && (
                <>
                  <dt>Location</dt>
                  <dd>{r.location}</dd>
                </>
              )}
              <dt>Received</dt>
              <dd>{fmtDate(r.createdAt, true)}</dd>
            </dl>
            <h4>Conversation with the sender</h4>
            {r.messages.length === 0 && <p className="nm-muted">No messages yet.</p>}
            <ul className="nm-thread">
              {r.messages.map((m, i) => (
                <li key={i} className={m.from === "staff" ? "is-staff" : ""}>
                  <b>{m.byName}</b> <small>{fmtDate(m.at, true)}</small>
                  <p className="nm-pre">{m.text}</p>
                </li>
              ))}
            </ul>
            <textarea className="nm-input" rows={3} value={reply} onChange={(ev) => setReply(ev.target.value)} placeholder="Reply to the sender (visible on their tracking page)…" />
            <div className="nm-row-actions">
              <button type="button" className="nm-btn nm-btn--primary nm-btn--sm" disabled={busy || !reply.trim()} onClick={() => update({ reply }, "Reply sent.").then(() => setReply(""))}>
                Send reply
              </button>
              <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" disabled={busy || !reply.trim()} onClick={() => update({ reply, askMoreInfo: true }, "Asked for more information.").then(() => setReply(""))}>
                Ask for more information
              </button>
            </div>
          </div>
          <aside className="nma-req__side">
            <label className="nm-field">
              <span className="nm-field__label">Status</span>
              <select className="nm-input" value={r.status} onChange={(ev) => update({ status: ev.target.value }, "Status updated.")} disabled={busy}>
                {Object.entries(REQUEST_STATUS_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="nm-field">
              <span className="nm-field__label">Priority</span>
              <select className="nm-input" value={r.priority} onChange={(ev) => update({ priority: ev.target.value }, "Priority updated.")} disabled={busy}>
                {["low", "normal", "high", "urgent"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            {r.canAssign && (
              <label className="nm-field">
                <span className="nm-field__label">Assigned to</span>
                <select className="nm-input" value={r.assigneeUserId ?? ""} onChange={(ev) => update({ assigneeUserId: ev.target.value || null }, "Assignment updated.")} disabled={busy}>
                  <option value="">Unassigned</option>
                  {team?.items.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} · {m.roleLabel}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <h4>
              <Lock /> Internal notes
            </h4>
            <ul className="nma-notes">
              {r.internalNotes.map((n, i) => (
                <li key={i}>
                  <b>{n.byName}</b> <small>{fmtDate(n.at, true)}</small>
                  <p className="nm-pre">{n.text}</p>
                </li>
              ))}
            </ul>
            <textarea className="nm-input" rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Private to the newsroom" />
            <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" disabled={busy || !note.trim()} onClick={() => update({ internalNote: note }, "Note added.").then(() => setNote(""))}>
              Add note
            </button>
            <h4>History</h4>
            <ol className="nma-history">
              {r.history.map((h, i) => (
                <li key={i}>
                  {h.action} · {h.byName} <small>{fmtDate(h.at, true)}</small>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}
    </Modal>
  );
}
