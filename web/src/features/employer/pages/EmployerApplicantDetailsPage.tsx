import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Briefcase,
  CalendarPlus,
  CircleX,
  Download,
  ExternalLink,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Star,
  Video,
} from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerApplicants.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { Avatar } from '../components/shared/Avatar';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { ApplicationStatusBadge, InterviewStatusBadge } from '../components/shared/EmployerStatusBadge';
import { InterviewFormModal } from '../components/interviews/InterviewForm';
import { useEmployerApplicantDetails } from '../hooks/useEmployerApplicantDetails';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { ApplicationStatus } from '../types';
import { APPLICATION_STATUS_LABELS, EMPLOYER_BASE_PATH, INTERVIEW_TYPE_LABELS } from '../utils/employerConstants';
import { formatEmployerDate, formatEmployerDateTime, formatRelative } from '../utils/employerFormatters';

const STATUS_OPTIONS: ApplicationStatus[] = ['applied', 'viewed', 'shortlisted', 'interview', 'offer', 'rejected'];

export function EmployerApplicantDetailsPage() {
  const { applicationId = '' } = useParams();
  const notify = useNotify();
  const reloadMe = useEmployerStore((state) => state.load);
  const { can } = useEmployerPermissions();
  const canManage = can('manageApplicants');
  const { data: app, setData, loading, error, refetch } = useEmployerApplicantDetails(applicationId);

  const [updating, setUpdating] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  const setStatus = async (status: ApplicationStatus) => {
    if (!app || status === app.status) return;
    setUpdating(true);
    try {
      await employerApi.updateApplicantStatus(app.id, status);
      notify(`${app.fullName} moved to ${APPLICATION_STATUS_LABELS[status]}.`);
      await Promise.all([refetch(), reloadMe()]);
    } catch (err) {
      notify(getErrorMessage(err), 'error');
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!app) return;
    const body = note.trim();
    if (!body) {
      setNoteError('Write a note first.');
      return;
    }
    setSavingNote(true);
    setNoteError(null);
    try {
      const updated = await employerApi.addApplicantNote(app.id, body);
      setData(updated);
      setNote('');
      notify('Note added.');
    } catch (err) {
      setNoteError(getErrorMessage(err));
    } finally {
      setSavingNote(false);
    }
  };

  if (loading && !app) return <div className={ui.card}><EmployerLoading label="Loading applicant…" /></div>;
  if (error || !app) {
    return (
      <div className={ui.card}>
        <EmployerError title="Application unavailable" message={error ?? 'Application not found.'} onRetry={refetch} />
        <p style={{ textAlign: 'center' }}><Link to={`${EMPLOYER_BASE_PATH}/applicants`} className={ui.linkBtn}>Back to applications</Link></p>
      </div>
    );
  }

  const timeline = [
    ...app.statusHistory.map((entry) => ({
      key: `s-${entry.status}-${entry.changedAt}`,
      at: entry.changedAt,
      text: entry.status === 'applied' ? `Applied for ${app.job?.title ?? 'the job'}` : `Moved to ${APPLICATION_STATUS_LABELS[entry.status] ?? entry.status}`,
    })),
    ...app.interviews.map((item) => ({
      key: `i-${item.id}`,
      at: item.createdAt ?? item.startsAt,
      text: `Interview ${item.status === 'cancelled' ? 'cancelled' : 'scheduled'} for ${formatEmployerDateTime(item.startsAt, item.timezone)}`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (!app.statusHistory.length && app.appliedAt) {
    timeline.push({ key: 'applied', at: app.appliedAt, text: `Applied for ${app.job?.title ?? 'the job'}` });
  }

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Applicant"
        back={{ to: `${EMPLOYER_BASE_PATH}/applicants`, label: 'Applications' }}
        art={false}
        action={
          canManage && (
            <>
              {app.status !== 'shortlisted' && (
                <button type="button" className={ui.btnSecondary} disabled={updating} onClick={() => setStatus('shortlisted').catch(() => undefined)}>
                  <Star size={15} /> Shortlist
                </button>
              )}
              <button type="button" className={ui.btnPrimary} disabled={app.status === 'rejected'} onClick={() => setScheduleOpen(true)}>
                <CalendarPlus size={15} /> Schedule interview
              </button>
              {app.status !== 'rejected' && (
                <button type="button" className={ui.btnSecondary} onClick={() => setConfirmReject(true)} style={{ color: '#b91c1c' }}>
                  <CircleX size={15} /> Reject
                </button>
              )}
            </>
          )
        }
      />

      <div className={ui.card}>
        <div className={styles.profile}>
          <Avatar name={app.fullName} src={app.profilePicture} size={72} />
          <div className={styles.profileText}>
            <h2>{app.fullName}</h2>
            <p>
              Applied for{' '}
              {app.job ? <Link to={`${EMPLOYER_BASE_PATH}/jobs/${app.job.id}`}>{app.job.title}</Link> : 'a deleted job'} ·{' '}
              {formatEmployerDate(app.appliedAt)}
            </p>
            <div className={styles.contact}>
              <a href={`mailto:${app.email}`}><Mail size={14} /> {app.email}</a>
              {app.phone && <a href={`tel:${app.phone}`}><Phone size={14} /> {app.phone}</a>}
              {app.location && <span><MapPin size={14} /> {app.location}</span>}
              {app.linkedInUrl && (
                <a href={app.linkedInUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> LinkedIn</a>
              )}
            </div>
          </div>
          <div className={styles.statusBox}>
            <ApplicationStatusBadge status={app.status} />
            {canManage && (
              <label>
                <span className={ui.srOnly}>Update status</span>
                <select
                  className={ui.select}
                  value={app.status}
                  disabled={updating}
                  onChange={(e) => {
                    const next = e.target.value as ApplicationStatus;
                    if (next === 'rejected') setConfirmReject(true);
                    else setStatus(next).catch(() => undefined);
                  }}
                  style={{ minWidth: 180 }}
                >
                  {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
      </div>

      <div className={ui.split}>
        <div className={ui.page}>
          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Resume</h2>
            {app.resumeUrl ? (
              <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className={ui.btnSecondary}>
                <Download size={15} /> {app.resumeFileName || 'Open resume'}
              </a>
            ) : (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>
                {app.resumeFileName ? `${app.resumeFileName} (file not available for download)` : 'No resume was attached to this application.'}
              </p>
            )}
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Skills</h2>
            {app.skills.length ? (
              <div className={ui.chips}>{app.skills.map((skill) => <span key={skill} className={ui.tag}>{skill}</span>)}</div>
            ) : (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No skills listed.</p>
            )}
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Experience</h2>
            {app.experience ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <span className={ui.statIcon} style={{ margin: 0 }}><Briefcase size={17} /></span>
                <div>
                  <strong style={{ fontSize: 14 }}>{app.experience.roleTitle}</strong>
                  {app.experience.company && <span className={ui.cellSub}>{app.experience.company}</span>}
                  <p className={ui.prose} style={{ margin: '8px 0 0' }}>{app.experience.description}</p>
                </div>
              </div>
            ) : (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No experience provided.</p>
            )}
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Education</h2>
            {app.education ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <span className={ui.statIcon} style={{ margin: 0 }}><GraduationCap size={17} /></span>
                <div>
                  <strong style={{ fontSize: 14 }}>{app.education.school}</strong>
                  <span className={ui.cellSub}>{app.education.major} · Graduation {app.education.graduationDate}</span>
                </div>
              </div>
            ) : (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No education provided.</p>
            )}
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Cover letter</h2>
            {app.coverLetter ? <div className={ui.prose}>{app.coverLetter}</div> : <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No cover letter.</p>}
          </div>

          {Object.keys(app.answers).length > 0 && (
            <div className={ui.card}>
              <h2 className={ui.sectionTitle}>Application questions</h2>
              <dl className={ui.dl}>
                {Object.entries(app.answers).map(([question, answer]) => (
                  <div key={question}><dt>{question}</dt><dd>{answer}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </div>

        <div className={ui.page}>
          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Application details</h2>
            <dl className={ui.dl}>
              <div><dt>Applied job</dt><dd>{app.job ? `${app.job.title} · ${app.job.location}` : 'Deleted job'}</dd></div>
              <div><dt>Applied on</dt><dd>{formatEmployerDate(app.appliedAt)}</dd></div>
              <div><dt>Work authorization</dt><dd>{app.workAuthorized ? 'Authorized to work' : 'Not authorized / needs sponsorship'}</dd></div>
              <div><dt>Available from</dt><dd>{app.availableStartDate ? formatEmployerDate(app.availableStartDate) : 'Not specified'}</dd></div>
            </dl>
          </div>

          {app.interviews.length > 0 && (
            <div className={ui.card}>
              <h2 className={ui.sectionTitle}>Interviews</h2>
              <ul className={ui.list}>
                {app.interviews.map((item) => (
                  <li key={item.id}>
                    <Video size={16} color="#1677e8" />
                    <div style={{ flex: 1, fontSize: 13.5 }}>
                      {formatEmployerDateTime(item.startsAt, item.timezone)}
                      <span className={ui.cellSub}>{INTERVIEW_TYPE_LABELS[item.type]} · {item.durationMinutes} min</span>
                    </div>
                    <InterviewStatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
              <Link to={`${EMPLOYER_BASE_PATH}/interviews`} className={ui.linkBtn}>Manage interviews</Link>
            </div>
          )}

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Recruiter notes</h2>
            {canManage && (
              <form onSubmit={addNote} style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                <label className={ui.srOnly} htmlFor="recruiter-note">Add a note</label>
                <textarea
                  id="recruiter-note"
                  className={ui.textarea}
                  rows={3}
                  maxLength={5000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Private note for your team…"
                  aria-invalid={noteError ? 'true' : undefined}
                  style={{ minHeight: 80 }}
                />
                {noteError && <span className={ui.fieldError}>{noteError}</span>}
                <div>
                  <button type="submit" className={`${ui.btnSecondary} ${ui.btnSm}`} disabled={savingNote}>
                    {savingNote ? 'Saving…' : 'Add note'}
                  </button>
                </div>
              </form>
            )}
            {app.notes.length ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {app.notes.map((item) => (
                  <div key={item.id} className={styles.note}>
                    <p>{item.body}</p>
                    <footer>{item.authorName} · {formatRelative(item.createdAt)}</footer>
                  </div>
                ))}
              </div>
            ) : (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No notes yet. Notes are visible only to your team.</p>
            )}
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Timeline</h2>
            <ol className={styles.timeline}>
              {timeline.map((item) => (
                <li key={item.key}>
                  {item.text}
                  <time dateTime={item.at}>{formatEmployerDateTime(item.at)}</time>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={confirmReject}
        title="Reject this application?"
        description={`${app.fullName}'s application will be marked as rejected. You can change the status later.`}
        confirmLabel="Reject application"
        variant="danger"
        onConfirm={async () => {
          await setStatus('rejected');
          setConfirmReject(false);
        }}
        onCancel={() => setConfirmReject(false)}
      />

      <InterviewFormModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        application={{ id: app.id, fullName: app.fullName, jobTitle: app.job?.title ?? '' }}
        onSaved={() => {
          setScheduleOpen(false);
          notify('Interview scheduled.');
          void refetch();
        }}
      />
    </div>
  );
}

export default EmployerApplicantDetailsPage;
