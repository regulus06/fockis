import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleCheck, ExternalLink, FileText, Send, Upload } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import formStyles from '../../employer/styles/EmployerJobForm.module.scss';
import styles from '../styles/CareersPages.module.scss';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { FormField } from '../../employer/components/shared/FormField';
import { TagInput } from '../../employer/components/shared/TagInput';
import { getErrorMessage, useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { isValidEmail, isValidHttpUrl, type FieldErrors } from '../../employer/utils/employerValidators';
import { CareersError, SignedIn } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { useJobDetails } from '../hooks/useJobDetails';
import { displayName } from '../hooks/useCareerUser';
import { applicationsApi } from '../services/applicationsApi';
import { profileApi, validateResumeFile } from '../services/profileApi';
import { isExternalJob, safeApplicationUrl } from '../utils/externalApply';
import { placeLabel, typeLabel } from '../utils/jobFormat';
import type { CareerProfile, FockisUser } from '../types';

const STEPS = ['Contact', 'Resume', 'Background', 'Review & Submit'];

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedInUrl: string;
  school: string;
  major: string;
  graduationDate: string;
  roleTitle: string;
  company: string;
  experienceDescription: string;
  skills: string[];
  coverLetter: string;
  workAuthorized: '' | 'yes' | 'no';
  availableStartDate: string;
}

type Field = keyof FormState | 'resume';

const STEP_FIELDS: Field[][] = [
  ['fullName', 'email', 'phone', 'location', 'linkedInUrl'],
  ['resume'],
  ['school', 'major', 'graduationDate', 'roleTitle', 'company', 'experienceDescription'],
  ['workAuthorized', 'coverLetter'],
];

const empty: FormState = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  linkedInUrl: '',
  school: '',
  major: '',
  graduationDate: '',
  roleTitle: '',
  company: '',
  experienceDescription: '',
  skills: [],
  coverLetter: '',
  workAuthorized: '',
  availableStartDate: '',
};

export function ApplyPage() {
  return <SignedIn>{(user) => <ApplyForm user={user} />}</SignedIn>;
}

