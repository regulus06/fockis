/**
 * GroupProfilePage.tsx — /organizations/:organizationId/groups/:groupId
 *
 * The group's home: header (cover, logo, category, leader, members, status,
 * schedule, location, requirements and the right action buttons) and up to
 * 17 tabs. Tabs are shown by the viewer's rights and the group's enabled
 * services; every tab's data is permission-checked again by the API.
 * Non-faith organizations keep the existing group detail page.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, Clock, Loader2, LogOut, Mail, MapPin, MessageSquare, Pencil, ShieldCheck, Star, UserPlus, Users, X } from "lucide-react";

import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell from "../ui/OrgAppShell";
import { ChurchAuthError } from "../api/organizationApi";
import { mediaUrl } from "../api/dashboardApi";
import { errorMessage } from "../ui/orgUi";
import { platformCategoryOf } from "../ui/orgTerminology";
import OrganizationGroupDetailPage from "../pages/OrganizationGroupDetailPage";
import { GROUP_ROLE_LABELS, categoryLabel, communitiesApi, type GroupProfile } from "./communitiesApi";
import { Empty, GroupIcon, GroupStatus, useToast } from "./GroupParts";
import { InviteDialog, JoinDialog } from "./GroupDialogs";
import GroupWizard from "./GroupWizard";
import type { TabProps } from "./GroupTabKit";
import { LeadershipTab, MembersTab, MessageDialog, OverviewTab, TeamsTab } from "./GroupTabsPeople";
import { ActivitiesTab, AttendanceTab, CalendarTab, MeetingsTab } from "./GroupTabsSchedule";
import { BibleStudyTab, DiscussionsTab, DocumentsTab, PrayerTab, TasksTab } from "./GroupTabsContent";
import { FinanceTab, FundraisingTab } from "./GroupFinance";
import { ReportsTab, SettingsTab } from "./GroupTabsAdmin";
import "../ministries/ministries.scss";
import "./groups.scss";

type TabKey =
  | "overview"
  | "members"
  | "leadership"
  | "teams"
  | "meetings"
  | "activities"
  | "calendar"
  | "discussions"
  | "bible-study"
  | "prayer"
  | "attendance"
  | "finance"
  | "fundraising"
  | "documents"
  | "tasks"
  | "reports"
  | "settings";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  members: "Members",
  leadership: "Leadership",
  teams: "Teams",
  meetings: "Meetings",
  activities: "Activities",
  calendar: "Calendar",
  discussions: "Discussions",
  "bible-study": "Bible Study",
  prayer: "Prayer Requests",
  attendance: "Attendance",
  finance: "Finance",
  fundraising: "Fundraising",
  documents: "Documents",
  tasks: "Tasks",
  reports: "Reports",
  settings: "Settings",
};

/** Which tabs this viewer gets. The API enforces the same rules. */
function tabsFor(g: GroupProfile): TabKey[] {
  const v = g.viewer;
  const sv = g.settings.services;
  const inside = (v.isMember && !v.isSuspended) || v.governs;
  const out: TabKey[] = ["overview"];
  if (inside && v.canSeeMembers) out.push("members");
  out.push("leadership");
  if (!inside) return out;
  out.push("teams");
  if (sv.meetings) out.push("meetings");
  if (sv.activities) out.push("activities");
  out.push("calendar");
  out.push("discussions");
  if (sv.bibleStudy) out.push("bible-study");
  if (sv.prayer) out.push("prayer");
  if (sv.attendance) out.push("attendance");
  if (sv.finance && (v.canViewFinance || sv.contributions)) out.push("finance");
  if (sv.fundraising) out.push("fundraising");
  if (sv.documents) out.push("documents");
  if (sv.tasks) out.push("tasks");
  if (v.canCoordinate || v.governs) out.push("reports");
  if (v.canManage) out.push("settings");
  return out;
}

