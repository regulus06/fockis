/* Church organization member profile dashboard.
   Route: /organizations/:organizationId/members/:memberId */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Crown,
  Droplet,
  FileDown,
  FileText,
  HeartHandshake,
  History,
  House,
  IdCard,
  Layers,
  MessageSquare,
  NotebookPen,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  Upload,
  UserMinus,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { membersApi } from "../api/membersApi";
import { mediaUrl } from "../api/dashboardApi";
import { ChurchAuthError } from "../api/organizationApi";
import { useOrgAdmin } from "../hooks/useOrgAdmin";
import OrgAppShell, { type ShellViewer } from "../ui/OrgAppShell";
import { MEMBER_ROLE_LABELS } from "../types/organization.types";
import { errorMessage, initialsOf, Skeleton } from "../ui/orgUi";
import { fmtDate, memberProfileApi, ROLE_LABEL, type MemberDocument, type MemberProfileView, type TimelineItem } from "./memberProfileApi";
import {
  AccountCard,
  AttendanceCard,
  ContactCard,
  DocumentsCard,
  EventsCard,
  FamilyCard,
  MembershipCard,
  MinistriesCard,
  PersonalCard,
  SpiritualCard,
  TimelineCard,
  StatusPill,
  type DialogKind,
  type ProfileActions,
  type TabKey,
} from "./ProfileCards";
import { TabPanel } from "./ProfileTabs";
import {
  AddHistoryDialog,
  AddNoteDialog,
  AssignMinistryDialog,
  CertificateDialog,
  EditMemberDialog,
  FamilyDialog,
  MembershipDialog,
  SpiritualDialog,
  StatusDialog,
  UploadDocumentDialog,
  type DialogCtx,
} from "./ProfileDialogs";
import { Confirm, Pill, Toast } from "./ProfileParts";
import { exportMember, printCertificate, profileRows } from "./profileOutput";
import "../ui/fockisOrgTheme.scss";
import "./memberProfile.scss";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: House },
  { key: "personal", label: "Personal", icon: UserRound },
  { key: "membership", label: "Membership", icon: IdCard },
  { key: "spiritual", label: "Spiritual", icon: BookOpen },
  { key: "ministries", label: "Ministries", icon: UsersRound },
  { key: "attendance", label: "Attendance", icon: ClipboardCheck },
  { key: "history", label: "History", icon: History },
  { key: "activities", label: "Activities", icon: CalendarDays },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "family", label: "Family", icon: HeartHandshake },
  { key: "notes", label: "Notes", icon: NotebookPen },
];

interface PendingConfirm {
  title: string;
  body: string;
  label: string;
  danger?: boolean;
  run: () => Promise<MemberProfileView | null | "removed">;
  message: string;
}

