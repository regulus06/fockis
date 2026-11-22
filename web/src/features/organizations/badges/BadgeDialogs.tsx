/**
 * BadgeDialogs.tsx
 * -----------------------------------------------------------------------------
 * Dialogs for the official badge:
 *   BadgeQrDialog       large QR code for scanning
 *   BadgeDetailsDialog  edit what is printed on the badge (+ photo editor)
 *   BadgeManageDialog   admin: details, suspend / revoke / reactivate,
 *                       new QR code, badge history and scan history
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Ban, Camera, CircleCheck, History, LoaderCircle, PauseCircle, PlayCircle, QrCode as QrIcon, RefreshCw, ScanLine, X } from "lucide-react";

import { QrCode } from "./BadgeCard";
import OfficialBadge, { roleLabel } from "./OfficialBadge";
import BadgePhotoEditor from "./BadgePhotoEditor";
import {
  VERIFY_STATE_LABEL,
  VERIFY_STATE_TONE,
  badgeApi,
  badgePhotoSrc,
  badgeVerifyUrl,
  type Badge,
  type BadgeManageView,
} from "./badgeApi";
import "./myBadge.scss";

/* ------------------------------------------------------------------ modal */

export function BadgeModal({
  title,
  onClose,
  children,
  footer,
  wide = false,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.mbd__x)")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [busy, onClose]);
  return createPortal(
    <div className="mbd" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`mbd__card ${wide ? "mbd__card--wide" : ""}`} ref={ref}>
        <header className="mbd__head">
          <h2>{title}</h2>
          <button type="button" className="mbd__x" onClick={onClose} disabled={busy} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="mbd__body">{children}</div>
        {footer && <footer className="mbd__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function StatusChip({ badge }: { badge: Badge }) {
  const state = badge.verifyState ?? (badge.active ? "verified" : "membership_inactive");
  return <span className={`mb-chip mb-chip--${VERIFY_STATE_TONE[state]}`}>{VERIFY_STATE_LABEL[state]}</span>;
}

/* ------------------------------------------------------------------ QR */

export function BadgeQrDialog({ badge, onClose }: { badge: Badge; onClose: () => void }) {
  const url = badgeVerifyUrl(badge.verifyToken);
  return (
    <BadgeModal title="Badge QR code" onClose={onClose}>
      <div className="mbd-qr">
        <div className="mbd-qr__code">
          <QrCode value={url} />
        </div>
        <strong>{badge.displayName}</strong>
        <span>
          {badge.organizationName} · No. {badge.memberNumber}
        </span>
        <StatusChip badge={badge} />
        <p>Let someone scan this code with their phone camera. It opens a Fockis page that confirms the badge is valid right now.</p>
        <button type="button" className="mb-btn mb-btn--secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </BadgeModal>
  );
}

/* ------------------------------------------------------------------ details */

type MinistryChoice = "auto" | "none" | "custom" | `opt:${string}`;

function initialMinistry(badge: Badge): { choice: MinistryChoice; custom: string } {
  if (badge.ministryName === null || badge.ministryName === undefined) return { choice: "auto", custom: "" };
  if (badge.ministryName === "") return { choice: "none", custom: "" };
  if (badge.departmentNames.includes(badge.ministryName)) return { choice: `opt:${badge.ministryName}`, custom: "" };
  return { choice: "custom", custom: badge.ministryName };
}

export function BadgeDetailsForm({ badge, onSaved }: { badge: Badge; onSaved: (b: Badge, message: string) => void }) {
  const canEdit = Boolean(badge.access?.canEdit);
  const canPhoto = Boolean(badge.access?.canEditPhoto);
  const start = initialMinistry(badge);
  const [name, setName] = useState(badge.customName ?? "");
  const [title, setTitle] = useState(badge.customTitle ?? "");
  const [ministry, setMinistry] = useState<MinistryChoice>(start.choice);
  const [custom, setCustom] = useState(start.custom);
  const [expires, setExpires] = useState(badge.expiresAt ? String(badge.expiresAt).slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const photo = badgePhotoSrc(badge.avatarUrl);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (ministry === "custom" && !custom.trim()) return setError("Type the ministry name.");
    setBusy(true);
    setError(null);
    try {
      const next = await badgeApi.updateDetails(badge.organizationId, badge.membershipId, {
        customName: name.trim() || null,
        customTitle: title.trim() || null,
        ministryName: ministry === "auto" ? null : ministry === "none" ? "" : ministry === "custom" ? custom.trim() : ministry.slice(4),
        expiresAt: expires || null,
      });
      onSaved({ ...badge, ...next }, "Badge details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The badge could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mbd-photo">
        <span className={`mbd-photo__thumb mbd-photo__thumb--${badge.photo?.shape ?? "circle"}`}>
          {photo ? <img src={photo} alt="" /> : <Camera aria-hidden="true" />}
        </span>
        <div>
          <strong>Badge photo</strong>
          <span>{canPhoto ? "Crop, zoom, rotate and choose the shape." : "Your church manages badge photos. Ask an administrator to change yours."}</span>
        </div>
        {canPhoto && (
          <button type="button" className="mb-btn mb-btn--secondary mb-btn--sm" onClick={() => setEditingPhoto(true)}>
            <Camera aria-hidden="true" /> Edit photo
          </button>
        )}
      </div>

      {canEdit ? (
        <form id={`mbd-details-${badge.id}`} className="mbd-form" onSubmit={submit} noValidate>
          {error && (
            <p className="mbd-error" role="alert">
              {error}
            </p>
          )}
          <label className="mbd-field">
            <span>Name on badge</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={badge.memberName ?? badge.displayName} />
            <small>Leave empty to use the name on the membership.</small>
          </label>
          <label className="mbd-field">
            <span>Role shown on badge</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={roleLabel({ role: badge.role, customTitle: null })} />
            <small>e.g. Deacon, Choir Director. Leave empty to use the organization role.</small>
          </label>
          <label className="mbd-field">
            <span>Ministry</span>
            <select value={ministry} onChange={(e) => setMinistry(e.target.value as MinistryChoice)}>
              <option value="auto">{badge.departmentNames[0] ? `Automatic (${badge.departmentNames[0]})` : "Automatic (none assigned)"}</option>
              {badge.departmentNames.map((d) => (
                <option key={d} value={`opt:${d}`}>
                  {d}
                </option>
              ))}
              <option value="none">No Ministry Assigned</option>
              <option value="custom">Other…</option>
            </select>
          </label>
          {ministry === "custom" && (
            <label className="mbd-field">
              <span>Ministry name</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={80} />
            </label>
          )}
          <label className="mbd-field">
            <span>Expires on (optional)</span>
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            <small>After this date a scan shows the badge as expired.</small>
          </label>
          <div className="mbd-form__actions">
            <button type="submit" className="mb-btn mb-btn--primary" disabled={busy}>
              {busy ? "Saving…" : "Save details"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mbd-note">
          Your name, role, ministry and member number come from your membership. If something is wrong, report it to an administrator.
        </p>
      )}

      {editingPhoto && (
        <BadgePhotoEditor
          badge={badge}
          onClose={() => setEditingPhoto(false)}
          onSaved={(b, message) => {
            setEditingPhoto(false);
            onSaved({ ...badge, ...b }, message);
          }}
        />
      )}
    </>
  );
}

export function BadgeDetailsDialog({ badge, onClose, onSaved }: { badge: Badge; onClose: () => void; onSaved: (b: Badge, message: string) => void }) {
  return (
    <BadgeModal title="Edit badge" onClose={onClose}>
      <BadgeDetailsForm badge={badge} onSaved={onSaved} />
    </BadgeModal>
  );
}

/* ------------------------------------------------------------------ admin */

const ACTION_LABEL: Record<string, string> = {
  issued: "Badge issued",
  issued_manually: "Badge issued manually",
  refreshed: "Badge refreshed",
  details_updated: "Details updated",
  photo_updated: "Photo updated",
  photo_removed: "Photo removed",
  suspended: "Suspended",
  revoked: "Revoked",
  reactivated: "Reactivated",
  qr_regenerated: "New QR code",
};

const when = (v: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v));

export function BadgeManageDialog({
  organizationId,
  membershipId,
  onClose,
  onChanged,
}: {
  organizationId: string;
  membershipId: string;
  onClose: () => void;
  onChanged: (b: Badge) => void;
}) {
  const [view, setView] = useState<BadgeManageView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tab, setTab] = useState<"details" | "status" | "history" | "scans">("details");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmQr, setConfirmQr] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    badgeApi
      .manage(organizationId, membershipId)
      .then((v) => !cancelled && setView(v))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "This badge could not be loaded."));
    return () => {
      cancelled = true;
    };
  }, [organizationId, membershipId, tick]);

  const badge = view?.badge;
  const canStatus = Boolean(badge?.access?.canManageStatus);

  const update = (b: Badge, message: string) => {
    onChanged(b);
    setNotice(message);
    setTick((t) => t + 1);
  };

  async function status(action: "suspend" | "revoke" | "reactivate") {
    if (!badge) return;
    if (action !== "reactivate" && reason.trim().length < 3) return setError("Give a short reason first.");
    setBusy(action);
    setError(null);
    try {
      const next = await badgeApi.setStatus(organizationId, membershipId, action, reason.trim());
      setReason("");
      update(next, action === "suspend" ? "Badge suspended." : action === "revoke" ? "Badge revoked." : "Badge reactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    setBusy("qr");
    setError(null);
    try {
      const next = await badgeApi.regenerateQr(organizationId, membershipId);
      setConfirmQr(false);
      update(next, "New QR code made. The old one no longer works — print the badge again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The QR code could not be changed.");
    } finally {
      setBusy(null);
    }
  }

  const scanCounts = useMemo(() => {
    const c = { ok: 0, other: 0 };
    view?.verifications.forEach((v) => (v.result === "verified" ? c.ok++ : c.other++));
    return c;
  }, [view]);

  return (
    <BadgeModal title={badge ? `Badge · ${badge.displayName}` : "Badge"} onClose={onClose} wide busy={busy !== null}>
      {!view && !error && (
        <p className="mbd-note">
          <LoaderCircle className="bpe-spin" aria-hidden="true" /> Loading…
        </p>
      )}
      {error && (
        <p className="mbd-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mbd-ok" role="status">
          <CircleCheck aria-hidden="true" /> {notice}
        </p>
      )}
      {badge && view && (
        <div className="mbd-manage">
          <div className="mbd-manage__badge">
            <OfficialBadge badge={badge} className="mbd-manage__svg" />
            <div className="mbd-manage__meta">
              <StatusChip badge={badge} />
              <span>Issued {when(badge.issuedAt)}</span>
              {badge.tokenIssuedAt && <span>QR code since {when(badge.tokenIssuedAt)}</span>}
            </div>
          </div>
          <div className="mbd-manage__side">
            <div className="mbd-tabs" role="tablist">
              {(
                [
                  ["details", "Details"],
                  ["status", "Status & QR"],
                  ["history", `History (${view.history.length})`],
                  ["scans", `Scans (${view.verifications.length})`],
                ] as const
              ).map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>
                  {label}
                </button>
              ))}
            </div>

            {tab === "details" && <BadgeDetailsForm key={`${badge.id}-${tick}`} badge={badge} onSaved={update} />}

            {tab === "status" && (
              <div className="mbd-status">
                <p>
                  Badge status: <StatusChip badge={badge} />
                  {badge.statusReason && <span className="mbd-note"> Reason: {badge.statusReason}</span>}
                </p>
                {!canStatus ? (
                  <p className="mbd-note">Only the owner or an administrator can suspend, revoke or reactivate badges.</p>
                ) : (
                  <>
                    {badge.badgeStatus !== "active" ? (
                      <button type="button" className="mb-btn mb-btn--primary" disabled={busy !== null} onClick={() => void status("reactivate")}>
                        <PlayCircle aria-hidden="true" /> {busy === "reactivate" ? "Reactivating…" : "Reactivate badge"}
                      </button>
                    ) : null}
                    {badge.badgeStatus !== "revoked" && (
                      <>
                        <label className="mbd-field">
                          <span>Reason (required to suspend or revoke)</span>
                          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. Badge reported lost" />
                        </label>
                        <div className="mbd-form__actions">
                          {badge.badgeStatus === "active" && (
                            <button type="button" className="mb-btn mb-btn--warn" disabled={busy !== null} onClick={() => void status("suspend")}>
                              <PauseCircle aria-hidden="true" /> {busy === "suspend" ? "Suspending…" : "Suspend"}
                            </button>
                          )}
                          <button type="button" className="mb-btn mb-btn--danger" disabled={busy !== null} onClick={() => void status("revoke")}>
                            <Ban aria-hidden="true" /> {busy === "revoke" ? "Revoking…" : "Revoke"}
                          </button>
                        </div>
                      </>
                    )}
                    <hr />
                    <h3>
                      <QrIcon aria-hidden="true" /> QR code
                    </h3>
                    <p className="mbd-note">Make a new QR code when a badge is lost or copied. The old printed badge stops verifying.</p>
                    {confirmQr ? (
                      <div className="mbd-form__actions">
                        <button type="button" className="mb-btn mb-btn--danger" disabled={busy !== null} onClick={() => void regenerate()}>
                          {busy === "qr" ? "Working…" : "Yes, make a new QR code"}
                        </button>
                        <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setConfirmQr(false)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="mb-btn mb-btn--secondary" onClick={() => setConfirmQr(true)}>
                        <RefreshCw aria-hidden="true" /> Make a new QR code
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {tab === "history" && (
              <ol className="mbd-log">
                {view.history.map((h, i) => (
                  <li key={i}>
                    <History aria-hidden="true" />
                    <div>
                      <strong>{ACTION_LABEL[h.action] ?? h.action}</strong>
                      {h.note && <span>{h.note}</span>}
                      <small>
                        {when(h.at)}
                        {h.actorName ? ` · ${h.actorName}` : ""}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {tab === "scans" &&
              (view.verifications.length ? (
                <>
                  <p className="mbd-note">
                    Last {view.verifications.length} scans · {scanCounts.ok} verified · {scanCounts.other} not valid at the time.
                  </p>
                  <ol className="mbd-log">
                    {view.verifications.map((v) => (
                      <li key={v.id}>
                        <ScanLine aria-hidden="true" />
                        <div>
                          <strong className={`mbd-tone--${VERIFY_STATE_TONE[v.result] ?? "red"}`}>{VERIFY_STATE_LABEL[v.result] ?? v.result}</strong>
                          <small>
                            {when(v.at)}
                            {v.device ? ` · ${v.device}` : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="mbd-note">Nobody has scanned this badge yet.</p>
              ))}
          </div>
        </div>
      )}
    </BadgeModal>
  );
}
