/**
 * BadgeVerifyPage.tsx
 * -----------------------------------------------------------------------------
 * /badges/verify/:token — what opens when someone scans a member badge.
 * No sign-in needed. Shows whether the badge is valid right now, plus the
 * same details printed on the badge.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { MEMBER_ROLE_LABELS } from "../types/organization.types";
import { typeLabel } from "../ui/orgCategories";
import { Loading, OrgShell, errorText } from "../ui/OrgShell";
import { badgeApi, badgePhotoSrc, type BadgeCheck } from "./badgeApi";
import "./Badges.scss";

export default function BadgeVerifyPage(): React.JSX.Element {
  const { token = "" } = useParams<{ token: string }>();
  const [check, setCheck] = useState<BadgeCheck | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    badgeApi
      .verify(token)
      .then((c) => !cancelled && setCheck(c))
      .catch((err) => !cancelled && setError(errorText(err, "This badge was not found.")));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <OrgShell narrow>
      {!check && !error && <Loading rows={1} />}

      {error && (
        <section className="fko-card badge-check badge-check--bad">
          <span className="badge-check__icon" aria-hidden="true">
            ✕
          </span>
          <h1 className="fko-title">Badge not found</h1>
          <p className="fko-muted">This QR code doesn't match any Fockis member badge. It may have been copied or typed wrong.</p>
        </section>
      )}

      {check && (
        <section className={"fko-card badge-check " + (check.valid ? "badge-check--ok" : "badge-check--bad")}>
          <span className="badge-check__icon" aria-hidden="true">
            {check.valid ? "✓" : "✕"}
          </span>
          <h1 className="fko-title">{check.valid ? "Valid member badge" : "This badge is no longer valid"}</h1>
          {!check.valid && <p className="fko-muted">This person is not an active member of {check.organizationName} anymore.</p>}

          <div className="badge-check__who">
            {check.avatarUrl ? (
              <img src={badgePhotoSrc(check.avatarUrl) ?? undefined} alt="" className="badge-check__photo" />
            ) : (
              <span className="badge-check__photo" aria-hidden="true">
                {check.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <strong>{check.displayName}</strong>
              <span>{MEMBER_ROLE_LABELS[check.role as keyof typeof MEMBER_ROLE_LABELS] ?? check.role}</span>
            </div>
          </div>

          <dl className="fko-kv">
            <div>
              <dt>Organization</dt>
              <dd>
                <Link to={`/organizations/${encodeURIComponent(check.organizationId)}`}>{check.organizationName}</Link>
                {check.organizationType ? ` · ${typeLabel(check.organizationType)}` : ""}
              </dd>
            </div>
            <div>
              <dt>Member number</dt>
              <dd>{check.memberNumber}</dd>
            </div>
            {check.memberSince && (
              <div>
                <dt>Member since</dt>
                <dd>{new Date(check.memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</dd>
              </div>
            )}
            <div>
              <dt>Checked</dt>
              <dd>{new Date(check.checkedAt).toLocaleString()}</dd>
            </div>
          </dl>
          <p className="fko-hint">Make sure the photo matches the person showing the badge.</p>
        </section>
      )}
    </OrgShell>
  );
}
