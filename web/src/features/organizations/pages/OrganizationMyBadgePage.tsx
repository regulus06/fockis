/**
 * OrganizationMyBadgePage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/my-badge — the signed-in member's badge:
 * show it, print it, add or change the photo, or open the QR code full screen.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import BadgeCard, { QrCode } from "../badges/BadgeCard";
import BadgePhotoButton from "../badges/BadgePhotoButton";
import { DEFAULT_DESIGN, badgeApi, badgeVerifyUrl, type Badge, type BadgeDesign } from "../badges/badgeApi";
import { ChurchAuthError } from "../api/organizationApi";
import { Empty, Loading, OrgShell, PageHead, errorText, orgPath } from "../ui/OrgShell";

export default function OrganizationMyBadgePage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const [badge, setBadge] = useState<Badge | null>(null);
  const [design, setDesign] = useState<BadgeDesign>(DEFAULT_DESIGN);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bigQr, setBigQr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([badgeApi.mine(organizationId), badgeApi.design(organizationId)])
      .then(([b, d]) => {
        if (cancelled) return;
        setBadge(b);
        setDesign(d);
      })
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

  return (
    <OrgShell organizationId={organizationId} organizationName={badge?.organizationName}>
      <PageHead
        eyebrow={badge?.organizationName ?? "Member portal"}
        title="My badge"
        subtitle="Show it at the door, print it, or let someone scan the QR code to check it's valid."
      />

      {loading ? (
        <Loading rows={1} />
      ) : !badge ? (
        <Empty
          title={signedOut ? "Sign in to see your badge" : "No badge yet"}
          text={signedOut ? undefined : error ?? "Badges are for active members. Once your membership is approved, your badge appears here."}
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
        <section className="fko-card" style={{ justifyItems: "center", gap: 18 }}>
          <div className="badge-zoom">
            <BadgeCard badge={badge} design={design} />
          </div>
          <BadgePhotoButton badge={badge} onChange={setBadge} />
          <div className="fko-actions" style={{ justifyContent: "center" }}>
            <button type="button" className="fko-btn fko-btn--primary" onClick={() => setBigQr(true)}>
              Show QR code
            </button>
            <button type="button" className="fko-btn fko-btn--secondary" onClick={() => window.print()}>
              🖨 Print
            </button>
            {badge.verifyToken && (
              <a className="fko-btn fko-btn--ghost" href={badgeVerifyUrl(badge.verifyToken)} target="_blank" rel="noreferrer">
                Check it
              </a>
            )}
          </div>
          <p className="fko-hint" style={{ textAlign: "center" }}>
            Use a clear photo of your face. Your name comes from your member profile — ask an admin if something else on your badge is wrong.
          </p>
        </section>
      )}

      {badge && (
        <div className="badge-print-only badge-print-area" aria-hidden="true">
          <BadgeCard badge={badge} design={design} />
        </div>
      )}

      {bigQr && badge && (
        <div className="badge-qr-full" role="dialog" aria-label="Badge QR code" onClick={() => setBigQr(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QrCode value={badgeVerifyUrl(badge.verifyToken)} />
            <strong>{badge.displayName}</strong>
            <span>{badge.memberNumber}</span>
            <button type="button" className="fko-btn fko-btn--secondary" onClick={() => setBigQr(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </OrgShell>
  );
}