function ApplyForm({ user }: { user: FockisUser }) {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, isLoading, error, refetch } = useJobDetails(jobId);
  const profile = useEmployerQuery(() => profileApi.get(), [user.username]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [resume, setResume] = useState<CareerProfile['resume']>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const prefilled = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Prefill once from the Fockis account and career profile.
  useEffect(() => {
    if (prefilled.current || profile.loading) return;
    prefilled.current = true;
    const p = profile.data;
    const edu = p?.education[0];
    const exp = p?.experience[0];
    setResume(p?.resume ?? null);
    setForm((current) => ({
      ...current,
      fullName: displayName(user),
      email: user.email ?? '',
      phone: p?.phone ?? '',
      location: p?.location || user.location || '',
      linkedInUrl: p?.linkedInUrl ?? '',
      school: edu?.school ?? '',
      major: edu?.fieldOfStudy || edu?.degree || '',
      graduationDate: edu?.endYear ?? '',
      roleTitle: exp?.title ?? '',
      company: exp?.company ?? '',
      experienceDescription: exp?.description ?? '',
      skills: p?.skills ?? [],
    }));
  }, [user, profile.loading, profile.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = (scope: number | 'all'): FieldErrors<Field> => {
    const e: FieldErrors<Field> = {};
    const has = (field: Field) => scope === 'all' || STEP_FIELDS[scope].includes(field);
    if (has('fullName') && form.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
    if (has('email') && !isValidEmail(form.email)) e.email = 'Enter a valid email address.';
    if (has('phone') && form.phone.trim().length < 5) e.phone = 'Enter a phone number.';
    if (has('location') && !form.location.trim()) e.location = 'Enter your location.';
    if (has('linkedInUrl') && form.linkedInUrl.trim() && !isValidHttpUrl(form.linkedInUrl)) e.linkedInUrl = 'Enter a full URL starting with https://';
    if (has('resume') && !resume) e.resume = 'Upload your resume to continue.';
    if (has('school') && !form.school.trim()) e.school = 'Enter your school.';
    if (has('major') && !form.major.trim()) e.major = 'Enter your field of study.';
    if (has('graduationDate') && !form.graduationDate.trim()) e.graduationDate = 'Enter your graduation date or expected year.';
    const anyExp = form.roleTitle.trim() || form.company.trim() || form.experienceDescription.trim();
    if (has('roleTitle') && anyExp && !form.roleTitle.trim()) e.roleTitle = 'Add your role title or clear the experience fields.';
    if (has('experienceDescription') && anyExp && !form.experienceDescription.trim()) e.experienceDescription = 'Briefly describe what you did.';
    if (has('workAuthorized') && !form.workAuthorized) e.workAuthorized = 'Tell the employer whether you are authorized to work.';
    return e;
  };

  const next = (event?: FormEvent) => {
    event?.preventDefault();
    const found = validate(step);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      void submit();
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    const problem = validateResumeFile(file);
    if (problem) {
      setErrors((current) => ({ ...current, resume: problem }));
      return;
    }
    setUploading(true);
    try {
      const updated = await profileApi.uploadResume(file);
      setResume(updated.resume);
      setErrors((current) => ({ ...current, resume: undefined }));
    } catch (err) {
      setErrors((current) => ({ ...current, resume: getErrorMessage(err, 'Upload failed. Please try again.') }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!job) return;
    const found = validate('all');
    if (Object.values(found).some(Boolean)) {
      setErrors(found);
      setStep(STEP_FIELDS.findIndex((fields) => fields.some((f) => found[f])));
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const hasExperience = form.roleTitle.trim() && form.experienceDescription.trim();
      await applicationsApi.submitApplication({
        jobId: job.id,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        location: form.location.trim(),
        linkedInUrl: form.linkedInUrl.trim() || undefined,
        education: { school: form.school.trim(), major: form.major.trim(), graduationDate: form.graduationDate.trim() },
        experience: hasExperience
          ? { roleTitle: form.roleTitle.trim(), company: form.company.trim() || undefined, description: form.experienceDescription.trim() }
          : undefined,
        skills: form.skills,
        coverLetter: form.coverLetter.trim() || undefined,
        workAuthorized: form.workAuthorized === 'yes',
        availableStartDate: form.availableStartDate ? new Date(`${form.availableStartDate}T12:00:00`).toISOString() : undefined,
        useProfileResume: true,
      });
      setSubmitted(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setServerError(getErrorMessage(err, 'We could not submit your application.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading && !job) return <div className={ui.card}><EmployerLoading label="Loading job…" /></div>;
  if (error || !job) return <div className={ui.card}><CareersError message={error ?? 'Job not found.'} onRetry={refetch} /></div>;

  if (isExternalJob(job)) {
    return (
      <div className={ui.card} style={{ maxWidth: 640 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Apply on {job.company.name}'s website</h1>
        <p className={ui.prose}>{job.company.name} accepts applications for {job.title} on their own website.</p>
        <a href={safeApplicationUrl(job.applicationUrl) ?? '#'} target="_blank" rel="noopener noreferrer" className={ui.btnPrimary}>
          Continue to application <ExternalLink size={15} />
        </a>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={ui.card} style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className={ui.state}>
          <span className={ui.stateIcon} style={{ background: '#dcfce7', color: '#15803d' }}><CircleCheck size={26} /></span>
          <h3>Application submitted!</h3>
          <p>Your application for {job.title} at {job.company.name} was sent with your resume. Track its status on My Applications.</p>
          <div className={ui.row} style={{ justifyContent: 'center', marginTop: 8 }}>
            <Link to="/careers/applications" className={ui.btnPrimary}>View my applications</Link>
            <Link to="/careers/jobs" className={ui.btnSecondary}>Find more jobs</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      <Link to={`/careers/jobs/${job.id}`} className={ui.linkBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> Back to job
      </Link>

      <div className={ui.card} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <CompanyLogo name={job.company.name} src={job.company.logoUrl} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>Apply: {job.title}</h1>
          <p className={ui.muted} style={{ margin: '4px 0 0', fontSize: 13.5 }}>{job.company.name} · {placeLabel(job)} · {typeLabel(job)}</p>
        </div>
      </div>

      <form className={ui.card} onSubmit={next} noValidate>
        <ol className={formStyles.stepper} aria-label="Application steps">
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? formStyles.stepCurrent : index < step ? formStyles.stepDone : formStyles.step}>
              <button type="button" disabled={index > step} onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined} aria-label={`Step ${index + 1}: ${label}`}>
                {index + 1}
              </button>
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className={ui.formGrid}>
            <FormField label="Full name" required error={errors.fullName}>
              <input className={ui.input} value={form.fullName} maxLength={150} onChange={(e) => set('fullName', e.target.value)} />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <input className={ui.input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
            <FormField label="Phone" required error={errors.phone}>
              <input className={ui.input} type="tel" value={form.phone} maxLength={30} onChange={(e) => set('phone', e.target.value)} />
            </FormField>
            <FormField label="Location" required error={errors.location}>
              <input className={ui.input} value={form.location} maxLength={200} onChange={(e) => set('location', e.target.value)} placeholder="City, State" />
            </FormField>
            <FormField label="LinkedIn URL" error={errors.linkedInUrl} className={ui.span2}>
              <input className={ui.input} type="url" value={form.linkedInUrl} onChange={(e) => set('linkedInUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
            </FormField>
          </div>
        )}

        {step === 1 && (
          <div style={{ display: 'grid', gap: 14 }}>
            <p className={ui.prose} style={{ margin: 0 }}>Your resume is stored privately on your career profile. Only employers you apply to can open it.</p>
            {resume ? (
              <div className={ui.noticeSuccess}>
                <FileText size={16} />
                <span style={{ flex: 1 }}><strong>{resume.fileName}</strong> will be attached.</span>
                <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Replace'}
                </button>
              </div>
            ) : (
              <button type="button" className={ui.btnPrimary} style={{ justifySelf: 'start' }} onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload resume'}
              </button>
            )}
            <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => void upload(e.target.files?.[0])} />
            <span className={ui.hint}>PDF, DOC or DOCX, up to 10 MB.</span>
            {errors.resume && <span className={ui.fieldError} role="alert">{errors.resume}</span>}
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <h2 className={ui.sectionTitle}>Education</h2>
              <div className={ui.formGrid3}>
                <FormField label="School" required error={errors.school}>
                  <input className={ui.input} value={form.school} maxLength={200} onChange={(e) => set('school', e.target.value)} />
                </FormField>
                <FormField label="Field of study" required error={errors.major}>
                  <input className={ui.input} value={form.major} maxLength={150} onChange={(e) => set('major', e.target.value)} />
                </FormField>
                <FormField label="Graduation" required error={errors.graduationDate} hint="Year or expected date">
                  <input className={ui.input} value={form.graduationDate} maxLength={50} onChange={(e) => set('graduationDate', e.target.value)} placeholder="2026" />
                </FormField>
              </div>
            </div>
            <div>
              <h2 className={ui.sectionTitle}>Most recent experience <span className={ui.muted} style={{ fontWeight: 500 }}>(optional)</span></h2>
              <div className={ui.formGrid}>
                <FormField label="Role title" error={errors.roleTitle}>
                  <input className={ui.input} value={form.roleTitle} maxLength={150} onChange={(e) => set('roleTitle', e.target.value)} />
                </FormField>
                <FormField label="Company">
                  <input className={ui.input} value={form.company} maxLength={150} onChange={(e) => set('company', e.target.value)} />
                </FormField>
                <FormField label="What you did" error={errors.experienceDescription} className={ui.span2}>
                  <textarea className={ui.textarea} rows={4} maxLength={5000} value={form.experienceDescription} onChange={(e) => set('experienceDescription', e.target.value)} />
                </FormField>
              </div>
            </div>
            <FormField label="Skills" hint="Press Enter or comma after each skill.">
              <TagInput value={form.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Customer service, Excel" max={50} />
            </FormField>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'grid', gap: 18 }}>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className={ui.label} style={{ marginBottom: 8 }}>Are you legally authorized to work for this employer? <span style={{ color: "#dc2626" }}>*</span></legend>
              <div className={ui.choiceGroup}>
                {(['yes', 'no'] as const).map((value) => (
                  <label key={value} className={ui.choice}>
                    <input type="radio" name="workAuthorized" checked={form.workAuthorized === value} onChange={() => set('workAuthorized', value)} aria-invalid={errors.workAuthorized ? 'true' : undefined} />
                    <div><strong>{value === 'yes' ? 'Yes' : 'No / I need sponsorship'}</strong></div>
                  </label>
                ))}
              </div>
              {errors.workAuthorized && <span className={ui.fieldError}>{errors.workAuthorized}</span>}
            </fieldset>
            <div className={ui.formGrid}>
              <FormField label="Available start date">
                <input className={ui.input} type="date" value={form.availableStartDate} onChange={(e) => set('availableStartDate', e.target.value)} />
              </FormField>
            </div>
            <FormField label="Cover letter" hint={`${form.coverLetter.length.toLocaleString()} / 10,000 characters`}>
              <textarea className={ui.textarea} rows={7} maxLength={10000} value={form.coverLetter} onChange={(e) => set('coverLetter', e.target.value)} placeholder={`Tell ${job.company.name} why you're a great fit…`} />
            </FormField>
            <div className={ui.notice}>
              <FileText size={16} />
              <span>
                Applying as <strong>{form.fullName}</strong> ({form.email}) with <strong>{resume?.fileName ?? 'no resume'}</strong>
                {form.school && <> · {form.school}</>}.
              </span>
            </div>
          </div>
        )}

        {serverError && <p className={ui.noticeError} role="alert" style={{ marginTop: 16 }}>{serverError}</p>}

        <div className={formStyles.footer}>
          <Link to={`/careers/jobs/${job.id}`} className={ui.btnGhost}>Cancel</Link>
          <span className={ui.spacer} />
          {step > 0 && (
            <button type="button" className={ui.btnSecondary} onClick={() => setStep(step - 1)} disabled={submitting}>
              <ArrowLeft size={16} /> Back
            </button>
          )}
          <button type="submit" className={ui.btnPrimary} disabled={submitting || uploading}>
            {step < STEPS.length - 1 ? <>Continue <ArrowRight size={16} /></> : <><Send size={16} /> {submitting ? 'Submitting…' : 'Submit application'}</>}
          </button>
        </div>
      </form>

      <p className={ui.hint} style={{ textAlign: 'center' }}>
        Navigating away? <button type="button" className={ui.linkBtn} onClick={() => navigate('/careers/profile')}>Complete your career profile</button> to prefill future applications.
      </p>
    </div>
  );
}

export default ApplyPage;
