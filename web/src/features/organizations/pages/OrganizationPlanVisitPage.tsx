/**
 * OrganizationPlanVisitPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/visit
 *
 * "Plan a visit" for any organization: a church service, a school tour, an
 * office visit… The request is saved and shows up for the organization in
 * Admin → Visit requests. Signed-in visitors also see it in their portal.
 *
 * Locations come from the organization's own branches (with their service
 * times when they have them). Nothing here is sample data.
 * -----------------------------------------------------------------------------
 */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import OrganizationHeader from "../components/OrganizationHeader";
import { publicOrganizationApi, visitsApi, type VisitRequest } from "../api/visitsApi";
import type { Branch, Organization } from "../types/organization.types";
import "../styles/OrganizationForms.scss";

const FAITH_TYPES = new Set([
  "church", "christian_church", "christian_ministry", "christian_fellowship", "mission",
  "prayer_organization", "christian_network", "christian_nonprofit", "bible_study_organization",
  "mosque", "islamic_organization", "synagogue", "jewish_organization", "temple",
  "religious_organization", "religious_institution", "faith_organization",
]);

interface FormState {
  branchId: string;
  visitDate: string;
  visitTime: string;
  adults: string;
  children: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accessibility: string;
  notes: string;
}

const EMPTY: FormState = {
  branchId: "",
  visitDate: "",
  visitTime: "",
  adults: "1",
  children: "0",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  accessibility: "",
  notes: "",
};

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function longDate(value: string): string {
  if (!value) return "";
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function OrganizationPlanVisitPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();

  const [org, setOrg] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<VisitRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      publicOrganizationApi.get(organizationId),
      publicOrganizationApi.branches(organizationId),
    ])
      .then(([o, b]) => {
        if (cancelled) return;
        setOrg(o);
        const list = Array.isArray(b) && b.length ? b : Array.isArray(o.branches) ? o.branches : [];
        setBranches(list);
        const main = list.find((x) => x.isMainLocation) ?? list[0];
        if (main) setForm((f) => ({ ...f, branchId: main.id }));
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

  const isFaith = FAITH_TYPES.has(String(org?.organizationType ?? ""));
  const branch = useMemo(() => branches.find((b) => b.id === form.branchId) ?? null, [branches, form.branchId]);
  const serviceTimes = (branch?.serviceTimes ?? []).filter(Boolean);
  const orgPath = `/organizations/${encodeURIComponent(organizationId)}`;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!org || sending) return;
    if (!form.email.trim() && !form.phone.trim()) {
      setError("Enter an email or a phone number so they can reach you.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await visitsApi.submit(org.id, {
        branchId: form.branchId || undefined,
        visitDate: form.visitDate,
        visitTime: form.visitTime.trim(),
        adults: Number(form.adults) || 1,
        children: Number(form.children) || 0,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        accessibility: form.accessibility.trim(),
        notes: form.notes.trim(),
      });
      setSent(res.visit);
    } catch (err) {
      setError(errorText(err, "Your visit request could not be sent. Please try again."));
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

        {!loading && org && sent && (
          <div className="fko-card">
            <span className="fko-eyebrow">Request sent</span>
            <h1 className="fko-title">Thanks, {sent.firstName}!</h1>
            <p className="fko-muted">
              {org.name} received your visit request and will contact you
              {sent.email ? ` at ${sent.email}` : sent.phone ? ` at ${sent.phone}` : ""}.
            </p>
            <dl className="fko-summary">
              <div>
                <dt>Day</dt>
                <dd>{longDate(sent.visitDate)}</dd>
              </div>
              {sent.visitTime && (
                <div>
                  <dt>Time</dt>
                  <dd>{sent.visitTime}</dd>
                </div>
              )}
              {sent.branchName && (
                <div>
                  <dt>Location</dt>
                  <dd>{sent.branchName}</dd>
                </div>
              )}
              <div>
                <dt>Group</dt>
                <dd>
                  {sent.adults} adult{sent.adults === 1 ? "" : "s"}
                  {sent.children ? `, ${sent.children} child${sent.children === 1 ? "" : "ren"}` : ""}
                </dd>
              </div>
            </dl>
            <div className="fko-actions">
              <Link to={orgPath} className="fko-btn fko-btn--primary">
                Back to {org.name}
              </Link>
              <button
                type="button"
                className="fko-btn fko-btn--secondary"
                onClick={() => {
                  setSent(null);
                  setForm((f) => ({ ...EMPTY, branchId: f.branchId }));
                }}
              >
                Plan another visit
              </button>
            </div>
          </div>
        )}

        {!loading && org && !sent && (
          <form className="fko-card fko-form" onSubmit={submit}>
            <div>
              <span className="fko-eyebrow">{isFaith ? "New here?" : "Visit"}</span>
              <h1 className="fko-title">{isFaith ? "Plan your visit" : "Plan a visit"} to {org.name}</h1>
              <p className="fko-muted">
                Tell {org.name} when you'd like to come. They'll get back to you to confirm.
              </p>
            </div>

            <fieldset className="fko-fieldset">
              <legend>When</legend>
              {branches.length > 1 && (
                <label className="fko-field">
                  <span>Location</span>
                  <select className="church-input" value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                        {b.isMainLocation ? " (main)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {branches.length === 1 && branch && (
                <p className="fko-hint">Location: {branch.name}</p>
              )}
              <div className="fko-row">
                <label className="fko-field">
                  <span>Day *</span>
                  <input
                    className="church-input"
                    type="date"
                    required
                    min={localToday()}
                    value={form.visitDate}
                    onChange={(e) => set("visitDate", e.target.value)}
                  />
                </label>
                <label className="fko-field">
                  <span>Time</span>
                  {serviceTimes.length ? (
                    <select className="church-input" value={form.visitTime} onChange={(e) => set("visitTime", e.target.value)}>
                      <option value="">Any time</option>
                      {serviceTimes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="church-input"
                      type="text"
                      maxLength={40}
                      placeholder="e.g. 10:00 AM or morning"
                      value={form.visitTime}
                      onChange={(e) => set("visitTime", e.target.value)}
                    />
                  )}
                </label>
              </div>
              <div className="fko-row">
                <label className="fko-field">
                  <span>Adults</span>
                  <input className="church-input" type="number" min={1} max={50} value={form.adults} onChange={(e) => set("adults", e.target.value)} />
                </label>
                <label className="fko-field">
                  <span>Children</span>
                  <input className="church-input" type="number" min={0} max={50} value={form.children} onChange={(e) => set("children", e.target.value)} />
                </label>
              </div>
            </fieldset>

            <fieldset className="fko-fieldset">
              <legend>About you</legend>
              <div className="fko-row">
                <label className="fko-field">
                  <span>First name *</span>
                  <input className="church-input" required maxLength={80} autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                </label>
                <label className="fko-field">
                  <span>Last name</span>
                  <input className="church-input" maxLength={80} autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                </label>
              </div>
              <div className="fko-row">
                <label className="fko-field">
                  <span>Email</span>
                  <input className="church-input" type="email" maxLength={160} autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </label>
                <label className="fko-field">
                  <span>Phone</span>
                  <input className="church-input" type="tel" maxLength={40} autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </label>
              </div>
              <p className="fko-hint">Give an email or a phone number (or both) so they can confirm.</p>
            </fieldset>

            <fieldset className="fko-fieldset">
              <legend>Anything else?</legend>
              <label className="fko-field">
                <span>Accessibility or special needs</span>
                <input className="church-input" maxLength={500} value={form.accessibility} onChange={(e) => set("accessibility", e.target.value)} placeholder="Wheelchair access, parking, translation…" />
              </label>
              <label className="fko-field">
                <span>Message</span>
                <textarea className="church-input" rows={3} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Questions or anything they should know" />
              </label>
            </fieldset>

            {error && (
              <p className="fko-error" role="alert">
                {error}
              </p>
            )}

            <div className="fko-actions">
              <button type="submit" className="fko-btn fko-btn--primary" disabled={sending}>
                {sending ? "Sending…" : "Send visit request"}
              </button>
              <Link to={orgPath} className="fko-btn fko-btn--secondary">
                Cancel
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
