import { useEffect, useState, type FormEvent } from 'react';
import ui from '../../styles/EmployerShared.module.scss';
import { EmployerModal } from '../shared/EmployerModal';
import { FormField } from '../shared/FormField';
import { employerApi } from '../../services/employerApi';
import { getErrorMessage, useEmployerQuery } from '../../hooks/useEmployerQuery';
import type { EmployerInterview, InterviewType } from '../../types';
import { INTERVIEW_TYPE_LABELS, browserTimezone, timezoneOptions } from '../../utils/employerConstants';
import { isValidHttpUrl, type FieldErrors } from '../../utils/employerValidators';
import { toDateTimeInput } from '../../utils/employerFormatters';

type Field = 'applicationId' | 'startsAt' | 'meetingUrl' | 'location' | 'durationMinutes';

export interface InterviewFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (interview: EmployerInterview) => void;
  /** Fixed applicant (from the applicant page). Otherwise a picker is shown. */
  application?: { id: string; fullName: string; jobTitle: string };
  /** Existing interview → reschedule mode. */
  interview?: EmployerInterview | null;
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

function defaultStart() {
  const date = new Date(Date.now() + 24 * 3600 * 1000);
  date.setMinutes(0, 0, 0);
  date.setHours(10);
  return toDateTimeInput(date);
}

export function InterviewFormModal({ open, onClose, onSaved, application, interview }: InterviewFormModalProps) {
  const editing = Boolean(interview);
  const [applicationId, setApplicationId] = useState('');
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [durationMinutes, setDuration] = useState(30);
  const [timezone, setTimezone] = useState(browserTimezone);
  const [type, setType] = useState<InterviewType>('video');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setServerError(null);
    setApplicationId(application?.id ?? interview?.applicationId ?? '');
    setStartsAt(interview ? toDateTimeInput(interview.startsAt) : defaultStart());
    setDuration(interview?.durationMinutes ?? 30);
    setTimezone(interview?.timezone ?? browserTimezone());
    setType(interview?.type ?? 'video');
    setMeetingUrl(interview?.meetingUrl ?? '');
    setLocation(interview?.location ?? '');
    setNotes(interview?.notes ?? '');
    // Reset only when the dialog opens or its subject changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, application?.id, interview?.id]);

  // Applicant picker only when scheduling from the Interviews page.
  const candidates = useEmployerQuery(
    () => employerApi.listApplicants({ limit: 100 }),
    [open],
    { enabled: open && !application && !interview },
  );

  const validate = (): FieldErrors<Field> => {
    const next: FieldErrors<Field> = {};
    if (!editing && !applicationId) next.applicationId = 'Choose an applicant.';
    const start = new Date(startsAt);
    if (!startsAt || Number.isNaN(start.getTime())) next.startsAt = 'Choose a date and time.';
    else if (start.getTime() < Date.now()) next.startsAt = 'The interview must be in the future.';
    if (type === 'video') {
      if (!meetingUrl.trim()) next.meetingUrl = 'Add the video meeting link.';
      else if (!isValidHttpUrl(meetingUrl)) next.meetingUrl = 'Enter a full URL starting with https://';
    }
    if (type === 'onsite' && !location.trim()) next.location = 'Add the interview address.';
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    setServerError(null);
    const payload = {
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes,
      timezone,
      type,
      meetingUrl: type === 'video' ? meetingUrl.trim() : meetingUrl.trim() || undefined,
      location: type === 'onsite' ? location.trim() : location.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      const saved = interview
        ? await employerApi.rescheduleInterview(interview.id, {
            ...payload,
            meetingUrl: payload.meetingUrl ?? '',
            location: payload.location ?? '',
            notes: payload.notes ?? '',
          })
        : await employerApi.scheduleInterview({ applicationId, ...payload });
      onSaved(saved);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const eligible = candidates.data?.items.filter((item) => item.status !== 'rejected') ?? [];

  return (
    <EmployerModal
      open={open}
      onClose={onClose}
      busy={saving}
      title={editing ? 'Reschedule interview' : 'Schedule interview'}
      description={
        interview
          ? `${interview.candidateName} · ${interview.jobTitle}`
          : application
            ? `${application.fullName} · ${application.jobTitle}`
            : 'The applicant is moved to the Interview stage.'
      }
      footer={
        <>
          <button type="button" className={ui.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="employer-interview-form" className={ui.btnPrimary} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save new time' : 'Schedule'}
          </button>
        </>
      }
    >
      <form id="employer-interview-form" onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        {!application && !interview && (
          <FormField label="Applicant" required error={errors.applicationId} hint={candidates.loading ? 'Loading applicants…' : candidates.error ?? undefined}>
            <select className={ui.select} value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
              <option value="">Choose an applicant</option>
              {eligible.map((item) => (
                <option key={item.id} value={item.id}>{item.fullName} — {item.jobTitle}</option>
              ))}
            </select>
          </FormField>
        )}

        <div className={ui.formGrid}>
          <FormField label="Date and time" required error={errors.startsAt}>
            <input className={ui.input} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </FormField>
          <FormField label="Duration">
            <select className={ui.select} value={durationMinutes} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </FormField>
          <FormField label="Time zone" hint="Shown to your team with the interview time.">
            <select className={ui.select} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {timezoneOptions().map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </FormField>
          <FormField label="Interview type" required>
            <select className={ui.select} value={type} onChange={(e) => setType(e.target.value as InterviewType)}>
              {Object.entries(INTERVIEW_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </FormField>
        </div>

        {type === 'video' && (
          <FormField label="Meeting link" required error={errors.meetingUrl}>
            <input className={ui.input} type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.example.com/abc-defg" />
          </FormField>
        )}
        {type === 'onsite' && (
          <FormField label="Location" required error={errors.location}>
            <input className={ui.input} value={location} maxLength={300} onChange={(e) => setLocation(e.target.value)} placeholder="Office address" />
          </FormField>
        )}
        <FormField label="Notes for your team" hint="Not visible to the candidate.">
          <textarea className={ui.textarea} rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 80 }} />
        </FormField>

        <p className={ui.hint} style={{ margin: 0 }}>
          Fockis records the interview here; it does not send calendar invitations. Share the time and link with the candidate directly.
        </p>

        {serverError && <p className={ui.fieldError} role="alert" style={{ margin: 0 }}>{serverError}</p>}
      </form>
    </EmployerModal>
  );
}

export default InterviewFormModal;
