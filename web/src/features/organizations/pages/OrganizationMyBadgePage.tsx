/**
 * OrganizationMyBadgePage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/my-badge — the signed-in member's official
 * badge: show the QR code, print, download (PNG / PDF), share the
 * verification link, and edit (photo for members when allowed; all badge
 * details for administrators).
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Copy,
  Download,
  FileImage,
  FileText,
  IdCard,
  Layers,
  LoaderCircle,
  Pencil,
  Printer,
  QrCode,
  Share2,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import OfficialBadge, { roleLabel } from "../badges/OfficialBadge";
import { BadgeDetailsDialog, BadgeQrDialog, StatusChip } from "../badges/BadgeDialogs";
import { VERIFY_STATE_TONE, badgeApi, badgeVerifyUrl, type Badge } from "../badges/badgeApi";
import { badgeFileName, downloadBadgePdf, downloadBadgePng, printBadge } from "../badges/badgeExport";
import { mediaUrl } from "../api/dashboardApi";
import { ChurchAuthError } from "../api/organizationApi";
import { Empty, OrgShell, errorText, orgPath } from "../ui/OrgShell";
import "../badges/Badges.scss";
import "../badges/myBadge.scss";

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export default function OrganizationMyBadgePage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const [badge, setBadge] = useState<Badge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"qr" | "edit" | null>(null);
  const [menu, setMenu] = useState<"download" | "share" | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const downloadRef = useOutside(menu === "download", () => setMenu(null));
  const shareRef = useOutside(menu === "share", () => setMenu(null));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    badgeApi
      .mine(organizationId)
      .then((b) => !cancelled && setBadge(b))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ChurchAuthError) setSignedOut(true);
        setError(errorText(err, "Your badge could not be loaded."));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.tone === "ok" ? 3500 : 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const verifyUrl = badgeVerifyUrl(badge?.verifyToken);

  async function run(kind: string, fn: () => Promise<void>, done?: string) {
    if (!svgRef.current) return;
    setWorking(kind);
    setMenu(null);
    try {
      await fn();
      if (done) setToast({ text: done, tone: "ok" });
    } catch (err) {
      setToast({ text: errorText(err, "That didn't work. Please try again."), tone: "error" });
    } finally {
      setWorking(null);
    }
  }

  async function share() {
    if (!badge || !verifyUrl) return;
    setMenu(null);
    try {
      await navigator.share({ title: `${badge.organizationName} member badge`, text: `Check ${badge.displayName}'s ${badge.organizationName} member badge`, url: verifyUrl });
    } catch (err) {
      if ((err as DOMException)?.name !== "AbortError") setToast({ text: "Sharing isn't available here. The link was copied instead.", tone: "ok" });
      if ((err as DOMException)?.name !== "AbortError") await copyText(verifyUrl);
    }
  }

  const cover = badge?.organizationBannerUrl ? mediaUrl(badge.organizationBannerUrl) : null;
  const canEditAnything = Boolean(badge?.access?.canEdit || badge?.access?.canEditPhoto);
  const tone = badge ? VERIFY_STATE_TONE[badge.verifyState ?? (badge.active ? "verified" : "membership_inactive")] : "green";
  const StatusIcon = tone === "green" ? CircleCheck : tone === "yellow" ? CircleAlert : CircleX;

  const rows: { icon: LucideIcon; label: string; value: React.ReactNode }[] = badge
    ? [
        { icon: UserRound, label: "Full name", value: badge.displayName },
        { icon: UsersRound, label: "Role", value: roleLabel(badge) },
        { icon: Layers, label: "Ministry", value: badge.ministry || badge.departmentNames[0] || "No Ministry Assigned" },
        { icon: IdCard, label: "Member ID", value: badge.memberNumber },
        {
          icon: CalendarDays,
          label: "Member since",
          value: badge.joinedAt ? new Date(badge.joinedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—",
        },
        { icon: StatusIcon, label: "Status", value: <StatusChip badge={badge} /> },
      ]
    : [];

  return (
    <OrgShell
      organizationId={organizationId}
      organizationName={badge?.organizationName}
      organizationLogoUrl={badge?.organizationLogoUrl ? mediaUrl(badge.organizationLogoUrl) : null}
      organizationCoverUrl={cover}
    >
      <div className="mb-page">
        <header className={`mb-hero ${cover ? "" : "mb-hero--plain"}`}>
          {cover && <div className="mb-hero__cover" style={{ backgroundImage: `url("${cover}")` }} aria-hidden="true" />}
          <div className="mb-hero__text">
            <span className="mb-hero__eyebrow">{badge?.organizationName ?? "Member portal"}</span>
            <h1>My Badge</h1>
            <p>
              Your official member badge{badge ? ` for ${badge.organizationName}` : ""}. Show it at the door, print it, or let someone scan the QR code to
              check it's valid.
            </p>
          </div>
        </header>

        {loading ? (
          <section className="mb-main mb-main--loading" aria-busy="true" aria-label="Loading your badge">
            <div className="mb-skel mb-skel--badge" />
            <div className="mb-right">
              <div className="mb-skel" style={{ height: 300 }} />
              <div className="mb-skel" style={{ height: 180 }} />
            </div>
          </section>
        ) : !badge ? (
          <Empty
            title={signedOut ? "Sign in to see your badge" : "No badge yet"}
            text={signedOut ? undefined : (error ?? "Badges are for active members. Once your membership is approved, your badge appears here.")}
          >
            {signedOut ? (
              <Link to={"/login?returnTo=" + encodeURIComponent(orgPath(organizationId, "/my-badge"))} className="fko-btn fko-btn--primary">
                Sign in
              </Link>
            ) : (
              <Link to={orgPath(organizationId)} className="fko-btn fko-btn--secondary">
                Back to the organization
              </Link>
            )}
          </Empty>
        ) : (
          <section className="mb-main">
            <div className="mb-left">
              <div className="mb-badgewrap">
                <OfficialBadge ref={svgRef} badge={badge} className="mb-badge" />
              </div>
              <div className="mb-actions">
                <button type="button" className="mb-btn mb-btn--primary" onClick={() => setDialog("qr")} disabled={!verifyUrl}>
                  <QrCode aria-hidden="true" /> Show QR Code
                </button>
                <button
                  type="button"
                  className="mb-btn mb-btn--secondary"
                  disabled={working !== null}
                  onClick={() => void run("print", () => printBadge(svgRef.current!, `${badge.displayName} – ${badge.organizationName} badge`))}
                >
                  {working === "print" ? <LoaderCircle className="bpe-spin" aria-hidden="true" /> : <Printer aria-hidden="true" />} Print
                </button>
                <div className="mb-menu" ref={downloadRef}>
                  <button
                    type="button"
                    className="mb-btn mb-btn--secondary"
                    aria-haspopup="menu"
                    aria-expanded={menu === "download"}
                    disabled={working !== null}
                    onClick={() => setMenu((m) => (m === "download" ? null : "download"))}
                  >
                    {working === "png" || working === "pdf" ? <LoaderCircle className="bpe-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Download
                  </button>
                  {menu === "download" && (
                    <div className="mb-menu__list" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void run("png", () => downloadBadgePng(svgRef.current!, badgeFileName(badge.displayName, "png")), "Badge downloaded as PNG.")}
                      >
                        <FileImage aria-hidden="true" /> PNG image (high quality)
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void run("pdf", () => downloadBadgePdf(svgRef.current!, badgeFileName(badge.displayName, "pdf")), "Badge downloaded as PDF.")}
                      >
                        <FileText aria-hidden="true" /> PDF document
                      </button>
                    </div>
                  )}
                </div>
                <div className="mb-menu" ref={shareRef}>
                  <button
                    type="button"
                    className="mb-btn mb-btn--secondary"
                    aria-haspopup="menu"
                    aria-expanded={menu === "share"}
                    disabled={!verifyUrl}
                    onClick={() => setMenu((m) => (m === "share" ? null : "share"))}
                  >
                    <Share2 aria-hidden="true" /> Share
                  </button>
                  {menu === "share" && (
                    <div className="mb-menu__list" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenu(null);
                          void copyText(verifyUrl).then(() => setToast({ text: "Verification link copied.", tone: "ok" }));
                        }}
                      >
                        <Copy aria-hidden="true" /> Copy verification link
                      </button>
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <button type="button" role="menuitem" onClick={() => void share()}>
                          <Share2 aria-hidden="true" /> Share…
                        </button>
                      )}
                      <p className="mb-menu__note">Only the verification link is shared — never your contact details.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-right">
              <section className="mb-card" aria-labelledby="mb-details-title">
                <header className="mb-card__head">
                  <IdCard className="mb-card__icon" aria-hidden="true" />
                  <h2 id="mb-details-title">Badge Details</h2>
                  {canEditAnything && (
                    <button type="button" className="mb-btn mb-btn--secondary mb-btn--sm" onClick={() => setDialog("edit")}>
                      <Pencil aria-hidden="true" /> Edit
                    </button>
                  )}
                </header>
                <dl className="mb-rows">
                  {rows.map((r) => (
                    <div key={r.label} className="mb-row">
                      <dt>
                        <r.icon aria-hidden="true" className={r.label === "Status" ? `mb-row__status mb-row__status--${tone}` : undefined} />
                        {r.label}
                      </dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {badge.statusReason && badge.badgeStatus !== "active" && <p className="mb-card__note">Reason: {badge.statusReason}</p>}
              </section>

              <section className="mb-card mb-card--access" aria-labelledby="mb-access-title">
                <header className="mb-card__head">
                  <ShieldCheck className="mb-card__icon" aria-hidden="true" />
                  <h2 id="mb-access-title">Access &amp; Use</h2>
                </header>
                <ul className="mb-checks">
                  {[
                    "Use this badge for church check-in and events.",
                    "Show the QR code for quick verification.",
                    "Your status and information are verified by the organization.",
                    "Report a lost or incorrect badge to an administrator.",
                  ].map((t) => (
                    <li key={t}>
                      <Check aria-hidden="true" /> {t}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>
        )}
      </div>

      {badge && dialog === "qr" && <BadgeQrDialog badge={badge} onClose={() => setDialog(null)} />}
      {badge && dialog === "edit" && (
        <BadgeDetailsDialog
          badge={badge}
          onClose={() => setDialog(null)}
          onSaved={(b, message) => {
            setBadge((old) => ({ ...(old ?? b), ...b, access: b.access ?? old?.access }));
            setDialog(null);
            setToast({ text: message, tone: "ok" });
          }}
        />
      )}
      {toast && (
        <div className={`mb-toast mb-toast--${toast.tone}`} role={toast.tone === "ok" ? "status" : "alert"}>
          {toast.tone === "ok" ? <CircleCheck aria-hidden="true" /> : null}
          {toast.text}
        </div>
      )}
    </OrgShell>
  );
}
