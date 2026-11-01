import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, CreditCard, Info, KeyRound, Lock, Plug, Settings, UsersRound } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerSettings.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { FormField } from '../components/shared/FormField';
import { Badge } from '../components/shared/EmployerStatusBadge';
import { useEmployerQuery, getErrorMessage } from '../hooks/useEmployerQuery';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerSettings } from '../types';
import { EMPLOYER_BASE_PATH, timezoneOptions } from '../utils/employerConstants';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../utils/employerPermissions';
import { isValidEmail, isValidHttpUrl, type FieldErrors } from '../utils/employerValidators';

type Section = 'general' | 'team' | 'notifications' | 'billing' | 'integrations' | 'security';

const SECTIONS: { id: Section; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'team', label: 'Team & Access', icon: UsersRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'security', label: 'Security', icon: Lock },
];

const NOTIFICATION_OPTIONS: { key: keyof EmployerSettings['notifications']; label: string; description: string }[] = [
  { key: 'newApplications', label: 'New applications', description: 'When a candidate applies to one of your jobs.' },
  { key: 'applicationStatusChanges', label: 'Status changes', description: 'When a teammate moves an applicant to a new stage.' },
  { key: 'interviewReminders', label: 'Interview reminders', description: 'Before scheduled interviews.' },
  { key: 'weeklySummary', label: 'Weekly summary', description: 'A weekly digest of hiring activity.' },
  { key: 'productUpdates', label: 'Product updates', description: 'New Employer Center features and tips.' },
];

const INTEGRATIONS = [
  { name: 'Google Calendar', description: 'Sync scheduled interviews to your calendar.' },
  { name: 'Slack', description: 'Get notified about new applicants in a channel.' },
  { name: 'Applicant tracking systems', description: 'Sync jobs and applicants with your ATS.' },
];

