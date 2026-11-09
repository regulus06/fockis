/**
 * OrganizationPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId — an organization's public page.
 *
 * Everyone: cover, name and type, about, contact, locations and service
 * times, leadership, "Plan a visit" and "Ask to join".
 * Members (by permission): upcoming events, groups, departments, members,
 * and the live service when one is on.
 * Owner / media admins: change or remove the cover.
 *
 * Section ids (overview, leadership, branches, departments, groups, members,
 * events, live, plan-visit) match the organization side menu links.
 * -----------------------------------------------------------------------------
 */

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getOrganizationEvents } from "../../events/services/eventsApi";
import type { FockisEvent } from "../../events/types/event.types";
import {
  deleteOrganizationCover,
  getOrganization,
  leaveOrganization,
  uploadOrganizationCover,
} from "../api/organizationsApi";
import { listDepartments } from "../api/departmentsApi";
import { listGroups } from "../api/groupsApi";
import { listMembers } from "../api/membersApi";
import { getCurrentLiveService } from "../api/organizationLiveApi";
import { publicOrganizationApi } from "../api/visitsApi";
import { getAuthToken } from "../api/organizationApi";
import {
  GROUP_TYPE_LABELS,
  MembershipStatus,
  type ChurchGroup,
  type Department,
  type LiveEvent,
  type Member,
  type Organization,
} from "../types/organization.types";
import { CATEGORY_ICONS, typeLabel, wordingFor } from "../ui/orgCategories";
import { Empty, Loading, OrgLogo, OrgShell, Section, errorText, orgPath } from "../ui/OrgShell";

type Permissions = Record<string, boolean | undefined>;
type Viewer = { isAuthenticated?: boolean; isActiveMember?: boolean; isOwner?: boolean; permissions?: Permissions | null };
type Org = Organization & {
  bannerUrl?: string | null;
  bannerMediaType?: "image" | "video" | null;
  currentUserIsOwner?: boolean;
  viewer?: Viewer | null;
  permissions?: Permissions | null;
  memberCount?: number;
};

const MAX_COVER = 100 * 1024 * 1024;

