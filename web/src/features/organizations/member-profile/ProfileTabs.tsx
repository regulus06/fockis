/* Detail tabs of the member profile. */

import { CalendarCheck, CalendarDays, ClipboardList, FileText, Lock, NotebookPen, Plus, Printer, Trash2, UsersRound, ExternalLink, Award } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { DOC_CATEGORIES, fmtDate, ROLE_LABEL, STATUS_LABEL, type MemberProfileView, type ProfileEvent } from "./memberProfileApi";
import {

  AttendanceCard,
  AttendanceList,
  ContactCard,
  DocumentsCard,
  FamilyCard,
  MembershipCard,
  MinistriesCard,
  PersonalCard,
  SpiritualCard,
  TimelineCard,
  type ProfileActions,
  type TabKey,
} from "./ProfileCards";
import { Card, EditButton, EmptyBox, Pill, Row, Rows } from "./ProfileParts";

interface Props {
  view: MemberProfileView;
  actions: ProfileActions;
}

export function TabPanel({ tab, view, actions }: Props & { tab: TabKey }) {
  switch (tab) {
    case "personal":
      return (
        <div className="mpf-cols mpf-cols--2">
          <PersonalCard view={view} actions={actions} />
          <div className="mpf-stack">
            <ContactCard view={view} actions={actions} />
            {view.access.canViewPrivate && <EmergencyCard view={view} actions={actions} />}
          </div>
        </div>
      );
    case "membership":
      return (
        <div className="mpf-cols mpf-cols--2">
          <MembershipCard view={view} actions={actions} />
          <ApprovalCard view={view} actions={actions} />
        </div>
      );
    case "spiritual":
      return (
        <div className="mpf-cols mpf-cols--2">
          <SpiritualCard view={view} actions={actions} />
          <SacramentDetails view={view} actions={actions} />
        </div>
      );
    case "ministries":
      return <MinistriesCard view={view} actions={actions} full />;
    case "attendance":
      return view.attendance ? (
        <div className="mpf-stack">
          <AttendanceCard view={view} actions={actions} limit={0} />
          <Card icon={ClipboardList} title={`Attendance records (${view.attendance.items.length})`}>
            {view.attendance.items.length ? <AttendanceList items={view.attendance.items} /> : <EmptyBox compact icon={CalendarCheck} title="No attendance records yet" />}
          </Card>
        </div>
      ) : (
        <Restricted />
      );
    case "history":
      return <TimelineCard view={view} actions={actions} full />;
    case "activities":
      return view.events ? (
        <div className="mpf-cols mpf-cols--2">
          <EventList title="Upcoming registered events" items={view.events.upcoming} empty="No upcoming registrations." />
          <EventList title="Previous events" items={view.events.previous} empty="No past events yet." />
        </div>
      ) : (
        <Restricted />
      );
    case "documents":
      return view.documents ? <DocumentsTab view={view} actions={actions} /> : <Restricted />;
    case "family":
      return (
        <div className="mpf-cols mpf-cols--2">
          <FamilyCard view={view} actions={actions} />
          {view.details.family && <FamilyDetails view={view} actions={actions} />}
        </div>
      );
    case "notes":
      return view.notes ? <NotesTab view={view} actions={actions} /> : <Restricted />;
    default:
      return null;
  }
}

function Restricted() {
  return (
    <section className="mpf-card">
      <EmptyBox icon={Lock} title="Restricted" text="You don't have permission to view this section." />
    </section>
  );
}

function EmergencyCard({ view, actions }: Props) {
  const e = view.details.emergencyContact;
  return (
    <Card icon={UsersRound} title="Emergency Contact" action={view.access.canEditPersonal && <EditButton onClick={() => actions.open("edit")} />}>
      {e ? (
        <Rows>
          <Row label="Name">{e.name}</Row>
          <Row label="Relationship">{e.relationship}</Row>
          <Row label="Phone">{e.phone}</Row>
        </Rows>
      ) : (
        <EmptyBox compact icon={UsersRound} title="No emergency contact" />
      )}
    </Card>
  );
}