export function EmployerSettingsPage() {
  const notify = useNotify();
  const me = useEmployerStore((state) => state.me);
  const reloadMe = useEmployerStore((state) => state.load);
  const [params, setParams] = useSearchParams();
  const section = (params.get('section') as Section) || 'general';

  const { data, setData, loading, error, refetch } = useEmployerQuery(() => employerApi.getSettings(), []);
  const [form, setForm] = useState<Omit<EmployerSettings, 'canManage'> | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const select = (id: Section) => {
    const next = new URLSearchParams(params);
    if (id === 'general') next.delete('section');
    else next.set('section', id);
    setParams(next, { replace: true });
    setServerError(null);
  };

  const dirty = Boolean(data && form && JSON.stringify({ ...data, canManage: undefined }) !== JSON.stringify({ ...form, canManage: undefined }));

  const save = async (event: FormEvent, scope: 'general' | 'notifications') => {
    event.preventDefault();
    if (!form) return;
    const found: FieldErrors = {};
    if (scope === 'general') {
      const name = form.companyName.trim();
      if (name.length < 2) found.companyName = 'Company name is required.';
      else if (name.length > 150) found.companyName = 'Company name must be 150 characters or fewer.';
      if (form.contactEmail.trim() && !isValidEmail(form.contactEmail)) found.contactEmail = 'Enter a valid email address.';
      if (form.website.trim() && !isValidHttpUrl(form.website)) found.website = 'Enter a full URL starting with https://';
      if (!form.timezone) found.timezone = 'Choose a time zone.';
    }
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setSaving(true);
    setServerError(null);
    try {
      const updated = await employerApi.updateSettings(
        scope === 'general'
          ? { companyName: form.companyName.trim(), contactEmail: form.contactEmail.trim(), website: form.website.trim(), timezone: form.timezone }
          : { notifications: form.notifications },
      );
      setData(updated);
      notify('Settings saved.');
      if (scope === 'general') void reloadMe();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const canManage = data?.canManage ?? false;

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Employer Settings" description="Manage your account, team, and hiring preferences." />

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Settings sections">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={styles.navItem} aria-current={section === id ? 'page' : undefined} onClick={() => select(id)}>
              <Icon size={17} /> {label}
            </button>
          ))}
        </nav>

        <div className={ui.card}>
          {loading && !data && <EmployerLoading label="Loading settings…" />}
          {error && !data && <EmployerError message={error} onRetry={refetch} />}

          {form && section === 'general' && (
            <form onSubmit={(e) => save(e, 'general')} noValidate>
              <h2 className={ui.sectionTitle}>General Settings</h2>
              {!canManage && <p className={ui.notice} style={{ marginTop: 0 }}><Info size={16} /> Only the owner or an administrator can change these settings.</p>}
              <fieldset disabled={!canManage || saving} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}>
                <FormField label="Company name" required error={errors.companyName}>
                  <input className={ui.input} value={form.companyName} maxLength={150} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                </FormField>
                <FormField label="Primary contact email" error={errors.contactEmail} hint="Where Fockis contacts you about your Employer Center.">
                  <input className={ui.input} type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                </FormField>
                <FormField label="Company website" error={errors.website}>
                  <input className={ui.input} type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://www.example.com" />
                </FormField>
                <FormField label="Time zone" required error={errors.timezone} hint="Default time zone for interviews.">
                  <select className={ui.select} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                    {!timezoneOptions().includes(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
                    {timezoneOptions().map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                  </select>
                </FormField>
              </fieldset>
              {serverError && <p className={ui.noticeError} role="alert" style={{ marginTop: 14 }}>{serverError}</p>}
              {canManage && (
                <div className={ui.formActions}>
                  <button type="button" className={ui.btnSecondary} disabled={!dirty || saving} onClick={() => data && setForm({ ...data })}>Discard</button>
                  <button type="submit" className={ui.btnPrimary} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              )}
            </form>
          )}

          {form && section === 'notifications' && (
            <form onSubmit={(e) => save(e, 'notifications')} noValidate>
              <h2 className={ui.sectionTitle}>Notifications</h2>
              <p className={ui.notice} style={{ marginTop: 0 }}>
                <Info size={16} /> Your preferences are saved now. Sending employer emails and alerts for these events is not connected yet, so you will not receive them until it is.
              </p>
              <ul className={ui.list}>
                {NOTIFICATION_OPTIONS.map((option) => (
                  <li key={option.key}>
                    <span style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{option.label}</strong>
                      <span className={ui.cellSub}>{option.description}</span>
                    </span>
                    <label className={ui.switch}>
                      <input
                        type="checkbox"
                        checked={form.notifications[option.key]}
                        disabled={!canManage || saving}
                        onChange={(e) => setForm({ ...form, notifications: { ...form.notifications, [option.key]: e.target.checked } })}
                        aria-label={option.label}
                      />
                      <span />
                    </label>
                  </li>
                ))}
              </ul>
              {serverError && <p className={ui.noticeError} role="alert">{serverError}</p>}
              {canManage && (
                <div className={ui.formActions}>
                  <button type="submit" className={ui.btnPrimary} disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
              )}
            </form>
          )}

          {section === 'team' && me && (
            <div>
              <h2 className={ui.sectionTitle}>Team & Access</h2>
              <dl className={ui.dl}>
                <div><dt>Your role</dt><dd>{ROLE_LABELS[me.role]} — {ROLE_DESCRIPTIONS[me.role]}</dd></div>
                <div><dt>Active team members</dt><dd>{me.company?.teamSize ?? 1}</dd></div>
              </dl>
              <div className={ui.formActions} style={{ justifyContent: 'flex-start' }}>
                <Link to={`${EMPLOYER_BASE_PATH}/team`} className={ui.btnPrimary}><UsersRound size={15} /> Manage team</Link>
              </div>
            </div>
          )}

          {section === 'billing' && me && (
            <div>
              <h2 className={ui.sectionTitle}>Billing & Plans</h2>
              <dl className={ui.dl}>
                <div><dt>Current plan</dt><dd style={{ textTransform: 'capitalize' }}>{me.company?.plan ?? 'free'}</dd></div>
              </dl>
              <div className={ui.formActions} style={{ justifyContent: 'flex-start' }}>
                <Link to={`${EMPLOYER_BASE_PATH}/billing`} className={ui.btnPrimary}><CreditCard size={15} /> Open billing</Link>
              </div>
            </div>
          )}

          {section === 'integrations' && (
            <div>
              <h2 className={ui.sectionTitle}>Integrations</h2>
              <p className={ui.muted} style={{ marginTop: 0, fontSize: 13.5 }}>No third-party integrations are connected to the Employer Center yet.</p>
              <ul className={ui.list}>
                {INTEGRATIONS.map((item) => (
                  <li key={item.name}>
                    <span className={ui.statIcon} style={{ margin: 0 }}><Plug size={16} /></span>
                    <span style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{item.name}</strong>
                      <span className={ui.cellSub}>{item.description}</span>
                    </span>
                    <Badge tone="neutral">Not available yet</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === 'security' && me && (
            <div>
              <h2 className={ui.sectionTitle}>Security</h2>
              <dl className={ui.dl}>
                <div><dt>Signed in as</dt><dd>{me.user.email ?? me.user.username ?? '—'}</dd></div>
                <div><dt>Employer access</dt><dd>{ROLE_LABELS[me.role]}</dd></div>
              </dl>
              <p className={ui.notice}>
                <KeyRound size={16} /> The Employer Center uses your Fockis account sign-in. Change your password, enable two-step verification and review sessions in your account settings.
              </p>
              <div className={ui.formActions} style={{ justifyContent: 'flex-start' }}>
                <Link to="/settings" className={ui.btnPrimary}><Lock size={15} /> Open account security</Link>
                <Link to={`${EMPLOYER_BASE_PATH}/team`} className={ui.btnSecondary}>Review team access</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployerSettingsPage;
