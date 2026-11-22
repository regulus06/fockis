/**
 * InvitationsDialog.tsx — Manage Invitations of one livestream.
 * -----------------------------------------------------------------------------
 * Invite members or other Fockis users (by email), create a shareable link
 * (only when "anyone with the link" is turned on, always with a short
 * expiry), copy new links, resend (issues a new link), revoke, and approve or
 * deny access requests. Links are shown only once: the server keeps only a
 * hash of each token.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Link2, Mail, RefreshCw, Search, ShieldOff, UserPlus, X } from "lucide-react";

import { listMembers } from "../api/membersApi";
import { errorMessage } from "../ui/orgUi";
import { liveApi, type LiveInvitation, type Livestream } from "./liveApi";

const STATUS_TEXT: Record<LiveInvitation["status"], string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
  declined: "Declined",
};

function absolute(link: string): string {
  return link.startsWith("http") ? link : `${window.location.origin}${link}`;
}

function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="lv-btn lv-btn--ghost lv-btn--sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          window.setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt("Copy this link:", text);
        }
      }}
    >
      {done ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {done ? "Copied" : label}
    </button>
  );
}

export default function InvitationsDialog({
  organizationId,
  stream,
  onClose,
  onStreamChanged,
}: {
  organizationId: string;
  stream: Livestream;
  onClose: () => void;
  onStreamChanged: (s: Livestream) => void;
}) {
  const [items, setItems] = useState<LiveInvitation[] | null>(null);
  const [bearer, setBearer] = useState(Boolean(stream.settings.bearerLinks));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [links, setLinks] = useState<{ label: string; link: string }[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ userId: string; name: string }[]>([]);
  const [picked, setPicked] = useState<{ userId: string; name: string }[]>([]);
  const [emails, setEmails] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();
    liveApi
      .invitations(organizationId, stream.id, controller.signal)
      .then((r) => {
        setItems(r.items);
        setBearer(r.bearerLinks);
      })
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Invitations could not be loaded.")));
    return () => controller.abort();
  }, [organizationId, stream.id]);

  useEffect(load, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Member search (debounced).
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      listMembers(organizationId, { search: q, pageSize: 8 }, controller.signal)
        .then((r) => setResults(r.items.filter((m) => m.userId).map((m) => ({ userId: String(m.userId), name: m.profile?.displayName || "Member" }))))
        .catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [organizationId, search]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, "That didn't work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  const expiryIso = expires ? new Date(`${expires}T23:59:00`).toISOString() : undefined;

  const sendInvites = () =>
    run("invite", async () => {
      const list = emails
        .split(/[\s,;]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      const res = await liveApi.invite(organizationId, stream.id, { userIds: picked.map((p) => p.userId), emails: list, expiresAt: expiryIso });
      const newLinks = res.created.filter((c) => c.link).map((c) => ({ label: c.email || picked.find((p) => p.userId === c.userId)?.name || "Invitation", link: absolute(c.link!) }));
      setLinks((l) => [...newLinks, ...l]);
      setPicked([]);
      setEmails("");
      setSearch("");
      setNotice(res.note ?? `${res.created.length} invitation${res.created.length === 1 ? "" : "s"} ready. Fockis users were notified in the app.`);
      load();
    });

  const createLink = () =>
    run("link", async () => {
      const until = expiryIso ?? new Date(Date.now() + 2 * 86400e3).toISOString();
      const res = await liveApi.invite(organizationId, stream.id, { link: true, expiresAt: until });
      const created = res.created.find((c) => c.link);
      if (created?.link) setLinks((l) => [{ label: "Shareable link", link: absolute(created.link!) }, ...l]);
      load();
    });

  const setBearerLinks = (on: boolean) =>
    run("bearer", async () => {
      const updated = await liveApi.update(organizationId, stream.id, { settings: { bearerLinks: on } });
      setBearer(Boolean(updated.settings.bearerLinks));
      onStreamChanged(updated);
    });

  const requests = (items ?? []).filter((i) => i.kind === "request");
  const invites = (items ?? []).filter((i) => i.kind === "invite");
  const closed = stream.state === "ended" || stream.state === "cancelled";

  return (
    <div className="lv-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lv-modal__box is-wide" role="dialog" aria-modal="true" aria-labelledby="lv-inv-title">
        <header className="lv-modal__head">
          <div>
            <h2 id="lv-inv-title">Manage Invitations</h2>
            <small className="lv-muted">{stream.title}</small>
          </div>
          <button type="button" className="lv-icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="lv-modal__body">
          {error && <div className="lv-alert lv-alert--error">{error}</div>}
          {notice && <div className="lv-alert lv-alert--ok">{notice}</div>}
          {stream.visibility !== "private" && (
            <div className="lv-alert">
              This livestream is <strong>{stream.visibility === "public" ? "public" : stream.visibility === "members" ? "for members" : "for selected groups"}</strong>. Invitations add people who would
              otherwise not be allowed.
            </div>
          )}

          {!closed && (
            <section className="lv-inv-new">
              <h3>
                <UserPlus aria-hidden="true" /> Invite people
              </h3>
              <div className="lv-input-icon">
                <Search aria-hidden="true" />
                <input value={search} placeholder="Search members by name…" onChange={(e) => setSearch(e.target.value)} />
              </div>
              {results.length > 0 && (
                <ul className="lv-results">
                  {results.map((r) => (
                    <li key={r.userId}>
                      <span>{r.name}</span>
                      <button
                        type="button"
                        className="lv-btn lv-btn--ghost lv-btn--sm"
                        disabled={picked.some((p) => p.userId === r.userId)}
                        onClick={() => setPicked((p) => [...p, r])}
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {picked.length > 0 && (
                <div className="lv-chips">
                  {picked.map((p) => (
                    <span key={p.userId} className="lv-chip is-on">
                      {p.name}
                      <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPicked((x) => x.filter((y) => y.userId !== p.userId))}>
                        <X />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <label className="lv-field">
                <span>
                  <Mail aria-hidden="true" /> Email addresses (Fockis users or anyone)
                </span>
                <textarea rows={2} value={emails} placeholder="name@example.com, other@example.com" onChange={(e) => setEmails(e.target.value)} />
              </label>
              <div className="lv-inv-row">
                <label className="lv-field lv-field--inline">
                  <span>Expires</span>
                  <input type="date" value={expires} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setExpires(e.target.value)} />
                </label>
                <button type="button" className="lv-btn lv-btn--primary" disabled={busy === "invite" || (!picked.length && !emails.trim())} onClick={sendInvites}>
                  {busy === "invite" ? "Inviting…" : "Send Invitations"}
                </button>
              </div>
              <small className="lv-muted">Each invitation works only for the invited account. Someone who receives a forwarded link cannot use it.</small>

              <div className="lv-bearer">
                <div className="lv-toggle">
                  <button type="button" role="switch" className="lv-switch" aria-checked={bearer} aria-label="Anyone with the link" disabled={busy === "bearer" || stream.visibility !== "private"} onClick={() => setBearerLinks(!bearer)}>
                    <i />
                  </button>
                  <span className="lv-toggle__label">Anyone with the link (signed in) can join</span>
                </div>
                {bearer && (
                  <>
                    <p className="lv-warn">
                      <AlertTriangle aria-hidden="true" /> Anyone who gets a shareable link can join until it expires or you revoke it. Links expire within 7 days.
                    </p>
                    <button type="button" className="lv-btn lv-btn--outline lv-btn--sm" disabled={busy === "link"} onClick={createLink}>
                      <Link2 aria-hidden="true" /> {busy === "link" ? "Creating…" : "Create shareable link"}
                    </button>
                  </>
                )}
                {stream.visibility !== "private" && <small className="lv-muted">Shareable links are only for Private / Invite Only livestreams.</small>}
              </div>
            </section>
          )}

          {links.length > 0 && (
            <section className="lv-newlinks">
              <h3>New links — copy them now</h3>
              <small className="lv-muted">For security, Fockis cannot show these links again. Use Resend to create a new one.</small>
              <ul>
                {links.map((l) => (
                  <li key={l.link}>
                    <span>{l.label}</span>
                    <code>{l.link}</code>
                    <CopyButton text={l.link} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {requests.length > 0 && (
            <section>
              <h3>Access requests</h3>
              <ul className="lv-invlist">
                {requests.map((r) => (
                  <li key={r.id}>
                    <div>
                      <strong>{r.name}</strong>
                      {r.message && <small>“{r.message}”</small>}
                    </div>
                    <span className={`lv-inv-status lv-inv-status--${r.status}`}>{r.status === "accepted" ? "Approved" : r.status === "declined" ? "Denied" : "Pending"}</span>
                    {r.status === "pending" && (
                      <div className="lv-actions">
                        <button type="button" className="lv-btn lv-btn--primary lv-btn--sm" disabled={busy === r.id} onClick={() => run(r.id, async () => { await liveApi.respond(organizationId, r.id, true); load(); })}>
                          Approve
                        </button>
                        <button type="button" className="lv-btn lv-btn--ghost lv-btn--sm" disabled={busy === r.id} onClick={() => run(r.id, async () => { await liveApi.respond(organizationId, r.id, false); load(); })}>
                          Deny
                        </button>
                      </div>
                    )}
                    {r.status === "accepted" && (
                      <button type="button" className="lv-btn lv-btn--ghost lv-btn--sm" disabled={busy === r.id} onClick={() => run(r.id, async () => { await liveApi.revoke(organizationId, r.id); load(); })}>
                        Remove access
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3>Invitations</h3>
            {!items ? (
              <p className="lv-empty">Loading…</p>
            ) : invites.length === 0 ? (
              <p className="lv-empty">No invitations yet.</p>
            ) : (
              <ul className="lv-invlist">
                {invites.map((i) => (
                  <li key={i.id}>
                    <div>
                      <strong>{i.isLink ? "Shareable link" : i.name}</strong>
                      <small>
                        {i.email && !i.isLink ? `${i.email} · ` : ""}
                        {i.expiresAt ? `Expires ${new Date(i.expiresAt).toLocaleDateString()}` : "No expiry"}
                        {i.acceptedAt ? ` · Accepted ${new Date(i.acceptedAt).toLocaleDateString()}` : ""}
                      </small>
                    </div>
                    <span className={`lv-inv-status lv-inv-status--${i.status}`}>{STATUS_TEXT[i.status]}</span>
                    <div className="lv-actions">
                      {(i.status === "pending" || i.status === "expired") && !closed && (
                        <button
                          type="button"
                          className="lv-btn lv-btn--ghost lv-btn--sm"
                          disabled={busy === i.id}
                          onClick={() =>
                            run(i.id, async () => {
                              const res = await liveApi.resend(organizationId, i.id);
                              setLinks((l) => [{ label: i.isLink ? "Shareable link" : i.name, link: absolute(res.link) }, ...l]);
                              load();
                            })
                          }
                        >
                          <RefreshCw aria-hidden="true" /> Resend
                        </button>
                      )}
                      {(i.status === "pending" || i.status === "accepted") && (
                        <button
                          type="button"
                          className="lv-btn lv-btn--ghost lv-btn--sm"
                          disabled={busy === i.id}
                          onClick={() => window.confirm(`Revoke this invitation? ${i.status === "accepted" ? "They lose access immediately." : ""}`) && run(i.id, async () => { await liveApi.revoke(organizationId, i.id); load(); })}
                        >
                          <ShieldOff aria-hidden="true" /> Revoke
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
