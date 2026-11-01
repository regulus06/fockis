import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Globe, Info, Pencil, Send, Sparkles } from 'lucide-react';
import ui from '../../styles/EmployerShared.module.scss';
import styles from '../../styles/EmployerJobForm.module.scss';
import { FormField } from '../shared/FormField';
import { TagInput } from '../shared/TagInput';
import type {
  ApplicationMethod,
  EmployerCompany,
  EmployerJob,
  EmployerJobType,
  EmployerWorkplaceType,
  EmploymentType,
  ExperienceLevel,
  JobPayload,
  SalaryPeriod,
} from '../../types';
import {
  COUNTRIES,
  CURRENCIES,
  EMPLOYMENT_TYPE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  JOB_TYPE_LABELS,
  SALARY_PERIOD_LABELS,
  WORKPLACE_LABELS,
} from '../../utils/employerConstants';
import { isValidHttpUrl, type FieldErrors } from '../../utils/employerValidators';
import { formatEmployerDate, toDateInput } from '../../utils/employerFormatters';

/* ============================================================
   FORM STATE
============================================================ */

export interface JobFormValues {
  title: string;
  company: string;
  type: EmployerJobType;
  workplaceType: EmployerWorkplaceType;
  employmentType: EmploymentType | '';
  experienceLevel: ExperienceLevel | '';
  country: string;
  city: string;
  stateProvince: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  salaryPeriod: SalaryPeriod | '';
  description: string;
  skills: string[];
  benefits: string[];
  applicationDeadline: string;
  companyDescription: string;
  companyWebsite: string;
  applicationMethod: ApplicationMethod;
  applicationUrl: string;
}

type Field = keyof JobFormValues;

export const STEPS = ['Job Info', 'Description', 'Company', 'Review'] as const;

const STEP_FIELDS: Field[][] = [
  ['title', 'company', 'type', 'workplaceType', 'country', 'city', 'stateProvince', 'salaryMin', 'salaryMax', 'currency', 'salaryPeriod'],
  ['description', 'skills', 'benefits', 'applicationDeadline'],
  ['companyDescription', 'companyWebsite', 'applicationMethod', 'applicationUrl'],
  [],
];

export function emptyJobForm(company?: EmployerCompany | null): JobFormValues {
  return {
    title: '',
    company: company?.companyName ?? '',
    type: 'job',
    workplaceType: 'onsite',
    employmentType: '',
    experienceLevel: '',
    country: company?.country || 'United States',
    city: company?.city ?? '',
    stateProvince: company?.stateProvince ?? '',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    salaryPeriod: 'yearly',
    description: '',
    skills: [],
    benefits: [],
    applicationDeadline: '',
    companyDescription: company?.about ?? '',
    companyWebsite: company?.website ?? '',
    applicationMethod: 'fockis',
    applicationUrl: '',
  };
}

/** Reads numbers from the legacy free-text salary when no numeric range is stored. */
function legacySalary(salary: string): { min: string; max: string } {
  const numbers = (salary.match(/[\d,]+(?:\.\d+)?/g) ?? []).map((value) => value.replace(/,/g, ''));
  return { min: numbers[0] ?? '', max: numbers[1] ?? '' };
}

export function jobToForm(job: EmployerJob): JobFormValues {
  const legacy = legacySalary(job.salary ?? '');
  return {
    title: job.title,
    company: job.company,
    type: job.type,
    workplaceType: job.workplaceType,
    employmentType: job.employmentType ?? '',
    experienceLevel: job.experienceLevel ?? '',
    country: job.country,
    city: job.city,
    stateProvince: job.stateProvince ?? '',
    salaryMin: job.salaryMin != null ? String(job.salaryMin) : legacy.min,
    salaryMax: job.salaryMax != null ? String(job.salaryMax) : legacy.max,
    currency: job.currency || 'USD',
    salaryPeriod: job.salaryPeriod || '',
    description: job.description,
    skills: job.skills ?? [],
    benefits: job.benefits ?? [],
    applicationDeadline: job.applicationDeadline ? toDateInput(new Date(job.applicationDeadline)) : '',
    companyDescription: job.companyDescription ?? '',
    companyWebsite: job.companyWebsite ?? '',
    applicationMethod: job.applicationMethod ?? 'fockis',
    applicationUrl: job.applicationUrl ?? '',
  };
}

