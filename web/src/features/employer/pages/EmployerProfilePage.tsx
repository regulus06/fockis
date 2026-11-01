import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  Globe,
  ImagePlus,
  Link2,
  MapPin,
  Pencil,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerProfile.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { FormField } from '../components/shared/FormField';
import { ImageUpload } from '../components/shared/ImageUpload';
import { Avatar } from '../components/shared/Avatar';
import { Badge } from '../components/shared/EmployerStatusBadge';
import { useEmployerProfile } from '../hooks/useEmployerProfile';
import { useEmployerTeam } from '../hooks/useEmployerTeam';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerCompany, EmployerProfileInput } from '../types';
import { COMPANY_SIZES, COUNTRIES, EMPLOYER_BASE_PATH, INDUSTRIES } from '../utils/employerConstants';
import { initials } from '../utils/employerFormatters';
import { isValidHttpUrl, type FieldErrors } from '../utils/employerValidators';
import { ROLE_LABELS } from '../utils/employerPermissions';

type Tab = 'overview' | 'media' | 'team' | 'verification';

const SOCIAL_FIELDS: { key: keyof EmployerCompany['socialLinks']; label: string }[] = [
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X (Twitter)' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
];

interface FormState {
  companyName: string;
  tagline: string;
  industry: string;
  companySize: string;
  website: string;
  foundedYear: string;
  country: string;
  city: string;
  stateProvince: string;
  about: string;
  logoUrl: string;
  coverImageUrl: string;
  socialLinks: EmployerCompany['socialLinks'];
}

function toForm(company: EmployerCompany | null, fallbackName: string): FormState {
  return {
    companyName: company?.companyName || fallbackName,
    tagline: company?.tagline ?? '',
    industry: company?.industry ?? '',
    companySize: company?.companySize ?? '',
    website: company?.website ?? '',
    foundedYear: company?.foundedYear ? String(company.foundedYear) : '',
    country: company?.country ?? '',
    city: company?.city ?? '',
    stateProvince: company?.stateProvince ?? '',
    about: company?.about ?? '',
    logoUrl: company?.logoUrl ?? '',
    coverImageUrl: company?.coverImageUrl ?? '',
    socialLinks: company?.socialLinks ?? { linkedin: '', x: '', facebook: '', instagram: '', youtube: '' },
  };
}

function toPayload(form: FormState, media?: EmployerCompany['media']): EmployerProfileInput {
  return {
    companyName: form.companyName.trim(),
    tagline: form.tagline.trim(),
    industry: form.industry,
    companySize: form.companySize,
    website: form.website.trim(),
    foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
    country: form.country.trim(),
    city: form.city.trim(),
    stateProvince: form.stateProvince.trim(),
    about: form.about.trim(),
    logoUrl: form.logoUrl,
    coverImageUrl: form.coverImageUrl,
    socialLinks: Object.fromEntries(Object.entries(form.socialLinks).map(([k, v]) => [k, v.trim()])) as EmployerCompany['socialLinks'],
    media: media?.map((item) => ({ url: item.url, caption: item.caption || undefined })),
  };
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const name = form.companyName.trim();
  if (name.length < 2) errors.companyName = 'Company name is required.';
  else if (name.length > 150) errors.companyName = 'Company name must be 150 characters or fewer.';
  if (form.website.trim() && !isValidHttpUrl(form.website)) errors.website = 'Enter a full URL starting with https://';
  if (form.foundedYear) {
    const year = Number(form.foundedYear);
    if (!Number.isInteger(year) || year < 1800 || year > new Date().getFullYear()) errors.foundedYear = 'Enter a valid year.';
  }
  for (const { key, label } of SOCIAL_FIELDS) {
    if (form.socialLinks[key].trim() && !isValidHttpUrl(form.socialLinks[key])) errors[`social.${key}`] = `Enter a full ${label} URL.`;
  }
  return errors;
}

