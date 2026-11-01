import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Plus, Save, Trash2, Upload } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { Avatar } from '../../employer/components/shared/Avatar';
import { ConfirmActionModal } from '../../employer/components/shared/ConfirmActionModal';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { FormField } from '../../employer/components/shared/FormField';
import { TagInput } from '../../employer/components/shared/TagInput';
import { getErrorMessage, useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { useNotify } from '../../employer/store/employerNotificationStore';
import { isValidHttpUrl, type FieldErrors } from '../../employer/utils/employerValidators';
import { CareersError, SignedIn } from '../components/CareersState';
import { displayName } from '../hooks/useCareerUser';
import { profileApi, validateResumeFile } from '../services/profileApi';
import { formatDate } from '../utils/jobFormat';
import type {
  Availability,
  CareerCertification,
  CareerEducation,
  CareerExperience,
  CareerProfile,
  CareerProfileInput,
  FockisUser,
} from '../types';

type Draft = Required<CareerProfileInput>;

const AVAILABILITY: { value: Availability; label: string }[] = [
  { value: 'actively_looking', label: 'Actively looking' },
  { value: 'open', label: 'Open to opportunities' },
  { value: 'not_looking', label: 'Not looking' },
];

const emptyEducation = (): CareerEducation => ({ school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' });
const emptyExperience = (): CareerExperience => ({ title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' });
const emptyCertification = (): CareerCertification => ({ name: '', issuer: '', year: '', inProgress: false });

function toDraft(p: CareerProfile): Draft {
  return {
    headline: p.headline,
    summary: p.summary,
    location: p.location,
    phone: p.phone,
    linkedInUrl: p.linkedInUrl,
    websiteUrl: p.websiteUrl,
    availability: p.availability,
    skills: p.skills,
    education: p.education.map(({ id: _id, ...rest }) => rest),
    experience: p.experience.map(({ id: _id, ...rest }) => rest),
    certifications: p.certifications.map(({ id: _id, ...rest }) => rest),
  };
}

const YEAR = /^\d{4}$/;
const MONTH = /^\d{4}-\d{2}$/;

function validate(d: Draft): FieldErrors {
  const e: FieldErrors = {};
  if (d.linkedInUrl.trim() && !isValidHttpUrl(d.linkedInUrl)) e.linkedInUrl = 'Enter a full URL starting with https://';
  if (d.websiteUrl.trim() && !isValidHttpUrl(d.websiteUrl)) e.websiteUrl = 'Enter a full URL starting with https://';
  d.education.forEach((ed, i) => {
    if (!ed.school.trim()) e[`edu${i}school`] = 'School is required.';
    if (ed.startYear && !YEAR.test(ed.startYear)) e[`edu${i}start`] = 'Use a 4-digit year.';
    if (ed.endYear && !YEAR.test(ed.endYear)) e[`edu${i}end`] = 'Use a 4-digit year.';
    if (YEAR.test(ed.startYear) && YEAR.test(ed.endYear) && ed.endYear < ed.startYear) e[`edu${i}end`] = 'End year is before start year.';
  });
  d.experience.forEach((ex, i) => {
    if (!ex.title.trim()) e[`exp${i}title`] = 'Title is required.';
    if (!ex.company.trim()) e[`exp${i}company`] = 'Company is required.';
    if (ex.startDate && !MONTH.test(ex.startDate)) e[`exp${i}start`] = 'Pick a month.';
    if (!ex.current && ex.endDate && MONTH.test(ex.startDate) && ex.endDate < ex.startDate) e[`exp${i}end`] = 'End date is before start date.';
  });
  d.certifications.forEach((c, i) => {
    if (!c.name.trim()) e[`cert${i}name`] = 'Name is required.';
    if (c.year && !YEAR.test(c.year)) e[`cert${i}year`] = 'Use a 4-digit year.';
  });
  return e;
}

export function CareerProfilePage({ focus = 'profile' }: { focus?: 'profile' | 'resume' }) {
  return <SignedIn>{(user) => <ProfileEditor user={user} focus={focus} />}</SignedIn>;
}

function ProfileEditor({ user, focus }: { user: FockisUser; focus: 'profile' | 'resume' }) {
  const notify = useNotify();
  const { data, setData, loading, error, refetch } = useEmployerQuery(() => profileApi.get(), []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && !draft) setDraft(toDraft(data));
  }, [data, draft]);

  useEffect(() => {
    if (focus === 'resume' && data) resumeRef.current?.scrollIntoView({ block: 'start' });
  }, [focus, data]);

  if (loading && !data) return <div className={ui.card}><EmployerLoading label="Loading your career profile…" /></div>;
  if (error || !data || !draft) return <div className={ui.card}><CareersError message={error ?? 'Could not load your profile.'} onRetry={refetch} /></div>;

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(data));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value });
  const setItem = <K extends 'education' | 'experience' | 'certifications'>(key: K, index: number, patch: Partial<Draft[K][number]>) =>
    set(key, draft[key].map((item, i) => (i === index ? { ...item, ...patch } : item)) as Draft[K]);
  const removeItem = (key: 'education' | 'experience' | 'certifications', index: number) =>
    set(key, draft[key].filter((_, i) => i !== index) as never);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      const updated = await profileApi.update({
        ...draft,
        experience: draft.experience.map((x) => (x.current ? { ...x, endDate: '' } : x)),
      });
      setData(updated);
      setDraft(toDraft(updated));
      notify('Career profile saved.');
    } catch (err) {
      setServerError(getErrorMessage(err, 'Could not save your profile.'));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    const problem = validateResumeFile(file);
    setResumeError(problem);
    if (problem) return;
    setUploading(true);
    try {
      const updated = await profileApi.uploadResume(file);
      setData((current) => (current ? { ...current, resume: updated.resume, completeness: updated.completeness } : updated));
      notify('Resume uploaded.');
    } catch (err) {
      setResumeError(getErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openResume = async () => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open('', '_blank');
    try {
      const { url } = await profileApi.resumeUrl();
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      tab?.close();
      notify(getErrorMessage(err, 'Could not open your resume.'), 'error');
    }
  };

  const deleteResume = async () => {
    try {
      const updated = await profileApi.deleteResume();
      setData((current) => (current ? { ...current, resume: null, completeness: updated.completeness } : updated));
      notify('Resume removed.');
    } catch (err) {
      notify(getErrorMessage(err, 'Could not remove your resume.'), 'error');
    } finally {
      setConfirmDelete(false);
    }
  };

  const name = displayName(user);

  return (
    <form className={styles.page} onSubmit={save} noValidate>
      <div className={styles.head}>
        <div>
          <h1>{focus === 'resume' ? 'My Resume' : 'Career Profile'}</h1>
          <p>Employers see this information when you apply. Profile {data.completeness}% complete.</p>
        </div>
        <Link to="/careers/applications" className={ui.btnSecondary}>My applications</Link>
      </div>

      <div className={ui.card}>
        <div className={styles.profileHead}>
          <Avatar name={name} src={user.profilePicture} size={72} />
          <div className={styles.profileHeadText}>
            <h2>{name}</h2>
            <p>{draft.headline || 'Add a headline so employers know what you do.'}</p>
            <span className={ui.hint}>Your photo and name come from your Fockis account. <Link to="/settings" className={ui.linkBtn}>Change in Settings</Link></span>
          </div>
          <div style={{ minWidth: 180 }}>
            <div className={styles.meterLabel}><span>Profile strength</span><strong>{data.completeness}%</strong></div>
            <div className={styles.meter}><span style={{ width: `${data.completeness}%` }} /></div>
          </div>
        </div>
      </div>

      <div ref={resumeRef} className={ui.card} style={{ scrollMarginTop: 90 }}>
        <h2 className={ui.sectionTitle}>Resume</h2>
        <div className={styles.resumeBox}>
          <span className={styles.resumeIcon}><FileText size={20} /></span>
          <div className={styles.resumeText}>
            {data.resume ? (
              <>
                <strong>{data.resume.fileName}</strong>
                <span>{(data.resume.size / 1024 / 1024).toFixed(2)} MB · Uploaded {formatDate(data.resume.uploadedAt)}</span>
              </>
            ) : (
              <>
                <strong>No resume uploaded</strong>
                <span>PDF, DOC or DOCX up to 10 MB. Private — only employers you apply to can open it.</span>
              </>
            )}
          </div>
          <div className={ui.row}>
            {data.resume && (
              <>
                <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => void openResume()}>
                  <Download size={14} /> View
                </button>
                <button type="button" className={`${ui.btnGhost} ${ui.btnSm}`} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} /> Remove
                </button>
              </>
            )}
            <button type="button" className={`${ui.btnPrimary} ${ui.btnSm}`} onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload size={14} /> {uploading ? 'Uploading…' : data.resume ? 'Replace' : 'Upload resume'}
            </button>
          </div>
          <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => void upload(e.target.files?.[0])} />
        </div>
        {resumeError && <p className={ui.fieldError} role="alert">{resumeError}</p>}
      </div>

      <div className={ui.card}>
        <h2 className={ui.sectionTitle}>About you</h2>
        <div className={ui.formGrid}>
          <FormField label="Headline" className={ui.span2} hint="e.g. Customer Success Specialist | SaaS">
            <input className={ui.input} value={draft.headline} maxLength={160} onChange={(e) => set('headline', e.target.value)} />
          </FormField>
          <FormField label="Summary" className={ui.span2} hint={`${draft.summary.length} / 3,000`}>
            <textarea className={ui.textarea} rows={5} maxLength={3000} value={draft.summary} onChange={(e) => set('summary', e.target.value)} />
          </FormField>
          <FormField label="Location">
            <input className={ui.input} value={draft.location} maxLength={200} onChange={(e) => set('location', e.target.value)} placeholder="City, State" />
          </FormField>
          <FormField label="Phone">
            <input className={ui.input} type="tel" value={draft.phone} maxLength={30} onChange={(e) => set('phone', e.target.value)} />
          </FormField>
          <FormField label="LinkedIn" error={errors.linkedInUrl}>
            <input className={ui.input} type="url" value={draft.linkedInUrl} onChange={(e) => set('linkedInUrl', e.target.value)} placeholder="https://linkedin.com/in/…" />
          </FormField>
          <FormField label="Website / portfolio" error={errors.websiteUrl}>
            <input className={ui.input} type="url" value={draft.websiteUrl} onChange={(e) => set('websiteUrl', e.target.value)} placeholder="https://" />
          </FormField>
          <FormField label="Availability">
            <select className={ui.select} value={draft.availability} onChange={(e) => set('availability', e.target.value as Availability)}>
              {AVAILABILITY.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      <div className={ui.card}>
        <div className={styles.cardHead}>
          <h2>Experience</h2>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => set('experience', [...draft.experience, emptyExperience()])} disabled={draft.experience.length >= 20}>
            <Plus size={14} /> Add experience
          </button>
        </div>
        {draft.experience.length === 0 ? <p className={ui.muted} style={{ margin: 0 }}>No experience added yet.</p> : (
          <div className={styles.entries}>
            {draft.experience.map((x, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryHead}>
                  <span>{x.title || 'New position'}</span>
                  <button type="button" className={ui.iconBtn} onClick={() => removeItem('experience', i)} aria-label={`Remove experience ${x.title || i + 1}`}><Trash2 size={15} /></button>
                </div>
                <div className={ui.formGrid}>
                  <FormField label="Title" required error={errors[`exp${i}title`]}>
                    <input className={ui.input} value={x.title} maxLength={150} onChange={(e) => setItem('experience', i, { title: e.target.value })} />
                  </FormField>
                  <FormField label="Company" required error={errors[`exp${i}company`]}>
                    <input className={ui.input} value={x.company} maxLength={150} onChange={(e) => setItem('experience', i, { company: e.target.value })} />
                  </FormField>
                  <FormField label="Start" error={errors[`exp${i}start`]}>
                    <input className={ui.input} type="month" value={x.startDate} onChange={(e) => setItem('experience', i, { startDate: e.target.value })} />
                  </FormField>
                  <FormField label="End" error={errors[`exp${i}end`]}>
                    <input className={ui.input} type="month" value={x.current ? '' : x.endDate} disabled={x.current} onChange={(e) => setItem('experience', i, { endDate: e.target.value })} />
                  </FormField>
                  <label className={ui.checkboxRow}>
                    <input type="checkbox" checked={x.current} onChange={(e) => setItem('experience', i, { current: e.target.checked })} /> I currently work here
                  </label>
                  <FormField label="Location">
                    <input className={ui.input} value={x.location} maxLength={200} onChange={(e) => setItem('experience', i, { location: e.target.value })} />
                  </FormField>
                  <FormField label="Description" className={ui.span2}>
                    <textarea className={ui.textarea} rows={3} maxLength={3000} value={x.description} onChange={(e) => setItem('experience', i, { description: e.target.value })} />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={ui.card}>
        <div className={styles.cardHead}>
          <h2>Education</h2>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => set('education', [...draft.education, emptyEducation()])} disabled={draft.education.length >= 10}>
            <Plus size={14} /> Add education
          </button>
        </div>
        {draft.education.length === 0 ? <p className={ui.muted} style={{ margin: 0 }}>No education added yet.</p> : (
          <div className={styles.entries}>
            {draft.education.map((ed, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryHead}>
                  <span>{ed.school || 'New school'}</span>
                  <button type="button" className={ui.iconBtn} onClick={() => removeItem('education', i)} aria-label={`Remove education ${ed.school || i + 1}`}><Trash2 size={15} /></button>
                </div>
                <div className={ui.formGrid}>
                  <FormField label="School" required error={errors[`edu${i}school`]}>
                    <input className={ui.input} value={ed.school} maxLength={200} onChange={(e) => setItem('education', i, { school: e.target.value })} />
                  </FormField>
                  <FormField label="Degree">
                    <input className={ui.input} value={ed.degree} maxLength={150} onChange={(e) => setItem('education', i, { degree: e.target.value })} placeholder="e.g. B.S." />
                  </FormField>
                  <FormField label="Field of study" className={ui.span2}>
                    <input className={ui.input} value={ed.fieldOfStudy} maxLength={150} onChange={(e) => setItem('education', i, { fieldOfStudy: e.target.value })} />
                  </FormField>
                  <FormField label="Start year" error={errors[`edu${i}start`]}>
                    <input className={ui.input} inputMode="numeric" maxLength={4} value={ed.startYear} onChange={(e) => setItem('education', i, { startYear: e.target.value.replace(/\D/g, '') })} />
                  </FormField>
                  <FormField label="End year (or expected)" error={errors[`edu${i}end`]}>
                    <input className={ui.input} inputMode="numeric" maxLength={4} value={ed.endYear} onChange={(e) => setItem('education', i, { endYear: e.target.value.replace(/\D/g, '') })} />
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={ui.card}>
        <h2 className={ui.sectionTitle}>Skills</h2>
        <FormField label="Skills" hint="Press Enter or comma after each skill. Up to 50.">
          <TagInput value={draft.skills} onChange={(v) => set('skills', v)} placeholder="e.g. Customer service, SQL" max={50} />
        </FormField>
      </div>

      <div className={ui.card}>
        <div className={styles.cardHead}>
          <h2>Certifications</h2>
          <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => set('certifications', [...draft.certifications, emptyCertification()])} disabled={draft.certifications.length >= 20}>
            <Plus size={14} /> Add certification
          </button>
        </div>
        {draft.certifications.length === 0 ? <p className={ui.muted} style={{ margin: 0 }}>No certifications added yet.</p> : (
          <div className={styles.entries}>
            {draft.certifications.map((c, i) => (
              <div key={i} className={styles.entry}>
                <div className={styles.entryHead}>
                  <span>{c.name || 'New certification'}</span>
                  <button type="button" className={ui.iconBtn} onClick={() => removeItem('certifications', i)} aria-label={`Remove certification ${c.name || i + 1}`}><Trash2 size={15} /></button>
                </div>
                <div className={ui.formGrid3}>
                  <FormField label="Name" required error={errors[`cert${i}name`]}>
                    <input className={ui.input} value={c.name} maxLength={150} onChange={(e) => setItem('certifications', i, { name: e.target.value })} />
                  </FormField>
                  <FormField label="Issuer">
                    <input className={ui.input} value={c.issuer} maxLength={150} onChange={(e) => setItem('certifications', i, { issuer: e.target.value })} />
                  </FormField>
                  <FormField label="Year" error={errors[`cert${i}year`]}>
                    <input className={ui.input} inputMode="numeric" maxLength={4} value={c.year} onChange={(e) => setItem('certifications', i, { year: e.target.value.replace(/\D/g, '') })} />
                  </FormField>
                </div>
                <label className={ui.checkboxRow}>
                  <input type="checkbox" checked={c.inProgress} onChange={(e) => setItem('certifications', i, { inProgress: e.target.checked })} /> In progress
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {serverError && <p className={ui.noticeError} role="alert">{serverError}</p>}

      <div className={styles.saveBar}>
        <span className={ui.muted} style={{ marginRight: 'auto', fontSize: 13 }}>{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        <button type="button" className={ui.btnGhost} disabled={!dirty || saving} onClick={() => { setDraft(toDraft(data)); setErrors({}); }}>
          Discard
        </button>
        <button type="submit" className={ui.btnPrimary} disabled={!dirty || saving}>
          <Save size={16} /> {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>

      <ConfirmActionModal
        open={confirmDelete}
        title="Remove resume?"
        description="Your resume is removed from your profile. Applications you already sent keep their copy."
        confirmLabel="Remove resume"
        variant="danger"
        onConfirm={deleteResume}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}

export default CareerProfilePage;
