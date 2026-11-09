/**
 * OrganizationBadgesPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin/badges — member badges (ID cards).
 *
 *   - Choose one of four templates, the colour, the title ("Member",
 *     "Staff", "Student"…), the number prefix and which details show.
 *   - See every active member's badge; badges are made automatically when
 *     someone becomes a member ("Make badges for everyone" covers members
 *     who joined before badges existed).
 *   - Print one badge or all badges on the page at real ID-card size.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrganization } from "../api/organizationsApi";
import type { Organization } from "../types/organization.types";
import BadgeCard, { sampleBadge } from "../badges/BadgeCard";
import BadgePhotoButton from "../badges/BadgePhotoButton";
import { BADGE_TEMPLATES, DEFAULT_DESIGN, badgeApi, type Badge, type BadgeDesign } from "../badges/badgeApi";
import { Empty, ErrorNote, Loading, OrgShell, PageHead, Section, errorText, orgPath } from "../ui/OrgShell";

const TOGGLES: [keyof BadgeDesign, string][] = [
  ["showRole", "Role"],
  ["showMemberSince", "Member since (year)"],
  ["showDepartments", "Departments"],
  ["showGroups", "Groups"],
  ["showMemberDomain", "Fockis member address"],
];

const TITLES = ["Member", "Staff", "Volunteer", "Student", "Leader", "Visitor"];

export default function OrganizationBadgesPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();

  const [org, setOrg] = useState<Organization | null>(null);
  const [saved, setSaved] = useState<BadgeDesign | null>(null);
  const [draft, setDraft] = useState<BadgeDesign>(DEFAULT_DESIGN);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState<Badge[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getOrganization(organizationId), badgeApi.design(organizationId)])
      .then(([o, d]) => {
        if (cancelled) return;
        setOrg(o);
        setSaved(d);
        setDraft(d);
      })
      .catch((err) => !cancelled && setError(errorText(err, "Badges could not be loaded.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const loadList = useCallback(
    async (nextPage: number, search: string) => {
      setListLoading(true);
      try {
        const res = await badgeApi.list(organizationId, search, nextPage, 24);
        setBadges(res.items);
        setTotal(res.total);
        setPage(res.page);
        setHasMore(res.hasMore);
      } catch (err) {
        setError(errorText(err, "Member badges could not be loaded."));
      } finally {
        setListLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    if (!saved?.canEdit) return;
    const t = window.setTimeout(() => void loadList(1, q.trim()), q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [saved?.canEdit, q, loadList]);

  // Print after the print area has rendered.
  useEffect(() => {
    if (!printing) return;
    const t = window.setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 150);
    return () => window.clearTimeout(t);
  }, [printing]);

  const preview = useMemo(
    () => badges[0] ?? sampleBadge(org?.name ?? "Your organization", org?.organizationType ?? null, saved?.effectivePrefix ?? "ORG"),
    [badges, org, saved?.effectivePrefix],
  );

  const dirty = saved !== null && JSON.stringify(pick(saved)) !== JSON.stringify(pick(draft));

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = await badgeApi.saveDesign(organizationId, pick(draft));
      setSaved(next);
      setDraft(next);
      setNotice("Badge design saved. Every member's badge now uses it.");
      if (next.numberPrefix !== saved?.numberPrefix) void loadList(page, q.trim());
    } catch (err) {
      setError(errorText(err, "The design could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  async function issueAll() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await badgeApi.issueAll(organizationId);
      setNotice(`Badges ready for ${res.issued} of ${res.total} active member${res.total === 1 ? "" : "s"}.`);
      void loadList(1, q.trim());
    } catch (err) {
      setError(errorText(err, "Badges could not be made."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <OrgShell organizationId={organizationId}>
        <Loading rows={4} />
      </OrgShell>
    );
  }

  if (!saved?.canEdit) {
    return (
      <OrgShell organizationId={organizationId} organizationName={org?.name}>
        <Empty title="Only admins can manage member badges" text={error ?? "Ask the owner of this organization for admin access."}>
          <Link to={orgPath(organizationId, "/my-badge")} className="fko-btn fko-btn--primary">
            See my badge
          </Link>
        </Empty>
      </OrgShell>
    );
  }

  return (
    <OrgShell organizationId={organizationId} organizationName={org?.name}>
      <PageHead
        eyebrow={`${org?.name ?? ""} · Admin`}
        title="Member badges"
        subtitle="Every member gets an ID badge with their photo, member number and a QR code that anyone can scan to check it's valid. New members get theirs automatically."
        actions={
          <Link to={orgPath(organizationId, "/admin")} className="fko-btn fko-btn--secondary">
            ← Admin dashboard
          </Link>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && (
        <div className="fko-notice fko-notice--success" role="status">
          {notice}
        </div>
      )}

      <Section title="1. Choose a template" card>
        <div className="badge-template-grid">
          {BADGE_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={"badge-template" + (draft.template === t.id ? " is-selected" : "")}
              onClick={() => setDraft((d) => ({ ...d, template: t.id }))}
              aria-pressed={draft.template === t.id}
            >
              <BadgeCard badge={preview} design={{ ...draft, template: t.id }} />
              <strong>
                {draft.template === t.id ? "✓ " : ""}
                {t.name}
              </strong>
              <small>{t.description}</small>
            </button>
          ))}
        </div>
      </Section>

      <Section title="2. Details" card>
        <div className="badge-options">
          <label className="fko-field">
            <span>Colour</span>
            <span className="badge-color">
              <input type="color" value={draft.accentColor} onChange={(e) => setDraft((d) => ({ ...d, accentColor: e.target.value }))} aria-label="Badge colour" />
              <input
                className="church-input"
                value={draft.accentColor}
                maxLength={7}
                onChange={(e) => setDraft((d) => ({ ...d, accentColor: e.target.value }))}
                aria-label="Colour code"
              />
            </span>
          </label>
          <label className="fko-field">
            <span>Title on the badge</span>
            <input className="church-input" list="badge-titles" maxLength={30} value={draft.badgeTitle} onChange={(e) => setDraft((d) => ({ ...d, badgeTitle: e.target.value }))} />
            <datalist id="badge-titles">
              {TITLES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="fko-field">
            <span>Member number starts with</span>
            <input
              className="church-input"
              maxLength={6}
              placeholder={saved.effectivePrefix || "ORG"}
              value={draft.numberPrefix}
              onChange={(e) => setDraft((d) => ({ ...d, numberPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
            />
          </label>
          <label className="fko-field">
            <span>Bottom line (optional)</span>
            <input className="church-input" maxLength={80} placeholder="A motto, a verse, “If found, call …”" value={draft.footerText} onChange={(e) => setDraft((d) => ({ ...d, footerText: e.target.value }))} />
          </label>
        </div>
        <div className="fko-actions" style={{ gap: 18 }}>
          <span className="fko-hint">Show on the badge:</span>
          {TOGGLES.map(([key, label]) => (
            <label key={key} className="badge-toggle">
              <input type="checkbox" checked={Boolean(draft[key])} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))} />
              {label}
            </label>
          ))}
        </div>
        <div className="fko-split" style={{ alignItems: "center" }}>
          <div className="fko-actions">
            <button type="button" className="fko-btn fko-btn--primary" disabled={!dirty || busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save design"}
            </button>
            {dirty && (
              <button type="button" className="fko-btn fko-btn--ghost" onClick={() => setDraft(saved)}>
                Undo changes
              </button>
            )}
            {!/^#[0-9a-fA-F]{6}$/.test(draft.accentColor) && <span className="fko-hint">Use a colour like #005a8d.</span>}
          </div>
          <div className="badge-zoom" style={{ justifySelf: "center" }}>
            <BadgeCard badge={preview} design={draft} />
          </div>
        </div>
      </Section>

      <Section
        title={`3. Members' badges${total ? ` (${total})` : ""}`}
        card
        action={
          <div className="fko-actions">
            <button type="button" className="fko-btn fko-btn--secondary fko-btn--sm" disabled={busy} onClick={() => void issueAll()}>
              Make badges for everyone
            </button>
            <button type="button" className="fko-btn fko-btn--primary fko-btn--sm" disabled={!badges.length} onClick={() => setPrinting(badges)}>
              🖨 Print these {badges.length}
            </button>
          </div>
        }
      >
        <input className="church-input fko-search" type="search" placeholder="Search members" value={q} onChange={(e) => setQ(e.target.value)} />
        {listLoading ? (
          <Loading rows={3} />
        ) : badges.length === 0 ? (
          <p className="fko-muted">
            {q ? "No member matches." : "No badges yet. Approved members get one automatically, or click “Make badges for everyone”."}
          </p>
        ) : (
          <div className="badge-sheet">
            {badges.map((b) => (
              <div key={b.id} className="badge-item">
                <BadgeCard badge={b} design={saved} />
                <BadgePhotoButton
                  badge={b}
                  compact
                  showRemove={false}
                  onChange={(next) => setBadges((list) => list.map((x) => (x.id === b.id ? next : x)))}
                />
                <button type="button" className="fko-btn fko-btn--ghost fko-btn--sm" onClick={() => setPrinting([b])}>
                  🖨 Print
                </button>
              </div>
            ))}
          </div>
        )}
        {(page > 1 || hasMore) && (
          <nav className="fko-pager">
            <button type="button" className="fko-btn fko-btn--secondary fko-btn--sm" disabled={page <= 1} onClick={() => void loadList(page - 1, q.trim())}>
              ← Previous
            </button>
            <span>Page {page}</span>
            <button type="button" className="fko-btn fko-btn--secondary fko-btn--sm" disabled={!hasMore} onClick={() => void loadList(page + 1, q.trim())}>
              Next →
            </button>
          </nav>
        )}
        <p className="fko-hint">
          Prints at real ID-card size (85.6 × 54 mm). In the print window, set scale to 100% and turn on “Background graphics” for colours.
        </p>
      </Section>

      {printing && (
        <div className="badge-print-only badge-print-area" aria-hidden="true">
          {printing.map((b) => (
            <BadgeCard key={b.id} badge={b} design={saved} />
          ))}
        </div>
      )}
    </OrgShell>
  );
}

function pick(d: BadgeDesign): Partial<BadgeDesign> {
  return {
    template: d.template,
    accentColor: d.accentColor,
    badgeTitle: d.badgeTitle,
    numberPrefix: d.numberPrefix,
    showRole: d.showRole,
    showMemberSince: d.showMemberSince,
    showDepartments: d.showDepartments,
    showGroups: d.showGroups,
    showMemberDomain: d.showMemberDomain,
    footerText: d.footerText,
  };
}
