/**
 * OrganizationCommunicationPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/communication — announcements, messages,
 * department messages and notifications for one organization.
 *
 *   - Who you are: GET /organizations/:id/members/me (membersApi), the same
 *     call every other organization page uses. (The previous version called
 *     /organizations/:id/membership, which does not exist on the server.)
 *   - Announcements: everyone who is an active member sees the ones meant for
 *     them (the server filters by audience). Administrators can publish,
 *     pin and delete announcements here.
 *   - Messages, department messages, notifications: the signed-in member's own.
 * The server checks every permission again.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Bell, Inbox, Loader2, Megaphone, MessageSquare, Network, Pin, Send, Trash2 } from "lucide-react";

import { churchDelete, churchGet, churchPost, ChurchAuthError } from "../api/organizationApi";
import { getOrganization } from "../api/organizationsApi";
import { membersApi, type MyMembershipResponse } from "../api/membersApi";
import { listDepartments } from "../api/departmentsApi";
import { listGroups } from "../api/groupsApi";
import {
  AnnouncementAudience,
  MemberRole,
  MembershipStatus,
  type Announcement,
  type ChurchGroup,
  type ChurchMessage,
  type ChurchNotification,
  type Department,
  type DepartmentMessage,
  type Organization,
  type PaginatedResult,
} from "../types/organization.types";
import OrgAppShell from "../ui/OrgAppShell";
import { termsFor } from "../ui/orgTerminology";
import { Alert, Avatar, EmptyState, Skeleton, errorMessage, formatDateTime } from "../ui/orgUi";
import "../styles/OrganizationCommunication.scss";

type Tab = "announcements" | "messages" | "department-messages" | "notifications";

const ADMIN_ROLES = new Set<string>(["administrator", "pastor_director", "owner", "admin"]);

function items<T>(res: PaginatedResult<T> | T[] | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  return Array.isArray(res?.items) ? res.items : [];
}

export default function OrganizationCommunicationPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const base = `/organizations/${encodeURIComponent(organizationId)}`;

  const [org, setOrg] = useState<Organization | null>(null);
  const [me, setMe] = useState<MyMembershipResponse | null>(null);
  const [access, setAccess] = useState<"loading" | "ok" | "signed-out" | "not-member" | "error">("loading");
  const [accessError, setAccessError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("announcements");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<ChurchMessage[]>([]);
  const [departmentMessages, setDepartmentMessages] = useState<DepartmentMessage[]>([]);
  const [notifications, setNotifications] = useState<ChurchNotification[]>([]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<ChurchGroup[]>([]);

  /* compose */
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>(AnnouncementAudience.Members);
  const [targetId, setTargetId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = Boolean(me?.isOwner || me?.isAdmin || ADMIN_ROLES.has(String(me?.role ?? "").toLowerCase()));
  const t = termsFor(org?.organizationType);

  /* ---------------------------------------------------- who am I */

  useEffect(() => {
    const controller = new AbortController();
    setAccess("loading");
    Promise.all([getOrganization(organizationId, controller.signal).catch(() => null), membersApi.getMyMembership(organizationId, controller.signal)])
      .then(([o, m]) => {
        if (controller.signal.aborted) return;
        setOrg(o);
        setMe(m ?? null);
        const active = Boolean(m && (m.isOwner || (String(m.status).toLowerCase() === MembershipStatus.Active && m.role !== MemberRole.Guest)));
        setAccess(active ? "ok" : "not-member");
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ChurchAuthError) setAccess("signed-out");
        else {
          setAccessError(errorMessage(err, "Your membership could not be checked."));
          setAccess("error");
        }
      });
    return () => controller.abort();
  }, [organizationId]);

  /* ------------------------------------- departments & groups (compose) */

  useEffect(() => {
    if (access !== "ok" || !isAdmin) return;
    const controller = new AbortController();
    listDepartments(organizationId, { page: 1, pageSize: 100 }, controller.signal)
      .then((r) => setDepartments(items(r)))
      .catch(() => undefined);
    listGroups(organizationId, { page: 1, pageSize: 100 }, controller.signal)
      .then((r) => setGroups(items(r as PaginatedResult<ChurchGroup>)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [organizationId, access, isAdmin]);

  /* ------------------------------------------------------- tab data */

  useEffect(() => {
    if (access !== "ok") return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    churchGet<PaginatedResult<unknown>>(`${base}/${tab}`, { pageSize: 30 }, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        const list = items(res);
        if (tab === "announcements") setAnnouncements(list as Announcement[]);
        if (tab === "messages") setMessages(list as ChurchMessage[]);
        if (tab === "department-messages") setDepartmentMessages(list as DepartmentMessage[]);
        if (tab === "notifications") setNotifications(list as ChurchNotification[]);
      })
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "This list could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [access, tab, base, tick]);

  /* --------------------------------------------------------- actions */

  const publish = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setNotice(null);
      if (!title.trim() || !body.trim()) return setError("Add a title and a message.");
      if ((audience === AnnouncementAudience.Department || audience === AnnouncementAudience.Group) && !targetId) {
        return setError(audience === AnnouncementAudience.Department ? `Choose a ${t.department.toLowerCase()}.` : "Choose a group.");
      }
      setSending(true);
      try {
        await churchPost(`${base}/announcements`, {
          title: title.trim(),
          body: body.trim(),
          audience,
          ...(audience === AnnouncementAudience.Department ? { departmentId: targetId } : {}),
          ...(audience === AnnouncementAudience.Group ? { groupId: targetId } : {}),
          pinned,
        });
        setTitle("");
        setBody("");
        setPinned(false);
        setTargetId("");
        setNotice("Announcement published.");
        setTab("announcements");
        setTick((x) => x + 1);
      } catch (err) {
        setError(errorMessage(err, "The announcement could not be published."));
      } finally {
        setSending(false);
      }
    },
    [title, body, audience, targetId, pinned, base, t.department],
  );

  async function remove(a: Announcement) {
    if (!window.confirm(`Delete “${a.title}”?`)) return;
    setBusyId(a.id);
    try {
      await churchDelete(`${base}/announcements/${encodeURIComponent(a.id)}`);
      setAnnouncements((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      setError(errorMessage(err, "The announcement could not be deleted."));
    } finally {
      setBusyId(null);
    }
  }

  async function markRead(n: ChurchNotification) {
    setBusyId(n.id);
    try {
      await churchPost(`${base}/notifications/${encodeURIComponent(n.id)}/read`);
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    } catch (err) {
      setError(errorMessage(err, "The notification could not be updated."));
    } finally {
      setBusyId(null);
    }
  }

  /* ---------------------------------------------------------- render */

  const shellOrg = org ? { id: org.id, name: org.name, organizationType: org.organizationType, logoUrl: org.logoUrl } : { id: organizationId, name: "" };
  const viewer = me ? { name: me.profile?.displayName, avatarUrl: me.profile?.avatarUrl, memberId: me.id, isAdmin } : undefined;
  const unread = notifications.filter((n) => !n.isRead).length;

  const tabs: { id: Tab; label: string; icon: typeof Megaphone }[] = [
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "department-messages", label: `${t.department} messages`, icon: Network },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  if (access !== "ok") {
    return (
      <OrgAppShell variant={access === "signed-out" ? "platform" : "member"} organization={access === "signed-out" ? null : shellOrg} viewer={viewer}>
        <div className="fo-card">
          {access === "loading" ? (
            <Skeleton height={160} />
          ) : (
            <EmptyState
              icon={Megaphone}
              title={
                access === "signed-out"
                  ? "Sign in to see communication"
                  : access === "error"
                    ? "Communication could not be opened"
                    : `Only active ${t.people.toLowerCase()} can see communication`
              }
              text={access === "error" ? (accessError ?? undefined) : access === "not-member" ? "Ask to join, or wait until your request is approved." : undefined}
            >
              {access === "signed-out" ? (
                <Link to={"/login?returnTo=" + encodeURIComponent(`${base}/communication`)} className="fo-btn fo-btn--primary">
                  Sign in
                </Link>
              ) : (
                <Link to={base} className="fo-btn fo-btn--secondary">
                  Back to the organization
                </Link>
              )}
            </EmptyState>
          )}
        </div>
      </OrgAppShell>
    );
  }

  return (
    <OrgAppShell variant={isAdmin ? "admin" : "member"} organization={shellOrg} viewer={viewer} notificationCount={unread}>
      <div className="fo-pagehead">
        <div>
          <h1>Communication</h1>
          <p>Announcements, messages and notifications for {org?.name ?? "your organization"}.</p>
        </div>
      </div>

      {notice && <Alert tone="ok">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      <div className={"foc" + (isAdmin ? " foc--admin" : "")}>
        <section className="fo-card foc-list">
          <div className="foc-tabs" role="tablist" aria-label="Communication">
            {tabs.map((x) => (
              <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={"foc-tab" + (tab === x.id ? " is-active" : "")} onClick={() => setTab(x.id)}>
                <x.icon aria-hidden="true" /> {x.label}
              </button>
            ))}
          </div>

          {loading ? (
            <>
              <Skeleton height={70} style={{ marginBottom: 12 }} />
              <Skeleton height={70} style={{ marginBottom: 12 }} />
              <Skeleton height={70} />
            </>
          ) : tab === "announcements" ? (
            announcements.length === 0 ? (
              <EmptyState icon={Megaphone} title="No announcements yet" text={isAdmin ? "Publish the first one with the form." : "News from your leaders will appear here."} />
            ) : (
              <ul className="foc-items">
                {announcements.map((a) => (
                  <li key={a.id} className={a.pinned ? "is-pinned" : ""}>
                    <span className="foc-items__icon">{a.pinned ? <Pin aria-hidden="true" /> : <Megaphone aria-hidden="true" />}</span>
                    <div>
                      <strong>{a.title}</strong>
                      <small>
                        {a.author?.displayName ? `${a.author.displayName} · ` : ""}
                        {formatDateTime(a.publishedAt)}
                        {a.audience && a.audience !== AnnouncementAudience.Everyone ? ` · ${a.audience}` : ""}
                      </small>
                      <p>{a.body}</p>
                    </div>
                    {isAdmin && (
                      <button type="button" className="fo-iconbtn" aria-label={`Delete ${a.title}`} disabled={busyId === a.id} onClick={() => remove(a)}>
                        {busyId === a.id ? <Loader2 className="fo-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : tab === "notifications" ? (
            notifications.length === 0 ? (
              <EmptyState icon={Bell} title="You're all caught up" />
            ) : (
              <ul className="foc-items">
                {notifications.map((n) => (
                  <li key={n.id} className={n.isRead ? "" : "is-unread"}>
                    <span className="foc-items__icon">
                      <Bell aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{n.title}</strong>
                      <small>{formatDateTime(n.createdAt)}</small>
                      <p>{n.body}</p>
                      {n.linkPath && n.linkPath.startsWith("/") && (
                        <Link to={n.linkPath} className="foc-link">
                          Open
                        </Link>
                      )}
                    </div>
                    {!n.isRead && (
                      <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" disabled={busyId === n.id} onClick={() => markRead(n)}>
                        Mark read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )
          ) : (tab === "messages" ? messages : departmentMessages).length === 0 ? (
            <EmptyState icon={Inbox} title="No messages yet" />
          ) : (
            <ul className="foc-items">
              {(tab === "messages" ? messages : departmentMessages).map((m) => (
                <li key={m.id}>
                  <Avatar name={m.sender?.displayName} url={m.sender?.avatarUrl} size="sm" />
                  <div>
                    <strong>{m.sender?.displayName ?? "Member"}</strong>
                    <small>{formatDateTime(m.sentAt)}</small>
                    <p>{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {isAdmin && (
          <form className="fo-card foc-compose" onSubmit={publish} noValidate>
            <h2>Send Announcement</h2>
            <label className="fo-field">
              <span>Title</span>
              <input className="fo-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Christmas service times" />
            </label>
            <label className="fo-field">
              <span>Message</span>
              <textarea className="fo-textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={6} />
            </label>
            <label className="fo-field">
              <span>Who should see it</span>
              <select
                className="fo-select"
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value as AnnouncementAudience);
                  setTargetId("");
                }}
              >
                <option value={AnnouncementAudience.Everyone}>Everyone (also public page visitors)</option>
                <option value={AnnouncementAudience.Members}>All {t.people.toLowerCase()}</option>
                <option value={AnnouncementAudience.Department}>One {t.department.toLowerCase()}</option>
                <option value={AnnouncementAudience.Group}>One group</option>
                <option value={AnnouncementAudience.Leadership}>Leadership only</option>
              </select>
            </label>
            {audience === AnnouncementAudience.Department && (
              <label className="fo-field">
                <span>{t.department}</span>
                <select className="fo-select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">Choose…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {audience === AnnouncementAudience.Group && (
              <label className="fo-field">
                <span>Group</span>
                <select className="fo-select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                  <option value="">Choose…</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="fo-check">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top
            </label>
            <button type="submit" className="fo-btn fo-btn--primary fo-btn--block" disabled={sending}>
              {sending ? <Loader2 className="fo-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Publish
            </button>
          </form>
        )}
      </div>
    </OrgAppShell>
  );
}