export default function GroupProfilePage(): React.JSX.Element {
  const { organizationId = "", groupId = "" } = useParams<{ organizationId: string; groupId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const admin = useOrgAdmin(organizationId);
  const toast = useToast();

  const [group, setGroup] = useState<GroupProfile | null>(null);
  const [error, setError] = useState<{ text: string; signedOut: boolean } | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [dialog, setDialog] = useState<null | "join" | "invite" | "edit" | "message">(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isFaith = !admin.org || platformCategoryOf(admin.org.organizationType) === "faith";

  useEffect(() => {
    if (!isFaith) return;
    const c = new AbortController();
    setError(null);
    communitiesApi
      .profile(organizationId, groupId, c.signal)
      .then(setGroup)
      .catch((err) => !c.signal.aborted && setError({ text: errorMessage(err, "This group could not be loaded."), signedOut: err instanceof ChurchAuthError }));
    return () => c.abort();
  }, [organizationId, groupId, tick, isFaith]);

  const tabsRef = useRef<HTMLElement | null>(null);
  const tabs = useMemo(() => (group ? tabsFor(group) : (["overview"] as TabKey[])), [group]);
  const requested = params.get("tab") as TabKey | null;
  const tab: TabKey = requested && tabs.includes(requested) ? requested : "overview";
  const selectTab = (t: TabKey) => {
    const next = new URLSearchParams(params);
    if (t === "overview") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  // Keep the active tab visible when the tab strip scrolls (phones).
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>(".is-on");
    if (el && tabsRef.current && tabsRef.current.scrollWidth > tabsRef.current.clientWidth) tabsRef.current.scrollLeft = el.offsetLeft - 16;
  }, [tab, group]);

  if (admin.org && !isFaith) return <OrganizationGroupDetailPage />;

  const listPath = `/organizations/${encodeURIComponent(organizationId)}/groups`;

  async function run(key: string, fn: () => Promise<unknown>, ok: string, after?: () => void) {
    setBusy(key);
    try {
      await fn();
      toast.show("ok", ok);
      (after ?? reload)();
    } catch (err) {
      toast.show("error", errorMessage(err, "That did not work. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  const v = group?.viewer;
  const archived = group?.status === "archived";
  const canJoin = Boolean(group && v && !v.isMember && !v.pendingInvitationId && group.status === "active" && group.visibility !== "private" && group.visibility !== "invitation");
  const leader = group?.leaders.find((l) => l.role === "leader") ?? group?.leaders[0];
  const m = group?.settings.meeting;
  const schedule = group ? group.meetingSchedule || (m?.frequency ? [m.frequency === "biweekly" ? "Every other week" : m.frequency[0].toUpperCase() + m.frequency.slice(1), m.day && `on ${m.day}`, m.startTime && `· ${m.startTime}${m.endTime ? `–${m.endTime}` : ""}`].filter(Boolean).join(" ") : "") : "";
  const cover = group?.photoUrl ? mediaUrl(group.photoUrl) : null;

  const tabProps: TabProps | null = group ? { organizationId, group, notify: toast.show, onChanged: reload } : null;

  return (
    <OrgAppShell variant="member" organization={admin.shellOrg} viewer={admin.shellViewer} activeNavTo={listPath}>
      <div className="gc-profile">
        <Link to={listPath} className="gc-back">
          <ArrowLeft aria-hidden="true" /> Groups & Communities
        </Link>

        {error && (
          <div className="mn-panel">
            <Empty
              icon={ShieldCheck}
              title={error.signedOut ? "Sign in to continue" : "This group isn't available"}
              text={error.signedOut ? "Your session ended. Sign in again to see this group." : error.text}
            />
          </div>
        )}
        {!group && !error && (
          <div aria-busy="true">
            <div className="mn-sk gc-profile__sk" />
            <div className="mn-sk" style={{ height: 44, marginTop: 14 }} />
          </div>
        )}

        {group && v && (
          <>
            <header className="gc-phead">
              <div className="gc-phead__cover" style={cover ? { backgroundImage: `url("${cover}")` } : undefined} data-cat={group.category} />
              <div className="gc-phead__body">
                <div className="gc-phead__logo">
                  <GroupIcon category={group.category} logoUrl={group.logoUrl} size={76} />
                </div>
                <div className="gc-phead__main">
                  <div className="gc-phead__title">
                    <h1>{group.name}</h1>
                    <GroupStatus status={group.status} />
                    {group.featured && (
                      <span className="mn-chip gc-feat">
                        <Star aria-hidden="true" /> Featured
                      </span>
                    )}
                  </div>
                  <p className="gc-phead__meta">
                    <span>{categoryLabel(group.category)}</span>
                    {leader && (
                      <span>
                        Led by <b>{leader.displayName}</b>
                      </span>
                    )}
                    <span>
                      <Users aria-hidden="true" /> {group.memberCount}
                      {group.capacity ? ` / ${group.capacity}` : ""} members
                    </span>
                    {schedule && (
                      <span>
                        <CalendarClock aria-hidden="true" /> {schedule}
                      </span>
                    )}
                    {group.location && (
                      <span>
                        <MapPin aria-hidden="true" /> {group.location}
                      </span>
                    )}
                  </p>
                  {group.settings.requirements && (
                    <p className="gc-phead__req">
                      <b>Requirements:</b> {group.settings.requirements}
                    </p>
                  )}
                  {v.isMember && (
                    <p className="gc-phead__me">
                      <Check aria-hidden="true" /> You're a {GROUP_ROLE_LABELS[v.groupRole ?? "member"] ?? "member"}
                      {v.title ? ` · ${v.title}` : ""}
                      {v.isSuspended ? " (suspended)" : ""}
                    </p>
                  )}
                </div>
                <div className="gc-phead__actions">
                  {v.pendingInvitationId && (
                    <>
                      <button type="button" className="mn-btn mn-btn--primary" disabled={busy === "inv"} onClick={() => run("inv", () => communitiesApi.respondInvitation(organizationId, v.pendingInvitationId!, true), `Welcome to ${group.name}!`)}>
                        {busy === "inv" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Check aria-hidden="true" />} Accept invitation
                      </button>
                      <button type="button" className="mn-btn mn-btn--ghost" disabled={busy === "inv"} onClick={() => run("inv", () => communitiesApi.respondInvitation(organizationId, v.pendingInvitationId!, false), "Invitation declined.")}>
                        <X aria-hidden="true" /> Decline
                      </button>
                    </>
                  )}
                  {canJoin && !v.hasPendingRequest && (
                    <button type="button" className="mn-btn mn-btn--primary" onClick={() => setDialog("join")}>
                      <UserPlus aria-hidden="true" /> {group.requireApproval ? "Request to Join" : "Join Group"}
                    </button>
                  )}
                  {v.hasPendingRequest && !v.isMember && (
                    <span className="mn-chip">
                      <Clock aria-hidden="true" /> Request pending
                    </span>
                  )}
                  {v.isMember && !archived && (v.canInvite || v.canManageMembers) && (
                    <button type="button" className="mn-btn mn-btn--outline" onClick={() => setDialog("invite")}>
                      <Mail aria-hidden="true" /> Invite
                    </button>
                  )}
                  {(v.isMember || v.governs) && (
                    <button type="button" className="mn-btn mn-btn--outline" onClick={() => setDialog("message")}>
                      <MessageSquare aria-hidden="true" /> {v.canCoordinate ? "Message" : "Message leaders"}
                    </button>
                  )}
                  {v.canManage && !archived && (
                    <button type="button" className="mn-btn mn-btn--outline" onClick={() => setDialog("edit")}>
                      <Pencil aria-hidden="true" /> Edit
                    </button>
                  )}
                  {v.isMember && v.groupRole !== "leader" && (
                    <button
                      type="button"
                      className="mn-btn mn-btn--ghost"
                      disabled={busy === "leave"}
                      onClick={() => window.confirm(`Leave ${group.name}?`) && run("leave", () => communitiesApi.leave(organizationId, group.id), `You left ${group.name}.`)}
                    >
                      <LogOut aria-hidden="true" /> Leave
                    </button>
                  )}
                </div>
              </div>
            </header>

            {archived && <p className="mn-callout">This group is archived. Its history is kept and it is read-only.</p>}

            <nav ref={tabsRef} className="gc-ptabs" role="tablist" aria-label="Group sections">
              {tabs.map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "is-on" : ""} onClick={() => selectTab(t)}>
                  {TAB_LABELS[t]}
                </button>
              ))}
            </nav>

            <div className="gc-ptab" role="tabpanel" aria-label={TAB_LABELS[tab]}>
              {tabProps && (
                <>
                  {tab === "overview" && <OverviewTab {...tabProps} />}
                  {tab === "members" && <MembersTab {...tabProps} />}
                  {tab === "leadership" && <LeadershipTab {...tabProps} />}
                  {tab === "teams" && <TeamsTab {...tabProps} />}
                  {tab === "meetings" && <MeetingsTab {...tabProps} />}
                  {tab === "activities" && <ActivitiesTab {...tabProps} />}
                  {tab === "calendar" && <CalendarTab {...tabProps} />}
                  {tab === "discussions" && <DiscussionsTab {...tabProps} />}
                  {tab === "bible-study" && <BibleStudyTab {...tabProps} />}
                  {tab === "prayer" && <PrayerTab {...tabProps} />}
                  {tab === "attendance" && <AttendanceTab {...tabProps} />}
                  {tab === "finance" && <FinanceTab {...tabProps} />}
                  {tab === "fundraising" && <FundraisingTab {...tabProps} />}
                  {tab === "documents" && <DocumentsTab {...tabProps} />}
                  {tab === "tasks" && <TasksTab {...tabProps} />}
                  {tab === "reports" && <ReportsTab {...tabProps} />}
                  {tab === "settings" && <SettingsTab {...tabProps} onDeleted={() => navigate(listPath)} />}
                </>
              )}
            </div>

            {dialog === "join" && (
              <JoinDialog
                organizationId={organizationId}
                group={{ id: group.id, name: group.name, requireApproval: group.requireApproval, requirements: group.settings.requirements }}
                onClose={() => setDialog(null)}
                onDone={(joined) => {
                  setDialog(null);
                  toast.show("ok", joined ? `Welcome to ${group.name}!` : "Your request was sent to the group leaders.");
                  reload();
                }}
              />
            )}
            {dialog === "invite" && (
              <InviteDialog
                organizationId={organizationId}
                groupId={group.id}
                groupName={group.name}
                allowEmail={group.settings.allowExternalInvites && (v.canManageMembers || v.governs)}
                onClose={() => setDialog(null)}
                onDone={(summary) => {
                  setDialog(null);
                  toast.show("ok", summary);
                }}
              />
            )}
            {dialog === "message" && <MessageDialog organizationId={organizationId} groupId={group.id} canTarget={v.canCoordinate} onClose={() => setDialog(null)} notify={toast.show} />}
            {dialog === "edit" && (
              <GroupWizard
                organizationId={organizationId}
                groupId={group.id}
                defaults={group.settings}
                canGovern={v.governs}
                onClose={() => setDialog(null)}
                onSaved={() => {
                  setDialog(null);
                  toast.show("ok", "Group updated.");
                  reload();
                }}
              />
            )}
          </>
        )}
      </div>
      {toast.node}
    </OrgAppShell>
  );
}