export default function MemberProfilePage({ organizationId, memberId }: { organizationId: string; memberId: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const admin = useOrgAdmin(organizationId);
  const [view, setView] = useState<MemberProfileView | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; signedOut: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [dialog, setDialog] = useState<{ kind: DialogKind; extra?: { category?: string; kind?: "milestone" | "record" } } | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "error" } | null>(null);

  const visibleTabs = useMemo(() => TABS.filter((t) => t.key !== "notes" || view?.notes), [view?.notes]);
  const requested = (params.get("tab") ?? "overview") as TabKey;
  const tab: TabKey = visibleTabs.some((t) => t.key === requested) ? requested : "overview";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    memberProfileApi
      .get(organizationId, memberId, controller.signal)
      .then((v) => {
        if (controller.signal.aborted) return;
        setView(v);
        setLoadError(null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setLoadError({ message: errorMessage(err, "This member profile could not be loaded."), signedOut: err instanceof ChurchAuthError });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [organizationId, memberId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const notify = useCallback((message: string, tone: "ok" | "error" = "ok") => setToast({ message, tone }), []);

  const goTab = useCallback(
    (next: TabKey) => {
      const p = new URLSearchParams(params);
      if (next === "overview") p.delete("tab");
      else p.set("tab", next);
      setParams(p, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [params, setParams],
  );

  const printCert = useCallback(
    (docId: string) => {
      if (!view) return;
      const doc = (view.documents ?? []).find((d) => d.id === docId);
      if (!doc) return;
      if (!printCertificate(view, doc, mediaUrl(view.organization.logoUrl))) notify("Allow pop-ups for this site to print the certificate.", "error");
    },
    [view, notify],
  );

  const actions: ProfileActions = useMemo(
    () => ({
      open: (kind, extra) => setDialog({ kind, extra }),
      goTab,
      printCertificate: printCert,
      removeMinistry: (departmentId, name) =>
        setConfirm({
          title: "Remove from ministry",
          body: `Remove ${view?.member.displayName ?? "this member"} from ${name}? The assignment stays in their history.`,
          label: "Remove",
          danger: true,
          message: `Removed from ${name}.`,
          run: () => memberProfileApi.removeMinistry(organizationId, memberId, departmentId),
        }),
      removeHistory: (item: TimelineItem) =>
        setConfirm({
          title: "Delete history entry",
          body: `Delete “${item.title}”? This can't be undone.`,
          label: "Delete",
          danger: true,
          message: "History entry deleted.",
          run: () => memberProfileApi.removeHistory(organizationId, memberId, item.id),
        }),
      removeNote: (noteId) =>
        setConfirm({
          title: "Delete note",
          body: "Delete this note? This can't be undone.",
          label: "Delete",
          danger: true,
          message: "Note deleted.",
          run: () => memberProfileApi.removeNote(organizationId, memberId, noteId),
        }),
      removeDocument: (doc: MemberDocument) =>
        setConfirm({
          title: "Delete document",
          body: `Delete “${doc.title}”? The file is removed permanently.`,
          label: "Delete",
          danger: true,
          message: "Document deleted.",
          run: () => memberProfileApi.removeDocument(organizationId, memberId, doc.id),
        }),
    }),
    [goTab, printCert, organizationId, memberId, view?.member.displayName],
  );

  const runConfirm = async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    try {
      const result = await confirm.run();
      if (result === "removed") {
        navigate(`/organizations/${encodeURIComponent(organizationId)}/admin/members`, { replace: true });
        return;
      }
      if (result) setView(result);
      else reload();
      notify(confirm.message);
      setConfirm(null);
    } catch (err) {
      notify(errorMessage(err, "That didn't work. Please try again."), "error");
    } finally {
      setConfirmBusy(false);
    }
  };

  /* ------------------------------------------------------- shell */
  const isAdmin = admin.allowed === true;
  const me = admin.me;
  const memberViewer: ShellViewer | undefined = me
    ? { name: me.profile?.displayName, avatarUrl: me.profile?.avatarUrl, memberId: me.id, isAdmin: false, roleLabel: me.role ? (MEMBER_ROLE_LABELS[me.role] ?? "Member") : "Member" }
    : undefined;
  const orgPath = `/organizations/${encodeURIComponent(organizationId)}`;
  const membersPath = `${orgPath}/admin/members`;

  const quickActions = isAdmin ? (
    <div className="mpf-quick">
      <h3>Quick Actions</h3>
      <Link to={membersPath} className="mpf-quick__btn">
        <Plus aria-hidden="true" /> Add Member
      </Link>
      <Link to={`${orgPath}/attendance`} className="mpf-quick__btn">
        <ClipboardCheck aria-hidden="true" /> Record Attendance
      </Link>
      <Link to={`${orgPath}/admin/events`} className="mpf-quick__btn">
        <CalendarDays aria-hidden="true" /> Create Event
      </Link>
      {view?.access.canManageDocuments && (
        <button type="button" className="mpf-quick__btn" onClick={() => setDialog({ kind: "upload" })}>
          <Upload aria-hidden="true" /> Upload Document
        </button>
      )}
    </div>
  ) : null;

  const ctx: DialogCtx | null = view
    ? {
        orgId: organizationId,
        memberId,
        view,
        onClose: () => setDialog(null),
        onSaved: (next, message) => {
          setDialog(null);
          if (next) setView(next);
          else reload();
          notify(message);
        },
      }
    : null;

  return (
    <OrgAppShell
      variant={isAdmin ? "admin" : "member"}
      organization={admin.shellOrg}
      viewer={isAdmin ? admin.shellViewer : memberViewer}
      sideExtra={quickActions}
      activeNavTo={isAdmin ? membersPath : undefined}
    >
      <div className="mpf">
        <nav className="mpf-crumbs" aria-label="Breadcrumb">
          <Link to="/organizations">Organizations</Link>
          <ChevronRight aria-hidden="true" />
          <Link to={orgPath}>{view?.organization.name ?? admin.org?.name ?? "Organization"}</Link>
          <ChevronRight aria-hidden="true" />
          {isAdmin ? <Link to={membersPath}>Members</Link> : <span>Members</span>}
          <ChevronRight aria-hidden="true" />
          <span aria-current="page">Member Profile</span>
        </nav>

        {loading && !view ? (
          <ProfileSkeleton />
        ) : loadError && !view ? (
          <section className="mpf-card mpf-error-card" role="alert">
            <ShieldAlert aria-hidden="true" />
            <h1>Profile unavailable</h1>
            <p>{loadError.message}</p>
            <div className="mpf-error-card__actions">
              {loadError.signedOut ? (
                <Link className="fo-btn fo-btn--primary" to="/login">
                  Sign in
                </Link>
              ) : (
                <button type="button" className="fo-btn fo-btn--primary" onClick={reload}>
                  <RefreshCw aria-hidden="true" /> Try again
                </button>
              )}
              <Link className="fo-btn fo-btn--secondary" to={isAdmin ? membersPath : orgPath}>
                Back
              </Link>
            </div>
          </section>
        ) : view ? (
          <>
            <OrgBanner view={view} />
            <ProfileHeader view={view} actions={actions} onExport={(f) => exportMember(view, f)} onMessage={() => navigate(`/messages/profile/${encodeURIComponent(view.member.userId)}`)} onRemove={() =>
              setConfirm({
                title: "Remove member",
                body: `Remove ${view.member.displayName} from ${view.organization.name}? They lose access to the member portal. Their records are kept for administrators.`,
                label: "Remove member",
                danger: true,
                message: "Member removed.",
                run: async () => {
                  await membersApi.removeMember(organizationId, memberId);
                  return "removed";
                },
              })
            } />

            <div className="mpf-tabs" role="tablist" aria-label="Profile sections">
              {visibleTabs.map((t) => (
                <button key={t.key} type="button" role="tab" id={`mpf-tab-${t.key}`} aria-selected={tab === t.key} aria-controls="mpf-panel" className={tab === t.key ? "is-on" : ""} onClick={() => goTab(t.key)}>
                  <t.icon aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>

            <div id="mpf-panel" role="tabpanel" aria-labelledby={`mpf-tab-${tab}`} className={loading ? "is-refreshing" : ""}>
              {tab === "overview" ? (
                <div className="mpf-overview">
                  <div className="mpf-col">
                    <PersonalCard view={view} actions={actions} />
                    <SpiritualCard view={view} actions={actions} />
                    <AttendanceCard view={view} actions={actions} />
                    <EventsCard view={view} actions={actions} />
                  </div>
                  <div className="mpf-col">
                    <MembershipCard view={view} actions={actions} />
                    <MinistriesCard view={view} actions={actions} />
                    <TimelineCard view={view} actions={actions} />
                    <DocumentsCard view={view} actions={actions} />
                  </div>
                  <div className="mpf-col">
                    <ContactCard view={view} actions={actions} />
                    <FamilyCard view={view} actions={actions} />
                    <AccountCard view={view} />
                  </div>
                </div>
              ) : (
                <TabPanel tab={tab} view={view} actions={actions} />
              )}
            </div>

            <PrintReport view={view} />
          </>
        ) : null}
      </div>

      {ctx && dialog?.kind === "edit" && <EditMemberDialog {...ctx} />}
      {ctx && dialog?.kind === "membership" && <MembershipDialog {...ctx} />}
      {ctx && dialog?.kind === "spiritual" && <SpiritualDialog {...ctx} />}
      {ctx && dialog?.kind === "family" && <FamilyDialog {...ctx} />}
      {ctx && dialog?.kind === "ministry" && <AssignMinistryDialog {...ctx} />}
      {ctx && dialog?.kind === "upload" && <UploadDocumentDialog {...ctx} category={dialog.extra?.category} />}
      {ctx && dialog?.kind === "note" && <AddNoteDialog {...ctx} />}
      {ctx && dialog?.kind === "history" && <AddHistoryDialog {...ctx} kind={dialog.extra?.kind} />}
      {ctx && dialog?.kind === "status" && <StatusDialog {...ctx} />}
      {ctx && dialog?.kind === "certificate" && <CertificateDialog {...ctx} onPrint={printCert} />}
      {confirm && (
        <Confirm title={confirm.title} body={confirm.body} confirmLabel={confirm.label} danger={confirm.danger} busy={confirmBusy} onConfirm={() => void runConfirm()} onClose={() => !confirmBusy && setConfirm(null)} />
      )}
      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </OrgAppShell>
  );
}

/* ------------------------------------------------------- banner & header */

function OrgBanner({ view }: { view: MemberProfileView }) {
  const logo = mediaUrl(view.organization.logoUrl);
  const banner = mediaUrl(view.organization.bannerUrl);
  return (
    <section className="mpf-banner" aria-label={view.organization.name}>
      <span className="mpf-banner__logo">{logo ? <img src={logo} alt="" /> : initialsOf(view.organization.name)}</span>
      <h2 className="mpf-banner__name">{view.organization.name}</h2>
      {banner && <img className="mpf-banner__img" src={banner} alt="" />}
    </section>
  );
}

function ProfileHeader({
  view,
  actions,
  onExport,
  onMessage,
  onRemove,
}: {
  view: MemberProfileView;
  actions: ProfileActions;
  onExport: (format: "csv" | "json") => void;
  onMessage: () => void;
  onRemove: () => void;
}) {
  const { member: m, details: d, access, stats } = view;
  const avatar = mediaUrl(m.avatarUrl);
  const [broken, setBroken] = useState(false);
  const roleText = d.churchRole || (m.isOwner ? "Member" : (ROLE_LABEL[m.role] ?? "Member"));
  const statCards: { icon: LucideIcon; label: string; value: string; tone: string }[] = [
    { icon: CalendarCheck, label: "Joined", value: stats.joinedAt ? fmtDate(stats.joinedAt) : "Pending", tone: "blue" },
    { icon: Droplet, label: "Baptism", value: stats.baptismLabel, tone: "sky" },
    { icon: Award, label: "Milestones", value: String(stats.milestones), tone: "gold" },
    { icon: Layers, label: "History Records", value: String(stats.historyRecords), tone: "indigo" },
  ];

  return (
    <section className="mpf-hero">
      <div className="mpf-hero__top">
        <span className="mpf-hero__avatar">{avatar && !broken ? <img src={avatar} alt="" onError={() => setBroken(true)} /> : initialsOf(m.displayName)}</span>
        <div className="mpf-hero__id">
          <span className="mpf-kicker">Organization Member</span>
          <h1>{m.displayName}</h1>
          <p className="mpf-hero__sub">
            Organization Member{m.location ? ` · ${m.location}` : ""}
          </p>
          <div className="mpf-hero__pills">
            {m.status === "active" ? (
              <Pill tone="green" dot>
                Active Member
              </Pill>
            ) : (
              <StatusPill status={m.status} />
            )}
            {m.isOwner && (
              <Pill tone="gold" icon={Crown}>
                Organization Owner
              </Pill>
            )}
            {!m.isOwner && m.role !== "member" && <Pill tone="violet">{ROLE_LABEL[m.role] ?? m.role}</Pill>}
            <Pill tone="blue">{roleText}</Pill>
          </div>
        </div>
        <div className="mpf-hero__actions">
          {access.canEditPersonal && (
            <button type="button" className="fo-btn fo-btn--primary" onClick={() => actions.open("edit")}>
              <Pencil aria-hidden="true" /> Edit Member
            </button>
          )}
          <button type="button" className="fo-btn fo-btn--secondary" onClick={() => window.print()}>
            <Printer aria-hidden="true" /> Print Profile
          </button>
          <MoreMenu view={view} actions={actions} onExport={onExport} onMessage={onMessage} onRemove={onRemove} />
        </div>
      </div>
      <div className="mpf-stats">
        {statCards.map((s) => (
          <div className="mpf-stat" key={s.label}>
            <span className={`mpf-stat__icon mpf-stat__icon--${s.tone}`}>
              <s.icon aria-hidden="true" />
            </span>
            <div>
              <small>{s.label}</small>
              <strong>{s.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MoreMenu({
  view,
  actions,
  onExport,
  onMessage,
  onRemove,
}: {
  view: MemberProfileView;
  actions: ProfileActions;
  onExport: (format: "csv" | "json") => void;
  onMessage: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const a = view.access;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: { label: string; icon: LucideIcon; run: () => void; danger?: boolean; show: boolean }[] = [
    { label: "View Full History", icon: History, run: () => actions.goTab("history"), show: true },
    { label: "Change Member Status", icon: RefreshCw, run: () => actions.open("status"), show: a.canChangeStatus },
    { label: "Assign Ministry", icon: UsersRound, run: () => actions.open("ministry"), show: a.canManageMinistries },
    { label: "Send Message", icon: MessageSquare, run: onMessage, show: !a.isSelf },
    { label: "Upload Document", icon: Upload, run: () => actions.open("upload"), show: a.canManageDocuments },
    { label: "Generate Certificate", icon: Award, run: () => actions.open("certificate"), show: a.canManageDocuments },
    { label: "Export Member Information (CSV)", icon: FileDown, run: () => onExport("csv"), show: true },
    { label: "Export Member Information (JSON)", icon: FileDown, run: () => onExport("json"), show: true },
    { label: "Remove Member", icon: UserMinus, run: onRemove, danger: true, show: a.canRemove },
  ];

  return (
    <div className="fo-menu mpf-more" ref={ref}>
      <button type="button" className="fo-btn fo-btn--secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        More <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="mpf-more__list" role="menu">
          {items
            .filter((i) => i.show)
            .map((i) => (
              <button
                key={i.label}
                type="button"
                role="menuitem"
                className={`mpf-more__item ${i.danger ? "is-danger" : ""}`}
                onClick={() => {
                  setOpen(false);
                  i.run();
                }}
              >
                <i.icon aria-hidden="true" />
                {i.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- skeleton */

function ProfileSkeleton() {
  return (
    <div className="mpf-skeleton" aria-busy="true" aria-label="Loading member profile">
      <Skeleton height={96} style={{ borderRadius: 16 }} />
      <Skeleton height={220} style={{ borderRadius: 16 }} />
      <Skeleton height={44} style={{ borderRadius: 12 }} />
      <div className="mpf-overview">
        {[0, 1, 2].map((i) => (
          <div className="mpf-col" key={i}>
            <Skeleton height={220} style={{ borderRadius: 14 }} />
            <Skeleton height={180} style={{ borderRadius: 14 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- print report */

function PrintReport({ view }: { view: MemberProfileView }) {
  const logo = mediaUrl(view.organization.logoUrl);
  return createPortal(
    <div className="mpf-print-root" aria-hidden="true">
      <header>
        {logo && <img src={logo} alt="" />}
        <div>
          <h1>{view.organization.name}</h1>
          <p>Member Profile · printed {fmtDate(new Date().toISOString())}</p>
        </div>
      </header>
      <h2>{view.member.displayName}</h2>
      <table>
        <tbody>
          {profileRows(view)
            .filter(([, v]) => v && v !== "—")
            .map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
        </tbody>
      </table>
      {view.timeline.length > 0 && (
        <>
          <h3>History & milestones</h3>
          <table>
            <tbody>
              {view.timeline.map((t) => (
                <tr key={t.id}>
                  <th>{fmtDate(t.date, false)}</th>
                  <td>
                    {t.title}
                    {t.description ? ` — ${t.description}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>,
    document.body,
  );
}