function ApprovalCard({ view }: Props) {
  const m = view.member;
  return (
    <Card icon={ClipboardList} title="Membership history">
      <Rows>
        <Row label="Requested">{m.requestedAt ? fmtDate(m.requestedAt) : ""}</Row>
        <Row label="Approved / Joined">{m.joinedAt ? fmtDate(m.joinedAt) : ""}</Row>
        {m.domain && <Row label="Fockis domain">{m.domain}</Row>}
        {m.joinRequest?.message && <Row label="Request message">{m.joinRequest.message}</Row>}
      </Rows>
      {m.approvalHistory.length > 0 && (
        <table className="mpf-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Role</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {m.approvalHistory.map((h, i) => (
              <tr key={i}>
                <td>{fmtDate(h.at, false)}</td>
                <td>{h.status ? (STATUS_LABEL[h.status] ?? h.status) : "—"}</td>
                <td>{h.role ? (ROLE_LABEL[h.role] ?? h.role) : "—"}</td>
                <td>{h.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function SacramentDetails({ view, actions }: Props) {
  const b = view.details.baptism;
  const c = view.details.confirmation;
  return (
    <Card icon={Award} title="Sacrament records" action={view.access.canEdit && <EditButton onClick={() => actions.open("spiritual")} />}>
      <Rows>
        <Row label="Baptism date">{b?.date ? fmtDate(b.date) : ""}</Row>
        <Row label="Baptism location">{b?.location}</Row>
        <Row label="Officiant">{b?.officiant}</Row>
        {b?.notes && <Row label="Notes">{b.notes}</Row>}
        <Row label="Confirmation date">{c?.date ? fmtDate(c.date) : ""}</Row>
        <Row label="Confirmation details">{c?.details}</Row>
      </Rows>
      {view.access.canManageDocuments && (
        <div className="mpf-card__foot">
          <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={() => actions.open("certificate")}>
            <Award aria-hidden="true" /> Generate certificate
          </button>
        </div>
      )}
    </Card>
  );
}

function EventList({ title, items, empty }: { title: string; items: ProfileEvent[]; empty: string }) {
  return (
    <Card icon={CalendarDays} title={`${title} (${items.length})`}>
      {items.length ? (
        <ul className="mpf-table-list">
          {items.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.title}</strong>
                <small>{e.eventType.replace(/_/g, " ")}</small>
              </div>
              <span className="mpf-muted">{fmtDate(e.startsAt, false)}</span>
              {e.attended ? <Pill tone="green">Attended</Pill> : <Pill tone="blue">Registered</Pill>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBox compact icon={CalendarDays} title={empty} />
      )}
    </Card>
  );
}

function FamilyDetails({ view }: Props) {
  const f = view.details.family!;
  const people = [...(f.spouse ? [f.spouse] : []), ...f.children, ...f.household];
  return (
    <Card icon={UsersRound} title="Household">
      {people.length ? (
        <table className="mpf-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Relationship</th>
              <th>Birth date</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.relationship || "—"}</td>
                <td>{p.birthDate ? fmtDate(p.birthDate, false) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <EmptyBox compact icon={UsersRound} title="No family members recorded" />
      )}
    </Card>
  );
}

const catLabel = (c: string) => DOC_CATEGORIES.find((d) => d.value === c)?.label ?? c;
const size = (n: number | null) => (n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function DocumentsTab({ view, actions }: Props) {
  const docs = [...(view.documents ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="mpf-stack">
      <DocumentsCard view={view} actions={actions} />
      <Card
        icon={FileText}
        title={`All documents (${docs.length})`}
        action={
          view.access.canManageDocuments ? (
            <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={() => actions.open("certificate")}>
              <Award aria-hidden="true" /> Generate certificate
            </button>
          ) : undefined
        }
      >
        {docs.length ? (
          <div className="mpf-table-wrap">
            <table className="mpf-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Issued</th>
                  <th>Added by</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.title}</strong>
                      <small className="mpf-block mpf-muted">{d.generated ? `Certificate No. ${d.serial}` : [d.mimeType?.split("/")[1]?.toUpperCase(), size(d.fileSize)].filter(Boolean).join(" · ")}</small>
                    </td>
                    <td>{catLabel(d.category)}</td>
                    <td>{fmtDate(d.issuedAt ?? d.createdAt, false)}</td>
                    <td>{d.uploadedByName || "—"}</td>
                    <td className="mpf-actions-cell">
                      {d.generated ? (
                        <button type="button" className="mpf-icon-btn" onClick={() => actions.printCertificate(d.id)} aria-label={`Print ${d.title}`}>
                          <Printer aria-hidden="true" />
                        </button>
                      ) : d.fileUrl ? (
                        <a className="mpf-icon-btn" href={mediaUrl(d.fileUrl) ?? d.fileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${d.title}`}>
                          <ExternalLink aria-hidden="true" />
                        </a>
                      ) : null}
                      {view.access.canManageDocuments && (
                        <button type="button" className="mpf-icon-btn" onClick={() => actions.removeDocument(d)} aria-label={`Delete ${d.title}`}>
                          <Trash2 aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyBox icon={FileText} title="No documents yet" text="Uploaded files and generated certificates will appear here." />
        )}
      </Card>
    </div>
  );
}

function NotesTab({ view, actions }: Props) {
  const notes = view.notes ?? [];
  return (
    <Card
      icon={NotebookPen}
      title="Notes"
      action={
        <button type="button" className="fo-btn fo-btn--secondary fo-btn--sm" onClick={() => actions.open("note")}>
          <Plus aria-hidden="true" /> Add note
        </button>
      }
    >
      <p className="mpf-muted mpf-small">Internal notes are never visible to the member.{view.access.canViewPastoral ? " Pastoral notes are visible only to the owner, administrators and pastors." : ""}</p>
      {notes.length ? (
        <ul className="mpf-notes">
          {notes.map((n) => (
            <li key={n.id}>
              <header>
                <Pill tone={n.visibility === "pastoral" ? "violet" : "blue"} icon={n.visibility === "pastoral" ? Lock : undefined}>
                  {n.visibility === "pastoral" ? "Pastoral" : n.category}
                </Pill>
                {n.visibility === "pastoral" && <span className="mpf-muted">{n.category}</span>}
                <span className="mpf-muted mpf-small">
                  {n.authorName} · {fmtDate(n.createdAt, false)}
                </span>
                <button type="button" className="mpf-icon-btn" onClick={() => actions.removeNote(n.id)} aria-label="Delete note">
                  <Trash2 aria-hidden="true" />
                </button>
              </header>
              <p>{n.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyBox icon={NotebookPen} title="No notes yet" text="Follow-ups and pastoral care notes will appear here." />
      )}
    </Card>
  );
}