function salaryText(values: JobFormValues): string | undefined {
  const fmt = (raw: string) => new Intl.NumberFormat('en-US').format(Number(raw));
  if (values.salaryMin && values.salaryMax) return `${fmt(values.salaryMin)} - ${fmt(values.salaryMax)}`;
  if (values.salaryMin) return fmt(values.salaryMin);
  if (values.salaryMax) return fmt(values.salaryMax);
  return undefined;
}

/** Converts the form to the CreateJobDto shape accepted by POST /careers. */
export function formToPayload(values: JobFormValues): JobPayload {
  const external = values.applicationMethod === 'external';
  return {
    title: values.title.trim(),
    company: values.company.trim(),
    type: values.type,
    workplaceType: values.workplaceType,
    remote: values.workplaceType === 'remote',
    employmentType: values.type === 'job' && values.employmentType ? values.employmentType : undefined,
    experienceLevel: values.experienceLevel || undefined,
    country: values.country.trim(),
    city: values.city.trim(),
    stateProvince: values.stateProvince.trim() || undefined,
    description: values.description.trim(),
    salary: salaryText(values),
    salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
    salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
    currency: values.salaryMin || values.salaryMax ? values.currency : undefined,
    salaryPeriod: values.salaryPeriod || undefined,
    skills: values.skills,
    benefits: values.benefits,
    applicationDeadline: values.applicationDeadline
      ? new Date(`${values.applicationDeadline}T23:59:59`).toISOString()
      : undefined,
    companyDescription: values.companyDescription.trim() || undefined,
    companyWebsite: values.companyWebsite.trim() || undefined,
    applicationMethod: values.applicationMethod,
    applicationUrl: external ? values.applicationUrl.trim() : undefined,
  };
}

export function validateJobForm(values: JobFormValues, step: number | 'all'): FieldErrors<Field> {
  const errors: FieldErrors<Field> = {};
  const check = (field: Field) => step === 'all' || STEP_FIELDS[step].includes(field);

  if (check('title')) {
    const length = values.title.trim().length;
    if (!length) errors.title = 'Job title is required.';
    else if (length < 3) errors.title = 'Job title must be at least 3 characters.';
    else if (length > 150) errors.title = 'Job title must be 150 characters or fewer.';
  }
  if (check('company')) {
    const length = values.company.trim().length;
    if (length < 2) errors.company = 'Company name is required.';
    else if (length > 150) errors.company = 'Company name must be 150 characters or fewer.';
  }
  if (check('country') && !values.country.trim()) errors.country = 'Country is required.';
  if (check('city') && !values.city.trim()) errors.city = 'City is required.';

  if (check('salaryMin') || check('salaryMax')) {
    const min = values.salaryMin === '' ? null : Number(values.salaryMin);
    const max = values.salaryMax === '' ? null : Number(values.salaryMax);
    if (min !== null && (!Number.isFinite(min) || min < 0)) errors.salaryMin = 'Enter a valid amount.';
    if (max !== null && (!Number.isFinite(max) || max < 0)) errors.salaryMax = 'Enter a valid amount.';
    if (min !== null && max !== null && !errors.salaryMin && !errors.salaryMax && min > max) {
      errors.salaryMax = 'Maximum must be greater than or equal to minimum.';
    }
  }

  if (check('description')) {
    const length = values.description.trim().length;
    if (length < 20) errors.description = 'Describe the role in at least 20 characters.';
    else if (length > 20000) errors.description = 'Description must be 20,000 characters or fewer.';
  }

  if (check('applicationDeadline') && values.applicationDeadline) {
    const deadline = new Date(`${values.applicationDeadline}T23:59:59`);
    if (Number.isNaN(deadline.getTime())) errors.applicationDeadline = 'Enter a valid date.';
    else if (deadline.getTime() < Date.now()) errors.applicationDeadline = 'The deadline cannot be in the past.';
  }

  if (check('companyWebsite') && values.companyWebsite.trim() && !isValidHttpUrl(values.companyWebsite)) {
    errors.companyWebsite = 'Enter a full URL starting with https://';
  }

  if (check('applicationUrl') && values.applicationMethod === 'external') {
    if (!values.applicationUrl.trim()) errors.applicationUrl = 'An application URL is required when candidates apply on your website.';
    else if (!isValidHttpUrl(values.applicationUrl)) errors.applicationUrl = 'Enter a full URL starting with https://';
  }

  return errors;
}

/* ============================================================
   COMPONENT
============================================================ */

export interface EmployerJobFormProps {
  initialValues: JobFormValues;
  mode: 'create' | 'edit';
  submitting: boolean;
  serverError: string | null;
  cancelTo: string;
  onSubmit: (values: JobFormValues) => void;
}

