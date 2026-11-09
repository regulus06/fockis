/**
 * OrganizationJoinPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/join
 *
 * The page an organization's shareable join link opens. The person signs in
 * (if needed), adds a phone number and a short message, and sends a request.
 *
 *   - Organizations that require approval: the request appears in
 *     Admin → Members → Membership requests, with the message and phone.
 *   - Organizations that don't: the person becomes a member right away.
 * -----------------------------------------------------------------------------
 */

import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import OrganizationHeader from "../components/OrganizationHeader";
import OrganizationTypeBadge from "../components/OrganizationTypeBadge";
import { joinOrganization } from "../api/organizationsApi";
import { ChurchApiError, ChurchAuthError, getAuthToken } from "../api/organizationApi";
import { publicOrganizationApi } from "../api/visitsApi";
import { MembershipStatus, type Organization } from "../types/organization.types";
import "../styles/OrganizationForms.scss";

type Viewer = { isAuthenticated?: boolean };
type LoadedOrganization = Organization & { viewer?: Viewer; settings?: { requireApproval?: boolean } };

function errorText(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export default function OrganizationJoinPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<LoadedOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"pending" | "active" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    publicOrganizationApi.get(organizationId)
      .then((o) => {
        if (!cancelled) setOrg(o as LoadedOrganization);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorText(err, "This organization could not be found."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const status = org?.currentUserMembershipStatus ?? null;
  // A saved Fockis session on this device (the server checks it again on send).
  const signedIn = Boolean(getAuthToken()) && org?.viewer?.isAuthenticated !== false;
  const loginPath = "/login?returnTo=" + encodeURIComponent(`/organizations/${organizationId}/join`);
  const orgPath = `/organizations/${encodeURIComponent(organizationId)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await joinOrganization(org.id, { phone: phone.trim(), message: message.trim(), source: "link" });
      setResult(res.membershipStatus === MembershipStatus.Active ? "active" : "pending");
    } catch (err) {
      if (err instanceof ChurchAuthError) {
        navigate(loginPath);
        return;
      }
      if (err instanceof ChurchApiError && /already have a membership/i.test(err.message)) {
        setResult("pending");
        return;
      }
      setError(errorText(err, "Your request could not be sent. Please try again."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="church-page fko-page">
      <OrganizationHeader organizationId={organizationId} organizationName={org?.name} />

      <main className="fko-narrow">
        {loading && <div className="fko-card fko-muted">Loading…</div>}

        {!loading && loadError && (
          <div className="fko-card">
            <h1 className="fko-title">Organization not found</h1>
            <p className="fko-muted">{loadError}</p>
            <Link to="/organizations" className="fko-btn fko-btn--primary">
              Browse organizations
            </Link>
          </div>
        )}

        {!loading && org && (
          <div className="fko-card">
            <div className="fko-org">
              {org.logoUrl ? (
                <img src={org.logoUrl} alt="" className="fko-org__logo" />
              ) : (
                <span className="fko-org__logo fko-org__logo--empty" aria-hidden="true">
                  {org.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <span className="fko-eyebrow">Join</span>
                <h1 className="fko-title">{org.name}</h1>
                <OrganizationTypeBadge organizationType={org.organizationType} size="sm" />
              </div>
            </div>

            {org.description && <p className="fko-muted fko-clamp">{org.description}</p>}

            {result === "active" || status === MembershipStatus.Active ? (
              <div className="fko-notice fko-notice--success" role="status">
                <strong>You're a member of {org.name}.</strong>
                <span>Open your member portal to see groups, events and your history.</span>
                <div className="fko-actions">
                  <Link to={`/organization/me?organizationId=${encodeURIComponent(org.id)}`} className="fko-btn fko-btn--primary">
                    Open member portal
                  </Link>
                  <Link to={orgPath} className="fko-btn fko-btn--secondary">
                    View organization
                  </Link>
                </div>
              </div>
            ) : result === "pending" || status === MembershipStatus.Pending ? (
              <div className="fko-notice" role="status">
                <strong>Your request was sent.</strong>
                <span>
                  {org.name} will review it. You'll become a member once they approve you.
                </span>
                <div className="fko-actions">
                  <Link to={orgPath} className="fko-btn fko-btn--secondary">
                    View organization
                  </Link>
                </div>
              </div>
            ) : !signedIn ? (
              <div className="fko-notice">
                <strong>Sign in to ask to join.</strong>
                <span>You need a Fockis account so {org.name} knows who you are.</span>
                <div className="fko-actions">
                  <Link to={loginPath} className="fko-btn fko-btn--primary">
                    Sign in
                  </Link>
                  <Link to={"/register?returnTo=" + encodeURIComponent(`/organizations/${organizationId}/join`)} className="fko-btn fko-btn--secondary">
                    Create an account
                  </Link>
                </div>
              </div>
            ) : (
              <form className="fko-form" onSubmit={submit}>
                <label className="fko-field">
                  <span>Phone number</span>
                  <input
                    className="church-input"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={40}
                    placeholder="Optional"
                  />
                </label>
                <label className="fko-field">
                  <span>Message to {org.name}</span>
                  <textarea
                    className="church-input"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={1000}
                    placeholder="Tell them a little about yourself and why you'd like to join (optional)."
                  />
                </label>
                <p className="fko-hint">
                  {org.name} will see your name, profile picture, email, and what you write here.
                </p>
                {error && (
                  <p className="fko-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="fko-actions">
                  <button type="submit" className="fko-btn fko-btn--primary" disabled={sending}>
                    {sending ? "Sending…" : "Ask to join"}
                  </button>
                  <Link to={orgPath} className="fko-btn fko-btn--secondary">
                    Cancel
                  </Link>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
