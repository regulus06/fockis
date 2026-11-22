/**
 * OrganizationAttendanceHubPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/attendance
 *
 * Attendance now lives in each ministry (one session per meeting date, QR,
 * manual and corrected check-ins). This page lists the organization's
 * ministries and opens each one's Attendance. The previous church-event
 * check-in page is still available at /organizations/:id/attendance/events.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CalendarCheck, ClipboardCheck, History, Loader2, UsersRound } from "lucide-react";

import { getOrganization } from "../api/organizationsApi";
import { getAuthToken } from "../api/organizationApi";
import { mediaUrl } from "../api/dashboardApi";
import type { Organization } from "../types/organization.types";
import OrgAppShell from "../ui/OrgAppShell";
import { termsFor } from "../ui/orgTerminology";
import { Alert, errorMessage } from "../ui/orgUi";
import { listPublicMinistries, type PublicMinistry } from "../website/publicSiteApi";
import "../styles/ChurchWebsite.scss";
import "../styles/MinistryPage.scss";
import "../styles/MinistryAttendance.scss";

type Org = Organization & {
  currentUserIsOwner?: boolean;
  viewer?: { isOwner?: boolean; isAdmin?: boolean; permissions?: Record<string, boolean | undefined> | null } | null;
  permissions?: Record<string, boolean | undefined> | null;
};

export default function OrganizationAttendanceHubPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [ministries, setMinistries] = useState<PublicMinistry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    (async () => {
      try {
        const [o, list] = await Promise.all([
          getAuthToken() ? (getOrganization(organizationId, c.signal) as Promise<Org>) : Promise.resolve(null),
          listPublicMinistries(organizationId, c.signal),
        ]);
        if (c.signal.aborted) return;
        setOrg(o);
        setMinistries(list);
      } catch (err) {
        if (!c.signal.aborted) setError(errorMessage(err, "Attendance could not be loaded."));
      }
    })();
    return () => c.abort();
  }, [organizationId]);

  const p = org?.viewer?.permissions ?? org?.permissions ?? {};
  const isAdmin = Boolean(org?.viewer?.isOwner || org?.currentUserIsOwner || org?.viewer?.isAdmin || p?.canRecordAttendance || p?.canViewAttendance);
  const t = termsFor(org?.organizationType);
  const shellOrg = org ? { id: org.id, name: org.name, organizationType: org.organizationType, logoUrl: org.logoUrl } : null;
  const ministryHref = (m: PublicMinistry) => `/organizations/${encodeURIComponent(organizationId)}/ministries/${encodeURIComponent(m.id)}?tab=attendance`;

  return (
    <OrgAppShell variant={isAdmin ? "admin" : "member"} organization={shellOrg}>
      <div className="cw ath">
        <section className="mp-card at-head">
          <div className="at-head__title">
            <CalendarCheck aria-hidden="true" />
            <div>
              <h2>{isAdmin ? "Attendance" : "My Attendance"}</h2>
              <p>
                Attendance is taken in each {t.department.toLowerCase()}: every meeting date has its own record, with QR check-in, manual entry and corrections.
              </p>
            </div>
          </div>
        </section>

        {error && <Alert tone="error">{error}</Alert>}

        {!ministries && !error ? (
          <div className="cw-loading">
            <Loader2 className="cw-spin" aria-hidden="true" /> Loading…
          </div>
        ) : ministries && ministries.length === 0 ? (
          <p className="mp-empty">
            No {t.departments.toLowerCase()} yet.
            {isAdmin && (
              <small>
                <Link to={`/organizations/${encodeURIComponent(organizationId)}/admin/departments`}>Create one</Link> to start taking attendance.
              </small>
            )}
          </p>
        ) : (
          <ul className="ath__list">
            {(ministries ?? []).map((m) => {
              const img = mediaUrl(m.photoUrl);
              return (
                <li key={m.id}>
                  <Link to={ministryHref(m)} className="mp-card ath__item">
                    <span className="ath__img" style={img ? { backgroundImage: `url("${img}")` } : undefined}>
                      {!img && <UsersRound aria-hidden="true" />}
                    </span>
                    <span className="ath__body">
                      <strong>{m.name}</strong>
                      <small>{isAdmin ? "Take attendance, QR check-in, history and reports" : "Check in and see your attendance"}</small>
                    </span>
                    <span className="cw-btn cw-btn--primary cw-btn--sm">
                      <ClipboardCheck aria-hidden="true" /> {isAdmin ? "Open Attendance" : "My Attendance"} <ArrowRight aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <p className="at-caption ath__legacy">
          <History aria-hidden="true" /> Looking for check-ins recorded on church events before this update?{" "}
          <Link to={`/organizations/${encodeURIComponent(organizationId)}/attendance/events`}>Open the previous event attendance page</Link>.
        </p>
      </div>
    </OrgAppShell>
  );
}
