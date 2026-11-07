import { Icon } from "../market/Icon";
import { mediaUrl, type CoursePage } from "../../../lib/studioApi";

/**
 * "Your teacher" box for enrolled students: contact details and the teacher's
 * Fockis Meetings room. The API only sends these when the school allows it.
 */
export default function TeacherContact({ teacher, compact = false }: { teacher: NonNullable<CoursePage["teacher"]>; compact?: boolean }) {
  const c = teacher.contact;
  return (
    <div className={`fa-tcontact ${compact ? "is-compact" : ""}`}>
      <div className="fa-tcontact__who">
        {teacher.photoUrl ? <img src={mediaUrl(teacher.photoUrl)} alt="" /> : <span className="fa-tcontact__av"><Icon name="user" size={16} /></span>}
        <div>
          <small>Your teacher</small>
          <b>{teacher.name}</b>
          {teacher.title && <em>{teacher.title}</em>}
        </div>
      </div>
      {c && (c.email || c.phone || c.officeHours || c.meetingUrl) ? (
        <ul>
          {c.meetingUrl && (
            <li>
              <a className="fa-btn fa-btn--primary fa-btn--sm" href={c.meetingUrl} target="_blank" rel="noreferrer">
                <Icon name="video" size={13} /> Join meeting room
              </a>
            </li>
          )}
          {c.officeHours && (
            <li>
              <Icon name="clock" size={13} /> {c.officeHours}
            </li>
          )}
          {c.email && (
            <li>
              <Icon name="send" size={13} /> <a href={`mailto:${c.email}`}>{c.email}</a>
            </li>
          )}
          {c.phone && (
            <li>
              <Icon name="message" size={13} /> <a href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}>{c.phone}</a>
            </li>
          )}
        </ul>
      ) : (
        !compact && <p className="fa-muted">Contact your school if you need to reach this teacher.</p>
      )}
    </div>
  );
}