export function EmployerJobForm({ initialValues, mode, submitting, serverError, cancelTo, onSubmit }: EmployerJobFormProps) {
  const [values, setValues] = useState<JobFormValues>(initialValues);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [furthest, setFurthest] = useState(mode === 'edit' ? STEPS.length - 1 : 0);

  // An unchanged (possibly past) deadline on an existing job must not block saving.
  const validate = (current: JobFormValues, scope: number | 'all') => {
    const result = validateJobForm(current, scope);
    if (mode === 'edit' && current.applicationDeadline === initialValues.applicationDeadline) {
      delete result.applicationDeadline;
    }
    return result;
  };

  const set = <K extends Field>(field: K, value: JobFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const goTo = (target: number) => {
    if (target > step) {
      for (let s = step; s < target; s += 1) {
        const stepErrors = validate(values, s);
        if (Object.values(stepErrors).some(Boolean)) {
          setErrors(stepErrors);
          setStep(s);
          focusFirstError();
          return;
        }
      }
    }
    setErrors({});
    setStep(target);
    setFurthest((current) => Math.max(current, target));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focusFirstError = () => {
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, 0);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (step < STEPS.length - 1) {
      goTo(step + 1);
      return;
    }
    const allErrors = validate(values, 'all');
    if (Object.values(allErrors).some(Boolean)) {
      const firstStep = STEP_FIELDS.findIndex((fields) => fields.some((field) => allErrors[field]));
      setErrors(allErrors);
      setStep(Math.max(0, firstStep));
      focusFirstError();
      return;
    }
    onSubmit(values);
  };

  const salaryLabel = useMemo(() => {
    const text = salaryText(values);
    if (!text) return 'Not specified';
    const period = values.salaryPeriod ? ` ${SALARY_PERIOD_LABELS[values.salaryPeriod]}` : '';
    return `${values.currency} ${text}${period}`;
  }, [values]);

  return (
    <form className={ui.card} onSubmit={submit} noValidate>
      <ol className={styles.stepper} aria-label="Job listing steps">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={index === step ? styles.stepCurrent : index < step || index <= furthest ? styles.stepDone : styles.step}
          >
            <button
              type="button"
              onClick={() => goTo(index)}
              disabled={index > furthest + 1 || submitting}
              aria-current={index === step ? 'step' : undefined}
              aria-label={`Step ${index + 1}: ${label}`}
            >
              {index + 1}
            </button>
            {label}
          </li>
        ))}
      </ol>

      {/* STEP 1 — JOB INFORMATION */}
      {step === 0 && (
        <>
          <div className={styles.formSection}>
            <h2>Job Information</h2>
            <div className={ui.formGrid}>
              <FormField label="Job title" required error={errors.title}>
                <input className={ui.input} value={values.title} maxLength={150} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Software Engineer" />
              </FormField>
              <FormField label="Company name" required error={errors.company}>
                <input className={ui.input} value={values.company} maxLength={150} onChange={(e) => set('company', e.target.value)} />
              </FormField>
              <FormField label="Job type" required>
                <select className={ui.select} value={values.type} onChange={(e) => set('type', e.target.value as EmployerJobType)}>
                  {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              <FormField label="Workplace arrangement" required>
                <select className={ui.select} value={values.workplaceType} onChange={(e) => set('workplaceType', e.target.value as EmployerWorkplaceType)}>
                  {Object.entries(WORKPLACE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
              {values.type === 'job' && (
                <FormField label="Employment type" hint="Shown as Full-time, Part-time… on Fockis Careers">
                  <select className={ui.select} value={values.employmentType} onChange={(e) => set('employmentType', e.target.value as EmploymentType | '')}>
                    <option value="">Not specified</option>
                    {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </FormField>
              )}
              <FormField label="Experience level">
                <select className={ui.select} value={values.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value as ExperienceLevel | '')}>
                  <option value="">Not specified</option>
                  {Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </FormField>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2>Location</h2>
            <div className={ui.formGrid3}>
              <FormField label="Country" required error={errors.country}>
                <input className={ui.input} list="employer-countries" value={values.country} maxLength={100} onChange={(e) => set('country', e.target.value)} />
              </FormField>
              <FormField label="City" required error={errors.city}>
                <input className={ui.input} value={values.city} maxLength={100} onChange={(e) => set('city', e.target.value)} placeholder="e.g. New York" />
              </FormField>
              <FormField label="State / Province" error={errors.stateProvince}>
                <input className={ui.input} value={values.stateProvince} maxLength={100} onChange={(e) => set('stateProvince', e.target.value)} placeholder="e.g. NY" />
              </FormField>
            </div>
            <datalist id="employer-countries">
              {COUNTRIES.map((country) => <option key={country} value={country} />)}
            </datalist>
          </div>

          <div className={styles.formSection}>
            <h2>Compensation</h2>
            <div className={styles.salaryRow}>
              <FormField label="Minimum salary" error={errors.salaryMin}>
                <input className={ui.input} type="number" min={0} inputMode="decimal" value={values.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} />
              </FormField>
              <FormField label="Maximum salary" error={errors.salaryMax}>
                <input className={ui.input} type="number" min={0} inputMode="decimal" value={values.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} />
              </FormField>
              <FormField label="Currency">
                <select className={ui.select} value={values.currency} onChange={(e) => set('currency', e.target.value)}>
                  {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </FormField>
              <FormField label="Salary period">
                <select className={ui.select} value={values.salaryPeriod} onChange={(e) => set('salaryPeriod', e.target.value as SalaryPeriod | '')}>
                  <option value="">Not specified</option>
                  {Object.entries(SALARY_PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{value === 'negotiable' ? label : label.replace('per ', 'Per ')}</option>
                  ))}
                </select>
              </FormField>
            </div>
          </div>
        </>
      )}

      {/* STEP 2 — DESCRIPTION */}
      {step === 1 && (
        <div className={styles.formSection}>
          <h2>Description</h2>
          <FormField
            label="Job description"
            required
            error={errors.description}
            hint={`${values.description.trim().length.toLocaleString()} / 20,000 characters. Include responsibilities, qualifications and what success looks like.`}
          >
            <textarea className={ui.textarea} rows={12} value={values.description} maxLength={20000} onChange={(e) => set('description', e.target.value)} />
          </FormField>
          <FormField label="Required skills" hint="Press Enter or comma after each skill.">
            <TagInput value={values.skills} onChange={(v) => set('skills', v)} placeholder="e.g. React, TypeScript" />
          </FormField>
          <FormField label="Benefits" hint="Press Enter or comma after each benefit.">
            <TagInput value={values.benefits} onChange={(v) => set('benefits', v)} placeholder="e.g. Health insurance, Remote stipend" />
          </FormField>
          <div className={ui.formGrid}>
            <FormField label="Application deadline" error={errors.applicationDeadline} hint="Optional. Applications close at the end of this day.">
              <input className={ui.input} type="date" min={toDateInput(new Date())} value={values.applicationDeadline} onChange={(e) => set('applicationDeadline', e.target.value)} />
            </FormField>
          </div>
        </div>
      )}

      {/* STEP 3 — COMPANY + HOW TO APPLY */}
      {step === 2 && (
        <>
          <div className={styles.formSection}>
            <h2>Company Information</h2>
            <FormField label="Company description" hint="Shown on the job page. Defaults to your company profile.">
              <textarea className={ui.textarea} rows={5} value={values.companyDescription} maxLength={3000} onChange={(e) => set('companyDescription', e.target.value)} />
            </FormField>
            <div className={ui.formGrid}>
              <FormField label="Company website" error={errors.companyWebsite}>
                <input className={ui.input} type="url" value={values.companyWebsite} onChange={(e) => set('companyWebsite', e.target.value)} placeholder="https://www.example.com" />
              </FormField>
            </div>
          </div>

          <div className={styles.formSection}>
            <h2>How candidates apply</h2>
            <div className={ui.choiceGroup} role="radiogroup" aria-label="Application method">
              <label className={ui.choice}>
                <input type="radio" name="applicationMethod" value="fockis" checked={values.applicationMethod === 'fockis'} onChange={() => set('applicationMethod', 'fockis')} />
                <div>
                  <strong>Apply on Fockis</strong>
                  <span>Candidates use the Fockis application form. You review, shortlist and interview them here.</span>
                </div>
              </label>
              <label className={ui.choice}>
                <input type="radio" name="applicationMethod" value="external" checked={values.applicationMethod === 'external'} onChange={() => set('applicationMethod', 'external')} />
                <div>
                  <strong>Apply on Company Website</strong>
                  <span>“Apply Now” sends candidates to your own careers page or applicant tracking system.</span>
                </div>
              </label>
            </div>

            {values.applicationMethod === 'external' ? (
              <FormField
                label="External application URL"
                required
                error={errors.applicationUrl}
                hint="Candidates are redirected here when they click Apply Now."
              >
                <input className={ui.input} type="url" value={values.applicationUrl} onChange={(e) => set('applicationUrl', e.target.value)} placeholder="https://careers.example.com/jobs/123" />
              </FormField>
            ) : (
              <p className={ui.notice}>
                <Info size={16} />
                Applications arrive in your Applications page, with resume, education, experience and cover letter.
              </p>
            )}
          </div>
        </>
      )}

      {/* STEP 4 — REVIEW */}
      {step === 3 && (
        <div className={styles.review}>
          <div className={styles.reviewBlock}>
            <header>
              <h3>Job Information</h3>
              <button type="button" className={ui.linkBtn} onClick={() => goTo(0)}><Pencil size={13} /> Edit</button>
            </header>
            <div className={styles.reviewGrid}>
              <dl className={ui.dl}><div><dt>Title</dt><dd>{values.title}</dd></div></dl>
              <dl className={ui.dl}><div><dt>Company</dt><dd>{values.company}</dd></div></dl>
              <dl className={ui.dl}><div><dt>Type</dt><dd>{[JOB_TYPE_LABELS[values.type], values.type === 'job' && values.employmentType ? EMPLOYMENT_TYPE_LABELS[values.employmentType] : '', values.experienceLevel ? EXPERIENCE_LEVEL_LABELS[values.experienceLevel] : '', WORKPLACE_LABELS[values.workplaceType]].filter(Boolean).join(' · ')}</dd></div></dl>
              <dl className={ui.dl}><div><dt>Location</dt><dd>{[values.city, values.stateProvince, values.country].filter(Boolean).join(', ')}</dd></div></dl>
              <dl className={ui.dl}><div><dt>Salary</dt><dd>{salaryLabel}</dd></div></dl>
              <dl className={ui.dl}><div><dt>Deadline</dt><dd>{values.applicationDeadline ? formatEmployerDate(`${values.applicationDeadline}T12:00:00`) : 'None'}</dd></div></dl>
            </div>
          </div>

          <div className={styles.reviewBlock}>
            <header>
              <h3>Description</h3>
              <button type="button" className={ui.linkBtn} onClick={() => goTo(1)}><Pencil size={13} /> Edit</button>
            </header>
            <p className={ui.prose} style={{ maxHeight: 220, overflow: 'auto', margin: 0 }}>{values.description}</p>
            {values.skills.length > 0 && (
              <div className={ui.chips} style={{ marginTop: 12 }}>{values.skills.map((s) => <span key={s} className={ui.tag}>{s}</span>)}</div>
            )}
            {values.benefits.length > 0 && (
              <p className={ui.muted} style={{ fontSize: 13, marginBottom: 0 }}>Benefits: {values.benefits.join(', ')}</p>
            )}
          </div>

          <div className={styles.reviewBlock}>
            <header>
              <h3>How candidates apply</h3>
              <button type="button" className={ui.linkBtn} onClick={() => goTo(2)}><Pencil size={13} /> Edit</button>
            </header>
            {values.applicationMethod === 'external' ? (
              <p style={{ margin: 0, fontSize: 14 }}>
                <Globe size={14} style={{ verticalAlign: -2 }} /> On your website:{' '}
                <a href={values.applicationUrl} target="_blank" rel="noopener noreferrer">{values.applicationUrl}</a>
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: 14 }}><Sparkles size={14} style={{ verticalAlign: -2 }} /> On Fockis with the Fockis application form</p>
            )}
          </div>

          {mode === 'create' && (
            <p className={ui.notice}>
              <Info size={16} />
              New listings are reviewed by Fockis before they appear in public job search. You can manage the listing right away.
            </p>
          )}
        </div>
      )}

      {serverError && (
        <p className={ui.noticeError} role="alert" style={{ marginTop: 18 }}>
          <Info size={16} />
          {serverError}
        </p>
      )}

      <div className={styles.footer}>
        <Link to={cancelTo} className={ui.btnGhost}>Cancel</Link>
        <span className={ui.spacer} />
        {step > 0 && (
          <button type="button" className={ui.btnSecondary} onClick={() => goTo(step - 1)} disabled={submitting}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="submit" className={ui.btnPrimary}>
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button type="submit" className={ui.btnPrimary} disabled={submitting}>
            <Send size={16} /> {submitting ? (mode === 'create' ? 'Publishing…' : 'Saving…') : mode === 'create' ? 'Publish Job' : 'Save Changes'}
          </button>
        )}
      </div>
    </form>
  );
}

export default EmployerJobForm;
