/**
 * BadgeVerifyPage.tsx
 * -----------------------------------------------------------------------------
 * What a badge QR code opens. Public, no sign-in:
 *   /verify/church-member/:token   (current QR codes)
 *   /badges/verify/:token          (badges printed earlier)
 *
 * GREEN  verified active member
 * YELLOW pending, suspended or inactive membership
 * RED    invalid, revoked or expired badge
 *
 * Shows only what is printed on the badge and allowed by the church — never
 * contact details, addresses or notes.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CircleAlert, CircleCheck, CircleX, ShieldCheck } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { MEMBER_ROLE_LABELS } from "../types/organization.types";
import { Loading, OrgShell, errorText } from "../ui/OrgShell";
import { ChurchApiError } from "../api/organizationApi";
import { badgeApi, badgePhotoSrc, type BadgeCheck, type BadgeVerifyState } from "./badgeApi";
import "./Badges.scss";
import "./myBadge.scss";

const HEADLINE: Record<BadgeVerifyState, string> = {
  verified: "Verified Active Member",
  pending: "Membership Pending",
  suspended: "Badge Suspended",
  membership_inactive: "Membership Inactive",
  revoked: "Badge Revoked",
  expired: "Badge Expired",
  not_member: "Not a Current Member",
};

const EXPLAIN: Record<BadgeVerifyState, (org: string) => string> = {
  verified: (org) => `This person is an active member of ${org}.`,
  pending: (org) => `This membership is waiting for approval by ${org}.`,
  suspended: (org) => `${org} has suspended this badge. Don't accept it until it is reactivated.`,
  membership_inactive: (org) => `This person's membership with ${org} is currently inactive.`,
  revoked: (org) => `${org} has revoked this badge. It is no longer valid.`,
  expired: () => "This badge has passed its expiry date.",
  not_member: (org) => `This person is no longer a member of ${org}.`,
};

const fmt = (v?: string | null, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }) =>
  v ? new Intl.DateTimeFormat(undefined, opts).format(new Date(v)) : "—";

export default function BadgeVerifyPage(): React.JSX.Element {
  const { token = "" } = useParams<{ token: string }>();
  const [check, setCheck] = useState<BadgeCheck | null>(null);
  const [error, setError] = useState<{ notFound: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    badgeApi
      .verify(token)
      .then((c) => !cancelled && setCheck(c))
      .catch(
        (err) =>
          !cancelled &&
          setError({
            notFound: err instanceof ChurchApiError ? err.status === 404 : false,
            text: errorText(err, "This badge could not be checked."),
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const state: BadgeVerifyState | null = check ? (check.state ?? (check.valid ? "verified" : "membership_inactive")) : null;
  const tone = check?.tone ?? (state === "verified" ? "green" : "red");
  const Icon = tone === "green" ? CircleCheck : tone === "yellow" ? CircleAlert : CircleX;
  const photo = badgePhotoSrc(check?.avatarUrl);
  const logo = mediaUrl(check?.organizationLogoUrl);

  return (
    <OrgShell narrow>
      <div className="bv">
        <div className="bv__brand">
          <ShieldCheck aria-hidden="true" /> Fockis Badge Verification
        </div>

        {!check && !error && <Loading rows={1} />}

        {error && (
          <section className="bv__card bv__card--red" role="alert">
            <div className="bv__result">
              <CircleX aria-hidden="true" />
              <div>
                <h1>{error.notFound ? "Invalid Badge" : "Could not check this badge"}</h1>
                <p>
                  {error.notFound
                    ? "This QR code doesn't match any Fockis member badge. It may be fake, copied wrong, or replaced by a newer QR code."
                    : `${error.text} Check your connection and scan again.`}
                </p>
              </div>
            </div>
          </section>
        )}

        {check && state && (
          <section className={`bv__card bv__card--${tone}`}>
            <div className="bv__result" role="status">
              <Icon aria-hidden="true" />
              <div>
                <h1>{HEADLINE[state]}</h1>
                <p>{EXPLAIN[state](check.organizationName)}</p>
              </div>
            </div>

            <div className="bv__org">
              <span className="bv__logo">{logo ? <img src={logo} alt="" /> : check.organizationName.slice(0, 1)}</span>
              <div>
                <strong>{check.organizationName}</strong>
                {check.organizationLocation && <span>{check.organizationLocation}</span>}
              </div>
            </div>

            <div className="bv__who">
              {photo ? (
                <img src={photo} alt={`Photo of ${check.displayName}`} className={`bv__photo bv__photo--${check.photoShape ?? "circle"}`} />
              ) : (
                <span className="bv__photo bv__photo--circle bv__photo--none" aria-hidden="true">
                  {check.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <strong>{check.displayName}</strong>
                <span>{check.title || MEMBER_ROLE_LABELS[check.role as keyof typeof MEMBER_ROLE_LABELS] || check.role}</span>
              </div>
            </div>

            <dl className="bv__facts">
              <div>
                <dt>Member ID</dt>
                <dd>{check.memberNumber}</dd>
              </div>
              <div>
                <dt>Membership type</dt>
                <dd>{check.membershipType || "Member"}</dd>
              </div>
              {check.ministry && (
                <div>
                  <dt>Ministry</dt>
                  <dd>{check.ministry}</dd>
                </div>
              )}
              <div>
                <dt>Membership status</dt>
                <dd className={`bv__tone--${tone}`}>{HEADLINE[state]}</dd>
              </div>
              <div>
                <dt>Badge validity</dt>
                <dd className={`bv__tone--${tone}`}>{state === "verified" ? "Valid" : "Not valid"}{check.expiresAt ? ` · expires ${fmt(check.expiresAt)}` : ""}</dd>
              </div>
              {check.memberSince && (
                <div>
                  <dt>Member since</dt>
                  <dd>{fmt(check.memberSince, { month: "long", year: "numeric" })}</dd>
                </div>
              )}
              <div>
                <dt>Verified on</dt>
                <dd>{fmt(check.checkedAt, { dateStyle: "long", timeStyle: "short" })}</dd>
              </div>
            </dl>
            <p className="bv__hint">Make sure the photo matches the person showing the badge.</p>
          </section>
        )}
      </div>
    </OrgShell>
  );
}
