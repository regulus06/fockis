import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EmployerJobForm, formToPayload, jobToForm, type JobFormValues } from '../components/jobs/EmployerJobForm';
import { employerApi } from '../services/employerApi';
import { useEmployerJobDetails } from '../hooks/useEmployerJobDetails';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { useNotify } from '../store/employerNotificationStore';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import type { JobPayload } from '../types';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';

/** Only send fields that changed, so untouched values (e.g. a past deadline) are not re-validated. */
function changedFields(before: JobPayload, after: JobPayload): Partial<JobPayload> {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof JobPayload)[]) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      diff[key] = after[key] ?? (Array.isArray(before[key]) ? [] : '');
    }
  }
  // The backend needs the URL whenever the method is (re)submitted as external.
  if ('applicationMethod' in diff || 'applicationUrl' in diff) {
    diff.applicationMethod = after.applicationMethod;
    if (after.applicationMethod === 'external') diff.applicationUrl = after.applicationUrl;
    else delete diff.applicationUrl;
  }
  // These fields can't be cleared through the existing DTO validation, so blanks are skipped.
  for (const key of ['salaryMin', 'salaryMax', 'applicationDeadline', 'salaryPeriod', 'currency', 'companyWebsite'] as const) {
    if (diff[key] === '') delete diff[key];
  }
  return diff as Partial<JobPayload>;
}

export function EmployerEditJobPage() {
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { isOwner } = useEmployerPermissions();
  const { data: job, loading, error, refetch } = useEmployerJobDetails(jobId);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const initial = useMemo(() => (job ? jobToForm(job) : null), [job]);
  const detailPath = `${EMPLOYER_BASE_PATH}/jobs/${jobId}`;

  const submit = async (values: JobFormValues) => {
    if (!initial) return;
    const payload = changedFields(formToPayload(initial), formToPayload(values));
    if (!Object.keys(payload).length) {
      notify('No changes to save.', 'info');
      navigate(detailPath);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      await employerApi.updateJob(jobId, payload);
      notify('Job listing updated.');
      navigate(detailPath);
    } catch (err) {
      setServerError(getErrorMessage(err, 'We could not save your changes.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className={ui.card}>
        <EmployerEmptyState
          title="Only the account owner can edit jobs"
          action={<Link to={detailPath} className={ui.btnSecondary}>Back to job</Link>}
        />
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title={job ? `Edit: ${job.title}` : 'Edit Job Listing'}
        description="Update the listing. Changes are visible to candidates right away."
        back={{ to: detailPath, label: 'Job details' }}
      />
      {loading && !job && <div className={ui.card}><EmployerLoading label="Loading job…" /></div>}
      {error && <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>}
      {initial && (
        <EmployerJobForm
          key={job?.id}
          mode="edit"
          initialValues={initial}
          submitting={submitting}
          serverError={serverError}
          cancelTo={detailPath}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

export default EmployerEditJobPage;
