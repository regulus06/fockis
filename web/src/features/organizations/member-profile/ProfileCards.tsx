/* Overview cards of the member profile (laid out like the reference design). */

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CircleCheck,
  CircleUserRound,
  Crown,
  Droplet,
  FileBadge,
  FileText,
  Heart,
  HeartHandshake,
  History,
  IdCard,
  KeyRound,
  Bell,
  Lock,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,

  UserRound,
  UsersRound,
  Network,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { addressLines, fmtDate, ROLE_LABEL, STATUS_LABEL, type MemberDocument, type MemberProfileView, type TimelineItem } from "./memberProfileApi";
import { Card, EditButton, EmptyBox, Pill, Row, Rows } from "./ProfileParts";

export type DialogKind =
  | "edit"
  | "membership"
  | "spiritual"
  | "family"
  | "ministry"
  | "upload"
  | "note"
  | "history"
  | "status"
  | "certificate"
  | "remove";

export type TabKey = "overview" | "personal" | "membership" | "spiritual" | "ministries" | "attendance" | "history" | "activities" | "documents" | "family" | "notes";

export interface ProfileActions {
  open: (kind: DialogKind, extra?: { category?: string; kind?: "milestone" | "record" }) => void;
  goTab: (tab: TabKey) => void;
  removeMinistry: (departmentId: string, name: string) => void;
  removeHistory: (item: TimelineItem) => void;
  removeNote: (noteId: string) => void;
  removeDocument: (doc: MemberDocument) => void;
  printCertificate: (docId: string) => void;
}

interface CardProps {
  view: MemberProfileView;
  actions: ProfileActions;
}

const GENDER: Record<string, string> = { female: "Female", male: "Male", prefer_not_to_say: "Prefer not to say" };
export const genderLabel = (g?: string) => (g ? (GENDER[g] ?? g) : "");
const MEMBERSHIP_TYPE: Record<string, string> = { full: "Full member", associate: "Associate member", youth: "Youth member", transfer: "Transfer member", visitor: "Regular attender" };
export const membershipTypeLabel = (t?: string) => (t ? (MEMBERSHIP_TYPE[t] ?? t) : "");

/* ------------------------------------------------------- personal */

export function PersonalCard({ view, actions }: CardProps) {
  const { member: m, details: d, access } = view;
  return (
    <Card icon={UserRound} title="Personal Information" action={access.canEditPersonal && <EditButton onClick={() => actions.open("edit")} title="Edit personal information" />}>
      <Rows>
        <Row label="Full Name">{m.displayName}</Row>
        <Row label="Preferred Name">{d.preferredName}</Row>
        {access.canViewPrivate && <Row label="Date of Birth">{m.dateOfBirth ? fmtDate(m.dateOfBirth) : ""}</Row>}
        <Row label="Gender">{genderLabel(d.gender)}</Row>
        <Row label="Language">{(d.languages ?? []).join(", ")}</Row>
      </Rows>
    </Card>
  );
}

/* ------------------------------------------------------- membership */

