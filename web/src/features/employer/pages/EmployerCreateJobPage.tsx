import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EmployerJobForm, emptyJobForm, formToPayload, type JobFormValues } from '../components/jobs/EmployerJobForm';
import { employerApi } from '../services/employerApi';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';
import { JOB_TEMPLATES } from '../data/employerResources';

export function EmployerCreateJobPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const company = useEmployerStore((state) => state.me?.company);
  const { isOwner } = useEmployerPermissions();
  const location = useLocation();
  const templateId = (location.state as { templateId?: string } | null)?.templateId;
  const [initial] = useState(() => {
    const base = emptyJobForm(company);
    const template = JOB_TEMPLATES.find((item) => item.id === templateId);
    return template
      ? { ...base, title: template.title, type: template.type, description: template.description, skills: template.skills, benefits: template.benefits }
      : base;
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async (values: JobFormValues) => {
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await employerApi.createJob(formToPayload(values));
      notify('Your job listing was created and sent for review.');
      navigate(created?._id ? `${EMPLOYER_BASE_PATH}/jobs/${created._id}` : `${EMPLOYER_BASE_PATH}/jobs`, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, 'We could not create the job. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOwner) {
    return (
      <div className={ui.card}>
        <EmployerEmptyState
          title="Only the account owner can create jobs"
          description="Ask the owner of this Employer Center to publish new job listings."
          action={<Link to={`${EMPLOYER_BASE_PATH}/jobs`} className={ui.btnSecondary}>Back to jobs</Link>}
        />
      </div>
    );
  }

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Create a Job Listing"
        description="Publish an opportunity and find qualified candidates."
        back={{ to: `${EMPLOYER_BASE_PATH}/jobs`, label: 'Job listings' }}
      />
      <EmployerJobForm
        mode="create"
        initialValues={initial}
        submitting={submitting}
        serverError={serverError}
        cancelTo={`${EMPLOYER_BASE_PATH}/jobs`}
        onSubmit={submit}
      />
    </div>
  );
}

export default EmployerCreateJobPage;
