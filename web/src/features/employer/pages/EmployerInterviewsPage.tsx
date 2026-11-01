import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, CalendarDays, CalendarPlus, CircleX, ExternalLink, Eye, MessageSquare, Star } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EmployerModal } from '../components/shared/EmployerModal';
import { ActionMenu } from '../components/shared/ActionMenu';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { FormField } from '../components/shared/FormField';
import { InterviewStatusBadge } from '../components/shared/EmployerStatusBadge';
import { InterviewFormModal } from '../components/interviews/InterviewForm';
import { useEmployerInterviews } from '../hooks/useEmployerInterviews';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerInterview, InterviewRecommendation } from '../types';
import { EMPLOYER_BASE_PATH, INTERVIEW_TYPE_LABELS } from '../utils/employerConstants';
import { formatEmployerDate, formatEmployerTime } from '../utils/employerFormatters';

const VIEWS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const RECOMMENDATIONS: { value: InterviewRecommendation; label: string }[] = [
  { value: 'strong_yes', label: 'Strong yes' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'strong_no', label: 'Strong no' },
];

function FeedbackModal({ interview, onClose, onSaved }: { interview: EmployerInterview | null; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(0);
  const [recommendation, setRecommendation] = useState<InterviewRecommendation | ''>('');
  const [comments, setComments] = useState('');
  const [errors, setErrors] = useState<{ rating?: string; recommendation?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!interview) return;
    const next = {
      rating: rating ? undefined : 'Choose a rating.',
      recommendation: recommendation ? undefined : 'Choose a recommendation.',
    };
    setErrors(next);
    if (next.rating || next.recommendation) return;
    setSaving(true);
    setServerError(null);
    try {
      await employerApi.submitInterviewFeedback(interview.id, {
        rating,
        recommendation: recommendation as InterviewRecommendation,
        comments: comments.trim() || undefined,
      });
      setRating(0);
      setRecommendation('');
      setComments('');
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <EmployerModal
      open={Boolean(interview)}
      onClose={onClose}
      busy={saving}
      title="Interview feedback"
      description={interview ? `${interview.candidateName} · ${interview.jobTitle}. Saving marks the interview as completed.` : undefined}
      footer={
        <>
          <button type="button" className={ui.btnSecondary} onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="interview-feedback" className={ui.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save feedback'}</button>
        </>
      }
    >
      <form id="interview-feedback" onSubmit={submit} noValidate style={{ display: 'grid', gap: 16 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className={ui.label} style={{ marginBottom: 8 }}>Overall rating <span className={ui.required}>*</span></legend>
          <div className={ui.row} role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value > 1 ? 's' : ''}`}
                className={ui.iconBtn}
                onClick={() => setRating(value)}
              >
                <Star size={22} fill={value <= rating ? '#f59e0b' : 'none'} color={value <= rating ? '#f59e0b' : '#9aa0bb'} />
              </button>
            ))}
          </div>
          {errors.rating && <span className={ui.fieldError}>{errors.rating}</span>}
        </fieldset>
        <FormField label="Recommendation" required error={errors.recommendation}>
          <select className={ui.select} value={recommendation} onChange={(e) => setRecommendation(e.target.value as InterviewRecommendation)}>
            <option value="">Choose…</option>
            {RECOMMENDATIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </FormField>
        <FormField label="Comments">
          <textarea className={ui.textarea} rows={5} maxLength={5000} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Strengths, concerns, and next steps…" />
        </FormField>
        {serverError && <p className={ui.fieldError} role="alert" style={{ margin: 0 }}>{serverError}</p>}
      </form>
    </EmployerModal>
  );
}

export function EmployerInterviewsPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { can } = useEmployerPermissions();
  const canManage = can('manageApplicants');
  const [view, setView] = useState('upcoming');
  const { data, loading, error, refetch } = useEmployerInterviews(view);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<EmployerInterview | null>(null);
  const [cancelling, setCancelling] = useState<EmployerInterview | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<EmployerInterview | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<EmployerInterview | null>(null);

  const counts = data?.counts;
  const countFor = (value: string) =>
    value === 'upcoming' ? counts?.upcoming ?? 0 : counts?.[value as 'scheduled' | 'completed' | 'cancelled'] ?? 0;

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Interviews"
        description="Schedule, reschedule, and collect feedback on candidate interviews."
        action={
          canManage && (
            <button type="button" className={ui.btnPrimary} onClick={() => setScheduleOpen(true)}>
              <CalendarPlus size={16} /> Schedule Interview
            </button>
          )
        }
      />

      <div className={ui.cardFlush}>
        <div className={ui.tabs} role="tablist" aria-label="Interview view" style={{ padding: '0 10px' }}>
          {VIEWS.map((item) => (
            <button key={item.value} type="button" role="tab" className={ui.tab} aria-selected={view === item.value} onClick={() => setView(item.value)}>
              {item.label} <span className={ui.muted}>({countFor(item.value)})</span>
            </button>
          ))}
        </div>

        {loading && !data && <EmployerLoading rows={5} label="Loading interviews" />}
        {error && <EmployerError message={error} onRetry={refetch} />}

        {data && !error && data.items.length === 0 && (
          <EmployerEmptyState
            icon={<CalendarDays size={24} />}
            title={view === 'upcoming' ? 'No upcoming interviews' : `No ${view} interviews`}
            description="Schedule an interview from an applicant's profile or with the button above."
            action={canManage && view === 'upcoming' && (
              <button type="button" className={ui.btnSecondary} onClick={() => setScheduleOpen(true)}><CalendarPlus size={15} /> Schedule Interview</button>
            )}
          />
        )}

        {data && data.items.length > 0 && (
          <div className={ui.tableWrap} aria-busy={loading}>
            <table className={`${ui.table} ${ui.responsiveTable}`}>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Job Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th><span className={ui.srOnly}>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Candidate">
                      <Link to={`${EMPLOYER_BASE_PATH}/applicants/${item.applicationId}`} className={ui.cellTitle}>{item.candidateName}</Link>
                      {item.feedback && <span className={ui.cellSub}>Feedback: {'★'.repeat(item.feedback.rating)}</span>}
                    </td>
                    <td data-label="Job">{item.jobTitle}</td>
                    <td data-label="Date">{formatEmployerDate(item.startsAt)}</td>
                    <td data-label="Time">
                      {formatEmployerTime(item.startsAt, item.timezone)}
                      <span className={ui.cellSub}>{item.durationMinutes} min</span>
                    </td>
                    <td data-label="Type">
                      {INTERVIEW_TYPE_LABELS[item.type]}
                      {item.type === 'video' && item.meetingUrl && item.status === 'scheduled' && (
                        <a href={item.meetingUrl} target="_blank" rel="noopener noreferrer" className={ui.cellSub} style={{ color: '#1677e8' }}>
                          Join meeting <ExternalLink size={11} />
                        </a>
                      )}
                      {item.type === 'onsite' && item.location && <span className={ui.cellSub}>{item.location}</span>}
                    </td>
                    <td data-label="Status"><InterviewStatusBadge status={item.status} /></td>
                    <td data-label="">
                      <ActionMenu
                        label={`Actions for interview with ${item.candidateName}`}
                        items={[
                          { label: 'View applicant', icon: <Eye size={15} />, onSelect: () => navigate(`${EMPLOYER_BASE_PATH}/applicants/${item.applicationId}`) },
                          { label: 'Reschedule', icon: <CalendarClock size={15} />, onSelect: () => setRescheduling(item), hidden: !canManage || item.status !== 'scheduled' },
                          { label: item.feedback ? 'Update feedback' : 'Add feedback', icon: <MessageSquare size={15} />, onSelect: () => setFeedbackFor(item), hidden: !canManage || item.status === 'cancelled' },
                          { label: 'View feedback', icon: <Star size={15} />, onSelect: () => setViewingFeedback(item), hidden: !item.feedback },
                          { label: 'Cancel interview', icon: <CircleX size={15} />, danger: true, onSelect: () => setCancelling(item), hidden: !canManage || item.status !== 'scheduled' },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InterviewFormModal
        open={scheduleOpen || Boolean(rescheduling)}
        interview={rescheduling}
        onClose={() => {
          setScheduleOpen(false);
          setRescheduling(null);
        }}
        onSaved={() => {
          notify(rescheduling ? 'Interview rescheduled.' : 'Interview scheduled.');
          setScheduleOpen(false);
          setRescheduling(null);
          void refetch();
        }}
      />

      <ConfirmActionModal
        open={Boolean(cancelling)}
        title="Cancel this interview?"
        description={cancelling ? `The interview with ${cancelling.candidateName} on ${formatEmployerDate(cancelling.startsAt)} will be cancelled. Let the candidate know directly.` : ''}
        confirmLabel="Cancel interview"
        cancelLabel="Keep it"
        variant="danger"
        onConfirm={async () => {
          if (!cancelling) return;
          await employerApi.cancelInterview(cancelling.id);
          notify('Interview cancelled.');
          setCancelling(null);
          await refetch();
        }}
        onCancel={() => setCancelling(null)}
      />

      <FeedbackModal
        interview={feedbackFor}
        onClose={() => setFeedbackFor(null)}
        onSaved={() => {
          notify('Feedback saved and interview marked as completed.');
          setFeedbackFor(null);
          void refetch();
        }}
      />

      <EmployerModal
        open={Boolean(viewingFeedback)}
        onClose={() => setViewingFeedback(null)}
        title="Interview feedback"
        description={viewingFeedback ? `${viewingFeedback.candidateName} · ${viewingFeedback.jobTitle}` : undefined}
      >
        {viewingFeedback?.feedback && (
          <dl className={ui.dl}>
            <div><dt>Rating</dt><dd>{'★'.repeat(viewingFeedback.feedback.rating)}{'☆'.repeat(5 - viewingFeedback.feedback.rating)}</dd></div>
            <div><dt>Recommendation</dt><dd>{RECOMMENDATIONS.find((r) => r.value === viewingFeedback.feedback?.recommendation)?.label}</dd></div>
            <div><dt>Comments</dt><dd className={ui.prose}>{viewingFeedback.feedback.comments || '—'}</dd></div>
            <div><dt>Submitted</dt><dd>{formatEmployerDate(viewingFeedback.feedback.submittedAt)}</dd></div>
          </dl>
        )}
      </EmployerModal>
    </div>
  );
}

export default EmployerInterviewsPage;