function safeUrl(value?: string): string | null {
  if (!value) return null;
  const v = value.trim();
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function eventWhen(e: FockisEvent): string {
  const d = new Date(e.startDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function initials(name?: string) {
  return (name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function OrganizationPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<ChurchGroup[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<FockisEvent[]>([]);
  const [live, setLive] = useState<LiveEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // Signed-in people get their membership and permissions back; guests see the public page.
        const o = (getAuthToken()
          ? await getOrganization(organizationId, controller.signal)
          : await publicOrganizationApi.get(organizationId)) as Org;
        if (controller.signal.aborted) return;
        setOrg(o);

        const p = o.viewer?.permissions ?? o.permissions ?? {};
        const owner = o.viewer?.isOwner === true || o.currentUserIsOwner === true;
        const can = (...keys: string[]) => owner || keys.some((k) => p?.[k] === true);

        const jobs: [string, Promise<unknown>][] = [];
        if (can("canViewDepartments", "canManageDepartments", "canViewOrganization"))
          jobs.push(["departments", listDepartments(organizationId, { page: 1, pageSize: 6 }, controller.signal)]);
        if (can("canViewGroups", "canManageGroups", "canViewOrganization"))
          jobs.push(["groups", listGroups(organizationId, { page: 1, pageSize: 6 }, controller.signal)]);
        if (can("canViewMembers", "canViewMemberDirectory", "canManageMembers"))
          jobs.push(["members", listMembers(organizationId, { page: 1, pageSize: 8, status: MembershipStatus.Active }, controller.signal)]);
        if (can("canViewEvents", "canManageEvents", "canViewOrganization")) jobs.push(["events", getOrganizationEvents(organizationId)]);
        if (can("canViewLive", "canManageLive", "canViewOrganization")) jobs.push(["live", getCurrentLiveService(organizationId, controller.signal)]);

        const results = await Promise.allSettled(jobs.map((j) => j[1]));
        if (controller.signal.aborted) return;
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return;
          const v = r.value as any;
          const items = Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : [];
          switch (jobs[i][0]) {
            case "departments":
              setDepartments(items);
              break;
            case "groups":
              setGroups(items);
              break;
            case "members":
              setMembers(items);
              break;
            case "events":
              setEvents(
                (items as FockisEvent[])
                  .filter((e) => new Date(e.endDate || e.startDate).getTime() >= Date.now() - 3 * 3600_000)
                  .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))
                  .slice(0, 5),
              );
              break;
            case "live":
              setLive((v as LiveEvent | null) ?? null);
              break;
          }
        });
      } catch (err) {
        if (!controller.signal.aborted) setError(errorText(err, "This organization could not be loaded."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [organizationId]);

  const access = useMemo(() => {
    const v = org?.viewer ?? {};
    const p = v.permissions ?? org?.permissions ?? {};
    const status = org?.currentUserMembershipStatus ?? null;
    const isOwner = v.isOwner === true || org?.currentUserIsOwner === true;
    const isMember = v.isActiveMember === true || status === MembershipStatus.Active || isOwner;
    const isAdmin =
      isOwner ||
      Object.entries(p ?? {}).some(([k, val]) => val === true && k.startsWith("canManage"));
    return {
      isOwner,
      isMember,
      isPending: status === MembershipStatus.Pending,
      isAdmin,
      canCover: isOwner || p?.canManageMedia === true,
      signedIn: Boolean(getAuthToken()),
    };
  }, [org]);

  async function onCover(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !org) return;
    if (!/^(image|video)\//.test(file.type)) return setNotice("Choose a picture or a video.");
    if (file.size > MAX_COVER) return setNotice("That file is larger than 100 MB.");
    setBusy(true);
    setNotice(null);
    try {
      const res = await uploadOrganizationCover(org.id, file);
      setOrg((o) => (o ? { ...o, bannerUrl: res.bannerUrl ?? o.bannerUrl, bannerMediaType: (res.bannerMediaType as any) ?? o.bannerMediaType } : o));
      setNotice("Cover updated.");
    } catch (err) {
      setNotice(errorText(err, "The cover could not be uploaded."));
    } finally {
      setBusy(false);
    }
  }

  async function removeCover() {
    if (!org || !window.confirm("Remove the cover?")) return;
    setBusy(true);
    try {
      await deleteOrganizationCover(org.id);
      setOrg((o) => (o ? { ...o, bannerUrl: null, bannerMediaType: null } : o));
      setNotice("Cover removed.");
    } catch (err) {
      setNotice(errorText(err, "The cover could not be removed."));
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!org || !window.confirm(`Leave ${org.name}?`)) return;
    setBusy(true);
    try {
      await leaveOrganization(org.id);
      setOrg((o) => (o ? { ...o, currentUserMembershipStatus: null, viewer: { ...o.viewer, isActiveMember: false, permissions: null } } : o));
      setGroups([]);
      setDepartments([]);
      setMembers([]);
      setEvents([]);
      setLive(null);
    } catch (err) {
      setNotice(errorText(err, "You could not leave this organization."));
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <OrgShell organizationId={organizationId}>
        <Loading rows={4} />
      </OrgShell>
    );

  if (error || !org)
    return (
      <OrgShell>
        <Empty title="Organization not found" text={error ?? undefined}>
          <Link to="/organizations" className="fko-btn fko-btn--primary">
            Browse organizations
          </Link>
        </Empty>
      </OrgShell>
    );

  const w = wordingFor(org.organizationType);
  const website = safeUrl(org.website || org.contact?.website);
  const socials = Object.entries(org.contact?.socialLinks ?? {}).filter(([, v]) => v) as [string, string][];
  const branches = org.branches ?? [];
  const leaders = org.leadership ?? [];
  const city = branches.find((b) => b.isMainLocation)?.address?.city ?? branches[0]?.address?.city;
  const memberCount = org.counts?.members ?? org.memberCount;

  return (
    <OrgShell organizationId={org.id} organizationName={org.name}>
      {org.bannerUrl &&
        (org.bannerMediaType === "video" ? (
          <video className="fko-cover" src={org.bannerUrl} autoPlay muted loop playsInline style={{ objectFit: "cover", width: "100%" }} />
        ) : (
          <div className="fko-cover" style={{ backgroundImage: `url("${org.bannerUrl}")` }} />
        ))}

      <section className="fko-hero" id="overview">
        {org.logoUrl ? (
          <OrgLogo name={org.name} url={org.logoUrl} className="fko-hero__logo" />
        ) : (
          <span className="fko-hero__logo" aria-hidden="true">
            {CATEGORY_ICONS[w.category]}
          </span>
        )}
        <div className="fko-hero__text">
          <span className="fko-eyebrow">{typeLabel(org.organizationType)}</span>
          <h1 className="fko-title">{org.name}</h1>
          <div className="fko-hero__meta">
            {city && <span>📍 {city}</span>}
            {typeof memberCount === "number" && memberCount > 0 && (
              <span>
                👥 {memberCount} member{memberCount === 1 ? "" : "s"}
              </span>
            )}
            {access.isOwner ? (
              <span className="fko-badge fko-badge--ok">Owner</span>
            ) : access.isMember ? (
              <span className="fko-badge fko-badge--ok">You're a member</span>
            ) : access.isPending ? (
              <span className="fko-badge fko-badge--warn">Request sent</span>
            ) : null}
          </div>
        </div>
        <div className="fko-hero__actions">
          <Link to={orgPath(org.id, "/visit")} className="fko-btn fko-btn--primary">
            📅 {w.visitTitle}
          </Link>
          {access.isAdmin ? (
            <Link to={orgPath(org.id, "/admin")} className="fko-btn fko-btn--secondary">
              Admin
            </Link>
          ) : access.isMember ? (
            <Link to={`/organization/me?organizationId=${encodeURIComponent(org.id)}`} className="fko-btn fko-btn--secondary">
              Member portal
            </Link>
          ) : access.isPending ? (
            <span className="fko-btn fko-btn--secondary" aria-disabled="true">
              Request sent
            </span>
          ) : (
            <Link to={orgPath(org.id, "/join")} className="fko-btn fko-btn--secondary">
              Ask to join
            </Link>
          )}
        </div>
      </section>

      {(access.canCover || notice) && (
        <div className="fko-actions">
          {access.canCover && (
            <>
              <input ref={fileInput} type="file" accept="image/*,video/*" hidden onChange={onCover} />
              <button type="button" className="fko-btn fko-btn--secondary fko-btn--sm" disabled={busy} onClick={() => fileInput.current?.click()}>
                {busy ? "Uploading…" : org.bannerUrl ? "Change cover" : "Add a cover picture"}
              </button>
              {org.bannerUrl && (
                <button type="button" className="fko-btn fko-btn--ghost fko-btn--sm" disabled={busy} onClick={removeCover}>
                  Remove cover
                </button>
              )}
            </>
          )}
          {notice && <span className="fko-hint">{notice}</span>}
        </div>
      )}

      {live && (
        <Link to={orgPath(org.id, "/live")} className="fko-card fko-live" id="live">
          <span className="fko-badge fko-badge--live">● LIVE</span>
          <strong>{live.title}</strong>
          <span className="fko-btn fko-btn--primary fko-btn--sm">Watch now</span>
        </Link>
      )}

      <div className="fko-split">
        <div className="fko-content">
          <Section title="About" card>
            <p className="fko-prose">{org.description || `${org.name} hasn't added a description yet.`}</p>
          </Section>

          {events.length > 0 && (
            <Section
              title="Upcoming events"
              card
              action={
                <Link to={orgPath(org.id, "/events")} className="fko-btn fko-btn--ghost fko-btn--sm">
                  All events →
                </Link>
              }
            >
              <ul className="fko-rows" id="events">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link to={`/events/${encodeURIComponent(e.id)}`}>
                      <strong>{e.title}</strong>
                      <span className="fko-hint">
                        {eventWhen(e)}
                        {e.isOnline ? " · Online" : e.locationName ? ` · ${e.locationName}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {groups.length > 0 && (
            <Section
              title="Groups"
              action={
                <Link to={orgPath(org.id, "/groups")} className="fko-btn fko-btn--ghost fko-btn--sm">
                  All groups →
                </Link>
              }
            >
              <div className="fko-tiles" id="groups">
                {groups.map((g) => (
                  <Link key={g.id} to={orgPath(org.id, "/groups")} className="fko-tile">
                    <span className="fko-tile__icon" aria-hidden="true">
                      👥
                    </span>
                    <span className="fko-tile__title">{g.name}</span>
                    <span className="fko-tile__text">
                      {GROUP_TYPE_LABELS[g.groupType] ?? "Group"}
                      {g.memberCount ? ` · ${g.memberCount} members` : ""}
                      {g.meetingSchedule ? ` · ${g.meetingSchedule}` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {departments.length > 0 && (
            <Section
              title={w.isFaith ? "Ministries & departments" : "Departments & teams"}
              action={
                <Link to={orgPath(org.id, "/departments")} className="fko-btn fko-btn--ghost fko-btn--sm">
                  All →
                </Link>
              }
            >
              <div className="fko-tiles" id="departments">
                {departments.map((d) => (
                  <Link key={d.id} to={orgPath(org.id, "/departments")} className="fko-tile">
                    <span className="fko-tile__icon" aria-hidden="true">
                      🏢
                    </span>
                    <span className="fko-tile__title">{d.name}</span>
                    {d.description && <span className="fko-tile__text">{d.description}</span>}
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {members.length > 0 && (
            <Section
              title="Members"
              card
              action={
                <Link to={orgPath(org.id, "/members")} className="fko-btn fko-btn--ghost fko-btn--sm">
                  Directory →
                </Link>
              }
            >
              <ul className="fko-people fko-people--grid" id="members">
                {members.map((m) => (
                  <li key={m.id}>
                    {m.profile?.avatarUrl ? (
                      <img className="fko-avatar" src={m.profile.avatarUrl} alt="" />
                    ) : (
                      <span className="fko-avatar">{initials(m.profile?.displayName)}</span>
                    )}
                    <Link to={orgPath(org.id, `/members/${encodeURIComponent(m.id)}`)}>{m.profile?.displayName ?? "Member"}</Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {!access.isMember && (
            <section className="fko-card fko-cta" id="plan-visit">
              <div>
                <h2 className="fko-subtitle">{w.visitTitle}</h2>
                <p className="fko-muted">{w.visitBlurb}</p>
              </div>
              <div className="fko-actions">
                <Link to={orgPath(org.id, "/visit")} className="fko-btn fko-btn--primary">
                  {w.visitTitle}
                </Link>
                {!access.isPending && (
                  <Link to={orgPath(org.id, "/join")} className="fko-btn fko-btn--secondary">
                    Ask to join
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="fko-content">
          {(org.contact?.email || org.contact?.phone || website || socials.length > 0) && (
            <Section title="Contact" card>
              <dl className="fko-kv">
                {org.contact?.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${org.contact.email}`}>{org.contact.email}</a>
                    </dd>
                  </div>
                )}
                {org.contact?.phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${org.contact.phone}`}>{org.contact.phone}</a>
                    </dd>
                  </div>
                )}
                {website && (
                  <div>
                    <dt>Website</dt>
                    <dd>
                      <a href={website} target="_blank" rel="noreferrer">
                        {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </dd>
                  </div>
                )}
                {socials.length > 0 && (
                  <div>
                    <dt>Social</dt>
                    <dd className="fko-actions">
                      {socials.map(([k, v]) => {
                        const href = safeUrl(v);
                        return href ? (
                          <a key={k} href={href} target="_blank" rel="noreferrer" className="fko-badge">
                            {k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}
                          </a>
                        ) : null;
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </Section>
          )}

          <Section title={branches.length > 1 ? "Locations" : "Location"} card>
            <div id="branches" className="fko-content" style={{ gap: 14 }}>
              {branches.length === 0 ? (
                <p className="fko-muted">No location added yet.</p>
              ) : (
                branches.map((b) => {
                  const addr = [b.address?.line1, b.address?.line2, b.address?.city, b.address?.state].filter(Boolean).join(", ");
                  return (
                    <div key={b.id} className="fko-branch">
                      <strong>
                        {b.name} {b.isMainLocation && branches.length > 1 && <span className="fko-badge">Main</span>}
                      </strong>
                      {addr && <span className="fko-hint">{addr}</span>}
                      {b.serviceTimes && b.serviceTimes.length > 0 && (
                        <span className="fko-hint">
                          {w.isFaith ? "Services" : "Hours"}: {b.serviceTimes.join(" · ")}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          <Section title="Leadership" card>
            <div id="leadership">
              {leaders.length === 0 ? (
                <p className="fko-muted">No leaders listed yet.</p>
              ) : (
                <ul className="fko-people">
                  {leaders
                    .slice()
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((l) => (
                      <li key={l.id}>
                        {l.user?.avatarUrl ? (
                          <img className="fko-avatar" src={l.user.avatarUrl} alt="" />
                        ) : (
                          <span className="fko-avatar">{initials(l.user?.displayName)}</span>
                        )}
                        <span>
                          <strong>{l.user?.displayName}</strong>
                          <br />
                          <span className="fko-hint">{l.title || String(l.role).replace(/_/g, " ")}</span>
                        </span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </Section>

          {access.isMember && !access.isOwner && (
            <button type="button" className="fko-btn fko-btn--ghost fko-btn--sm" disabled={busy} onClick={leave} style={{ justifySelf: "start" }}>
              Leave {org.name}
            </button>
          )}
          {!access.signedIn && (
            <div className="fko-notice">
              <span>Members can see groups, events and the member directory.</span>
              <Link to={"/login?returnTo=" + encodeURIComponent(orgPath(org.id))} className="fko-btn fko-btn--secondary fko-btn--sm" style={{ justifySelf: "start" }}>
                Sign in
              </Link>
            </div>
          )}
        </aside>
      </div>
    </OrgShell>
  );
}