export function EmployerProfilePage() {
  const notify = useNotify();
  const setCompany = useEmployerStore((state) => state.setCompany);
  const { can } = useEmployerPermissions();
  const canEdit = can('manageCompany');
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';

  const { data, setData, loading, error, refetch } = useEmployerProfile();
  const company = data?.company ?? null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => toForm(null, ''));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm(toForm(data.company, data.suggestedCompanyName));
      if (!data.company?.companyName && canEdit) setEditing(true);
    }
  }, [data, canEdit]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const persist = async (payload: EmployerProfileInput, message: string) => {
    const response = await employerApi.updateProfile(payload);
    setData((current) => (current ? { ...current, company: response.company } : current));
    setCompany(response.company);
    notify(message);
    return response.company;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      await persist(toPayload(form, company?.media), 'Company profile saved.');
      setEditing(false);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const updateMedia = async (media: EmployerCompany['media'], message: string) => {
    const base = toForm(company, data?.suggestedCompanyName ?? '');
    if (base.companyName.trim().length < 2) {
      notify('Add your company name in the Overview tab before adding media.', 'error');
      return;
    }
    try {
      await persist(toPayload(base, media), message);
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    }
  };

  const changeTab = (next: Tab) => {
    const search = new URLSearchParams(params);
    if (next === 'overview') search.delete('tab');
    else search.set('tab', next);
    setParams(search, { replace: true });
  };

  if (loading && !data) return <div className={ui.card}><EmployerLoading label="Loading company profile…" /></div>;
  if (error && !data) return <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>;

  const shown = editing ? form : toForm(company, data?.suggestedCompanyName ?? '');
  const location = [shown.city, shown.stateProvince, shown.country].filter(Boolean).join(', ');
  const verified = company?.verificationStatus === 'approved';

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Company Profile" description="Manage your company's public profile on Fockis Careers." />

      <div className={ui.tabs} role="tablist" aria-label="Company profile sections">
        {(['overview', 'media', 'team', 'verification'] as Tab[]).map((value) => (
          <button key={value} type="button" role="tab" className={ui.tab} aria-selected={tab === value} onClick={() => changeTab(value)}>
            {value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <form onSubmit={save} noValidate className={ui.page}>
          <div className={ui.cardFlush}>
            <div className={styles.cover}>
              {shown.coverImageUrl && <img src={shown.coverImageUrl} alt="" />}
              {editing && (
                <div className={styles.coverAction}>
                  <ImageUpload
                    label="Upload cover image"
                    className={`${ui.btnSecondary} ${ui.btnSm}`}
                    onUploaded={(url) => set('coverImageUrl', url)}
                    onError={(message) => notify(message, 'error')}
                  >
                    {({ uploading }) => <><Camera size={14} /> {uploading ? 'Uploading…' : 'Change cover'}</>}
                  </ImageUpload>
                </div>
              )}
            </div>
            <div className={styles.identity}>
              <div className={styles.logo}>
                {shown.logoUrl ? <img src={shown.logoUrl} alt={`${shown.companyName} logo`} /> : initials(shown.companyName || 'Co')}
              </div>
              <div className={styles.identityText}>
                <h2>
                  {shown.companyName || 'Your company'}
                  {verified && <BadgeCheck size={22} className={styles.verifiedIcon} aria-label="Verified company" />}
                </h2>
                <p>
                  {shown.industry && <span>{shown.industry}</span>}
                  {shown.companySize && <span><Users size={13} /> {shown.companySize} employees</span>}
                  {location && <span><MapPin size={13} /> {location}</span>}
                  {shown.website && <span><Globe size={13} /> {shown.website.replace(/^https?:\/\//, '')}</span>}
                </p>
              </div>
              <div className={ui.row}>
                {editing ? (
                  <ImageUpload
                    label="Upload logo"
                    className={`${ui.btnSecondary} ${ui.btnSm}`}
                    onUploaded={(url) => set('logoUrl', url)}
                    onError={(message) => notify(message, 'error')}
                  >
                    {({ uploading }) => <><Camera size={14} /> {uploading ? 'Uploading…' : 'Change logo'}</>}
                  </ImageUpload>
                ) : (
                  canEdit && (
                    <button type="button" className={ui.btnSecondary} onClick={() => setEditing(true)}>
                      <Pencil size={15} /> Edit Profile
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {editing ? (
            <div className={ui.card}>
              <h2 className={ui.sectionTitle}>Company details</h2>
              <div className={ui.formGrid}>
                <FormField label="Company name" required error={errors.companyName}>
                  <input className={ui.input} value={form.companyName} maxLength={150} onChange={(e) => set('companyName', e.target.value)} />
                </FormField>
                <FormField label="Tagline" hint="One line shown under your name.">
                  <input className={ui.input} value={form.tagline} maxLength={300} onChange={(e) => set('tagline', e.target.value)} />
                </FormField>
                <FormField label="Industry">
                  <select className={ui.select} value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </FormField>
                <FormField label="Company size">
                  <select className={ui.select} value={form.companySize} onChange={(e) => set('companySize', e.target.value)}>
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((item) => <option key={item} value={item}>{item} employees</option>)}
                  </select>
                </FormField>
                <FormField label="Website" error={errors.website}>
                  <input className={ui.input} type="url" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://www.example.com" />
                </FormField>
                <FormField label="Year founded" error={errors.foundedYear}>
                  <input className={ui.input} type="number" min={1800} max={new Date().getFullYear()} value={form.foundedYear} onChange={(e) => set('foundedYear', e.target.value)} />
                </FormField>
              </div>

              <h2 className={ui.sectionTitle} style={{ marginTop: 24 }}>Headquarters</h2>
              <div className={ui.formGrid3}>
                <FormField label="Country">
                  <input className={ui.input} list="employer-profile-countries" value={form.country} maxLength={100} onChange={(e) => set('country', e.target.value)} />
                </FormField>
                <FormField label="City">
                  <input className={ui.input} value={form.city} maxLength={100} onChange={(e) => set('city', e.target.value)} />
                </FormField>
                <FormField label="State / Province">
                  <input className={ui.input} value={form.stateProvince} maxLength={100} onChange={(e) => set('stateProvince', e.target.value)} />
                </FormField>
              </div>
              <datalist id="employer-profile-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>

              <h2 className={ui.sectionTitle} style={{ marginTop: 24 }}>About</h2>
              <FormField label="Company description" hint={`${form.about.length.toLocaleString()} / 5,000 characters`}>
                <textarea className={ui.textarea} rows={7} maxLength={5000} value={form.about} onChange={(e) => set('about', e.target.value)} />
              </FormField>

              <h2 className={ui.sectionTitle} style={{ marginTop: 24 }}>Social links</h2>
              <div className={ui.formGrid}>
                {SOCIAL_FIELDS.map(({ key, label }) => (
                  <FormField key={key} label={label} error={errors[`social.${key}`]}>
                    <input
                      className={ui.input}
                      type="url"
                      value={form.socialLinks[key]}
                      onChange={(e) => set('socialLinks', { ...form.socialLinks, [key]: e.target.value })}
                      placeholder="https://"
                    />
                  </FormField>
                ))}
              </div>

              {serverError && <p className={ui.noticeError} role="alert" style={{ marginTop: 16 }}>{serverError}</p>}

              <div className={ui.formActions}>
                {company?.companyName && (
                  <button
                    type="button"
                    className={ui.btnSecondary}
                    disabled={saving}
                    onClick={() => {
                      setForm(toForm(company, ''));
                      setErrors({});
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className={ui.btnPrimary} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          ) : (
            <div className={ui.split}>
              <div className={ui.card}>
                <h2 className={ui.sectionTitle}>About Us</h2>
                {company?.tagline && <p style={{ margin: '0 0 10px', fontWeight: 600 }}>{company.tagline}</p>}
                {company?.about ? (
                  <div className={ui.prose}>{company.about}</div>
                ) : (
                  <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>No description yet. Tell candidates what makes your company a great place to work.</p>
                )}
              </div>
              <div className={ui.card}>
                <ul className={styles.facts}>
                  <li><Users size={16} /> {company?.companySize ? `${company.companySize} employees` : 'Company size not set'}</li>
                  <li><MapPin size={16} /> {location || 'Location not set'}</li>
                  <li><Globe size={16} /> {company?.website ? <a href={company.website} target="_blank" rel="noopener noreferrer">{company.website.replace(/^https?:\/\//, '')}</a> : 'Website not set'}</li>
                  <li><Calendar size={16} /> {company?.foundedYear ? `Est. ${company.foundedYear}` : 'Founding year not set'}</li>
                  <li><Building2 size={16} /> {data?.openJobs ?? 0} open job{data?.openJobs === 1 ? '' : 's'}</li>
                  {SOCIAL_FIELDS.filter(({ key }) => company?.socialLinks[key]).map(({ key, label }) => (
                    <li key={key}><Link2 size={16} /> <a href={company?.socialLinks[key]} target="_blank" rel="noopener noreferrer">{label}</a></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </form>
      )}

      {tab === 'media' && (
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <div>
              <h2>Media gallery</h2>
              <p>Photos of your team, office and culture. Up to 30 images.</p>
            </div>
          </div>
          <div className={styles.gallery}>
            {(company?.media ?? []).map((item, index) => (
              <figure key={item.id} className={styles.galleryItem} style={{ margin: 0 }}>
                <img src={item.url} alt={item.caption || `Company photo ${index + 1}`} loading="lazy" />
                {canEdit ? (
                  <>
                    <input
                      defaultValue={item.caption}
                      maxLength={300}
                      placeholder="Add a caption"
                      aria-label={`Caption for photo ${index + 1}`}
                      onBlur={(e) => {
                        const caption = e.target.value.trim();
                        if (caption === item.caption) return;
                        const media = (company?.media ?? []).map((m) => (m.id === item.id ? { ...m, caption } : m));
                        void updateMedia(media, 'Caption saved.');
                      }}
                    />
                    <button
                      type="button"
                      className={ui.iconBtn}
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => void updateMedia((company?.media ?? []).filter((m) => m.id !== item.id), 'Photo removed.')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  item.caption && <figcaption style={{ padding: '8px 10px', fontSize: 12.5 }}>{item.caption}</figcaption>
                )}
              </figure>
            ))}
            {canEdit && (company?.media.length ?? 0) < 30 && (
              <ImageUpload
                label="Add photo to gallery"
                className={styles.uploadTile}
                onUploaded={(url) => void updateMedia([...(company?.media ?? []), { id: url, url, caption: '' }], 'Photo added.')}
                onError={(message) => notify(message, 'error')}
              >
                {({ uploading }) => <><ImagePlus size={24} /> {uploading ? 'Uploading…' : 'Add photo'}</>}
              </ImageUpload>
            )}
          </div>
          {!canEdit && !(company?.media.length) && <EmployerEmptyState title="No media yet" />}
        </div>
      )}

      {tab === 'team' && <TeamSummary />}

      {tab === 'verification' && (
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <div>
              <h2>Company verification</h2>
              <p>Verified companies show a badge on their profile and job listings.</p>
            </div>
            <Link to={`${EMPLOYER_BASE_PATH}/verification`} className={ui.btnPrimary}><ShieldCheck size={15} /> Open verification</Link>
          </div>
          <Badge
            tone={
              company?.verificationStatus === 'approved'
                ? 'success'
                : company?.verificationStatus === 'pending'
                  ? 'warning'
                  : company?.verificationStatus === 'rejected'
                    ? 'danger'
                    : 'neutral'
            }
          >
            {{ approved: 'Verified', pending: 'Under review', rejected: 'Not approved', not_submitted: 'Not submitted' }[company?.verificationStatus ?? 'not_submitted']}
          </Badge>
        </div>
      )}
    </div>
  );
}

function TeamSummary() {
  const { data, loading, error, refetch } = useEmployerTeam();
  if (loading && !data) return <div className={ui.card}><EmployerLoading rows={3} /></div>;
  if (error) return <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>;
  return (
    <div className={ui.card}>
      <div className={ui.cardHeader}>
        <div>
          <h2>Team</h2>
          <p>{(data?.members.filter((m) => m.status === 'active').length ?? 0) + 1} active member(s)</p>
        </div>
        <Link to={`${EMPLOYER_BASE_PATH}/team`} className={ui.btnSecondary}><Users size={15} /> Manage team</Link>
      </div>
      <ul className={ui.list}>
        <li><Avatar name="Owner" /> <span style={{ flex: 1, fontSize: 14 }}>Account owner{data?.owner.isYou ? ' (you)' : ''}</span> <Badge tone="violet">Owner</Badge></li>
        {data?.members.map((member) => (
          <li key={member.id}>
            <Avatar name={member.name || member.email} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
              {member.name || member.email}
              <span className={ui.cellSub}>{member.email}</span>
            </span>
            <Badge tone={member.status === 'active' ? 'success' : 'warning'}>{member.status === 'active' ? ROLE_LABELS[member.role] : 'Invited'}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EmployerProfilePage;