export function MembershipCard({ view, actions }: CardProps) {
  const { member: m, details: d, access } = view;
  return (
    <Card icon={IdCard} title="Membership Details" action={access.canEdit && <EditButton onClick={() => actions.open("membership")} title="Edit membership details" />}>
      <Rows wide>
        <Row label="Member ID">
          <span className="mpf-mono">{d.membershipNumber || m.id}</span>
        </Row>
        <Row label="Organization Role">
          {m.isOwner ? (
            <span className="mpf-inline">
              <Crown className="mpf-gold" aria-hidden="true" /> Organization Owner
            </span>
          ) : (
            (ROLE_LABEL[m.role] ?? m.role)
          )}
        </Row>
        <Row label="Church Membership Role">
          <span className="mpf-inline">
            <UsersRound className="mpf-blue" aria-hidden="true" /> {d.churchRole || ROLE_LABEL[m.role] || "Member"}
          </span>
        </Row>
        {d.membershipType && <Row label="Membership Type">{membershipTypeLabel(d.membershipType)}</Row>}
        <Row label="Status">
          <StatusPill status={m.status} />
        </Row>
        <Row label="Member Since">{m.joinedAt ? fmtDate(m.joinedAt) : "Pending approval"}</Row>
        <Row label="Main Location">
          {m.location ? (
            <span className="mpf-inline">
              <MapPin className="mpf-blue" aria-hidden="true" /> {m.location}
            </span>
          ) : (
            ""
          )}
        </Row>
      </Rows>
    </Card>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === "active" ? "green" : status === "pending" ? "amber" : status === "archived" ? "gray" : "red";
  return (
    <Pill tone={tone} dot>
      {STATUS_LABEL[status] ?? status}
    </Pill>
  );
}

/* ------------------------------------------------------- contact */

export function ContactCard({ view, actions }: CardProps) {
  const { member: m, access } = view;
  const address = addressLines(m.address);
  return (
    <Card icon={Phone} title="Contact Information" action={access.canViewPrivate && access.canEditPersonal && <EditButton onClick={() => actions.open("edit", { category: "contact" })} title="Edit contact information" />}>
      {access.canViewPrivate ? (
        <Rows>
          <Row label="Email">{m.email ? <a href={`mailto:${m.email}`}>{m.email}</a> : ""}</Row>
          <Row label="Phone">{m.phone ? <a href={`tel:${m.phone.replace(/\s+/g, "")}`}>{m.phone}</a> : ""}</Row>
          <Row label="Address">
            {address.length ? (
              <span className="mpf-lines">
                {address.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </span>
            ) : (
              ""
            )}
          </Row>
        </Rows>
      ) : (
        <EmptyBox compact icon={Lock} title="Private" text="Contact details are visible to the member and authorized administrators only." />
      )}
    </Card>
  );
}

/* ------------------------------------------------------- spiritual */

function sacramentPill(status?: string) {
  if (status === "completed") return <Pill tone="green">Completed</Pill>;
  if (status === "scheduled") return <Pill tone="blue">Scheduled</Pill>;
  return <Pill tone="amber">Not recorded</Pill>;
}

export function SpiritualCard({ view, actions }: CardProps) {
  const { details: d, access } = view;
  const b = d.baptism;
  const c = d.confirmation;
  return (
    <Card icon={BookOpen} title="Spiritual Journey" action={access.canEdit && <EditButton onClick={() => actions.open("spiritual")} title="Edit spiritual journey" />}>
      <ul className="mpf-journey">
        <li>
          <Droplet className="mpf-journey__icon mpf-blue" aria-hidden="true" />
          <div>
            <strong>Baptism</strong>
            <small>{b?.status === "completed" || b?.status === "scheduled" ? [fmtDate(b.date), b.location, b.officiant].filter((x) => x && x !== "—").join(" · ") : "Date, location, officiating pastor"}</small>
          </div>
          {sacramentPill(b?.status)}
        </li>
        <li>
          <ShieldCheck className="mpf-journey__icon mpf-blue" aria-hidden="true" />
          <div>
            <strong>Confirmation</strong>
            <small>{c?.status === "completed" || c?.status === "scheduled" ? [fmtDate(c.date), c.details].filter((x) => x && x !== "—").join(" · ") : "Confirmation date and details"}</small>
          </div>
          {sacramentPill(c?.status)}
        </li>
        {access.canViewPastoral && (
          <li>
            <Heart className="mpf-journey__icon mpf-pink" aria-hidden="true" />
            <div>
              <strong>Faith Journey</strong>
              <small className={d.faithJourney ? "mpf-clamp" : ""}>{d.faithJourney || "Optional pastoral records"}</small>
            </div>
            {!d.faithJourney && <span className="mpf-dash">—</span>}
          </li>
        )}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------- ministries */

export function MinistriesCard({ view, actions, full = false }: CardProps & { full?: boolean }) {
  const active = view.ministries.filter((m) => m.active);
  const canManage = view.access.canManageMinistries;
  const list = full ? view.ministries : active;
  return (
    <Card icon={HeartHandshake} title="Ministries & Service" action={canManage && <EditButton onClick={() => actions.open("ministry")} label={full ? "Assign" : "Edit"} title="Assign ministry" />}>
      <div className="mpf-subhead">
        <strong>{view.access.isSelf ? "My Ministries" : "Ministries"}</strong>
        <Pill tone="blue">{active.length} assigned</Pill>
      </div>
      {list.length ? (
        <ul className="mpf-ministries">
          {list.map((m) => (
            <li key={`${m.departmentId}-${m.startDate}-${m.endedAt}`} className={m.active ? "" : "is-ended"}>
              <span className="mpf-ministries__icon">
                <Network aria-hidden="true" />
              </span>
              <div>
                <strong>{m.name}</strong>
                <small>
                  {m.role}
                  {m.isLeader && m.role !== "Leader" && " · Leader"}
                  {m.startDate && ` · since ${fmtDate(m.startDate, false)}`}
                  {!m.active && m.endedAt && ` · ended ${fmtDate(m.endedAt, false)}`}
                </small>
                {full && m.responsibilities && <p>{m.responsibilities}</p>}
                {full && m.leaderNames.length > 0 && <small>Leader: {m.leaderNames.join(", ")}</small>}
              </div>
              {canManage && m.active && (
                <button type="button" className="mpf-icon-btn" onClick={() => actions.removeMinistry(m.departmentId, m.name)} aria-label={`Remove from ${m.name}`}>
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBox icon={UsersRound} title="No ministry assignments yet" text="Ministry participation and leadership assignments will appear here.">
          {canManage && (
            <button type="button" className="fo-btn fo-btn--primary fo-btn--sm" onClick={() => actions.open("ministry")}>
              <Plus aria-hidden="true" /> Assign Ministry
            </button>
          )}
        </EmptyBox>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- family */

export function FamilyCard({ view, actions }: CardProps) {
  const f = view.details.family;
  return (
    <Card icon={UsersRound} title="Family Connections" action={view.access.canEdit && f && <EditButton onClick={() => actions.open("family")} title="Edit family connections" />}>
      {f ? (
        <Rows>
          <Row label="Spouse">{f.spouse?.name ?? "Not recorded"}</Row>
          <Row label="Children">{f.children.length ? f.children.map((c) => c.name).join(", ") : "0"}</Row>
          <Row label="Household">{f.household.length ? `${f.household.length} member${f.household.length === 1 ? "" : "s"}` : "0"}</Row>
        </Rows>
      ) : (
        <EmptyBox compact icon={Lock} title="Private" text="Family details are visible to the member and authorized administrators." />
      )}
    </Card>
  );
}

/* ------------------------------------------------------- account */

export function AccountCard({ view }: { view: MemberProfileView }) {
  const a = view.account;
  const self = view.access.isSelf;
  if (!a) return null;
  const rows: { icon: LucideIcon; label: string; value: React.ReactNode }[] = [
    { icon: CircleUserRound, label: "Linked Fockis Account", value: a.linked ? <CircleCheck className="mpf-ok" aria-label="Linked" /> : <span className="mpf-muted">Not linked</span> },
    { icon: IdCard, label: "Account Status", value: <span className={a.status === "active" ? "mpf-ok-text" : "mpf-warn-text"}>{a.status === "active" ? "Active" : a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span> },
  ];
  if (self) {
    rows.push(
      { icon: KeyRound, label: "Login History", value: <Link to="/settings/account#login-history">View</Link> },
      { icon: Bell, label: "Notification Preferences", value: <Link to="/settings">Manage</Link> },
      { icon: Lock, label: "Privacy Settings", value: <Link to="/privacy">Manage</Link> },
      { icon: FileText, label: "Data & Deletion Request", value: <Link to="/settings/account">Request</Link> },
    );
  }
  return (
    <Card icon={ShieldCheck} title="Account & Security">
      <ul className="mpf-linklist">
        {rows.map((r) => (
          <li key={r.label}>
            <r.icon aria-hidden="true" />
            <span>{r.label}</span>
            <span className="mpf-linklist__value">{r.value}</span>
          </li>
        ))}
      </ul>
      {!self && <p className="mpf-muted mpf-small">Sign-in history and privacy settings are managed by the member.</p>}
    </Card>
  );
}

/* ------------------------------------------------------- attendance */

export function AttendanceCard({ view, actions, limit = 4 }: CardProps & { limit?: number }) {
  const a = view.attendance;
  if (!a) return null;
  const stats: { icon: LucideIcon; value: string; label: string; tone: string }[] = [
    { icon: UsersRound, value: String(a.meetingsAttended), label: "Meetings Attended", tone: "blue" },
    { icon: BarChart3, value: a.attendanceRate == null ? "0%" : `${a.attendanceRate}%`, label: "Attendance Rate", tone: "violet" },
    { icon: CalendarDays, value: String(a.eventsAttended), label: "Events Attended", tone: "blue" },
    { icon: HeartHandshake, value: String(a.volunteerActivities), label: "Volunteer Activities", tone: "pink" },
  ];
  return (
    <Card icon={CalendarCheck} title="Attendance & Participation">
      <div className="mpf-ministats">
        {stats.map((s) => (
          <div key={s.label} className="mpf-ministat">
            <s.icon className={`mpf-${s.tone}`} aria-hidden="true" />
            <strong>{s.value}</strong>
            <small>{s.label}</small>
          </div>
        ))}
      </div>
      <div className="mpf-subhead">
        <strong>Recent Attendance</strong>
        {a.items.length > 0 && (
          <button type="button" className="mpf-link" onClick={() => actions.goTab("attendance")}>
            View All
          </button>
        )}
      </div>
      {a.items.length ? (
        <AttendanceList items={a.items.slice(0, limit)} />
      ) : (
        <EmptyBox compact icon={CalendarRange} title="No attendance records yet" text="Meeting and worship attendance will appear here." />
      )}
    </Card>
  );
}

const ATT_TONE: Record<string, "green" | "amber" | "red" | "gray" | "blue"> = { present: "green", late: "amber", absent: "red", excused: "gray", checked_in: "green", absence_reported: "gray" };
const ATT_LABEL: Record<string, string> = { present: "Present", late: "Late", absent: "Absent", excused: "Excused", checked_in: "Checked in", absence_reported: "Absence reported" };
const ATT_TYPE: Record<string, string> = { ministry_meeting: "Ministry meeting", church_service: "Church service", event: "Event" };

export function AttendanceList({ items }: { items: NonNullable<MemberProfileView["attendance"]>["items"] }) {
  return (
    <ul className="mpf-table-list">
      {items.map((i) => (
        <li key={i.id}>
          <div>
            <strong>{i.title}</strong>
            <small>
              {ATT_TYPE[i.type] ?? i.type}
              {i.mode ? ` · ${i.mode.replace(/_/g, " ")}` : ""}
            </small>
          </div>
          <span className="mpf-muted">{fmtDate(i.date, false)}</span>
          <Pill tone={ATT_TONE[i.status] ?? "blue"}>{ATT_LABEL[i.status] ?? i.status}</Pill>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------- timeline */

export function TimelineCard({ view, actions, full = false }: CardProps & { full?: boolean }) {
  const [filter, setFilter] = useState<"all" | "milestone" | "record">("all");
  const items = view.timeline.filter((t) => filter === "all" || t.kind === filter);
  const shown = full ? items : items.slice(0, 5);
  return (
    <Card
      icon={History}
      title="Member History & Milestones"
      action={
        full && view.access.canEdit ? (
          <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={() => actions.open("history")}>
            <Plus aria-hidden="true" /> Add entry
          </button>
        ) : undefined
      }
    >
      <div className="mpf-seg" role="tablist" aria-label="Filter history">
        {(
          [
            ["all", "All History"],
            ["milestone", "Milestones"],
            ["record", "Records"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "is-on" : ""} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      {shown.length ? (
        <>
          <ol className="mpf-timeline">
            {shown.map((t) => (
              <li key={t.id} className={`mpf-timeline__item is-${t.kind}`}>
                <span className="mpf-timeline__dot" aria-hidden="true">
                  {t.kind === "milestone" ? <Sparkles /> : <FileText />}
                </span>
                <div>
                  <strong>{t.title}</strong>
                  {t.description && <p>{t.description}</p>}
                  <small>{fmtDate(t.date)}</small>
                </div>
                {full && t.removable && view.access.canEdit && (
                  <button type="button" className="mpf-icon-btn" onClick={() => actions.removeHistory(t)} aria-label={`Delete ${t.title}`}>
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ol>
          {!full && items.length > shown.length && (
            <button type="button" className="mpf-link mpf-viewmore" onClick={() => actions.goTab("history")}>
              View full history ({items.length})
            </button>
          )}
        </>
      ) : (
        <EmptyBox icon={UsersRound} title="No history recorded yet" text="Membership milestones and organization records will appear here." />
      )}
    </Card>
  );
}

/* ------------------------------------------------------- events */

export function EventsCard({ view, actions }: CardProps) {
  const e = view.events;
  if (!e) return null;
  const rows: { icon: LucideIcon; label: string; value: number }[] = [
    { icon: CalendarCheck, label: "Upcoming Registered Events", value: e.upcoming.length },
    { icon: CalendarDays, label: "Previous Events", value: e.previous.length },
    { icon: HeartHandshake, label: "Volunteer Participation", value: e.volunteer },
    { icon: BookOpen, label: "Church Programs", value: e.programs },
  ];
  return (
    <Card
      icon={CalendarDays}
      title="Events & Activities"
      action={
        <button type="button" className="mpf-link" onClick={() => actions.goTab("activities")}>
          View All
        </button>
      }
    >
      <ul className="mpf-countlist">
        {rows.map((r) => (
          <li key={r.label}>
            <r.icon aria-hidden="true" />
            <span>{r.label}</span>
            <strong>{r.value}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------- documents */

const CERT_ROWS = [
  { category: "membership_certificate", label: "Membership Certificate" },
  { category: "baptism_certificate", label: "Baptism Certificate" },
  { category: "confirmation_certificate", label: "Confirmation Certificate" },
];

export function DocumentsCard({ view, actions }: CardProps) {
  const docs = view.documents;
  if (!docs) return null;
  const latest = (cat: string) => docs.filter((d) => d.category === cat).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const others = docs.filter((d) => !CERT_ROWS.some((c) => c.category === d.category)).length;
  return (
    <Card
      icon={FileText}
      title="Documents & Certificates"
      action={
        view.access.canManageDocuments ? (
          <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm mpf-upload-btn" onClick={() => actions.open("upload")}>
            <Plus aria-hidden="true" /> Upload Document
          </button>
        ) : undefined
      }
    >
      <ul className="mpf-countlist">
        {CERT_ROWS.map((c) => {
          const d = latest(c.category);
          return (
            <li key={c.category}>
              <FileBadge aria-hidden="true" />
              <span>{c.label}</span>
              {d ? (
                <button type="button" className="mpf-link" onClick={() => (d.generated ? actions.printCertificate(d.id) : actions.goTab("documents"))}>
                  {d.generated ? "View" : "Available"}
                </button>
              ) : (
                <span className="mpf-muted">Not available</span>
              )}
            </li>
          );
        })}
        <li>
          <FileText aria-hidden="true" />
          <span>Other Church Documents</span>
          <strong>{others}</strong>
        </li>
      </ul>
    </Card>
  );
}

