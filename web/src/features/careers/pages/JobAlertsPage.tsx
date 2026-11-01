import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, Search, Trash2 } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { ConfirmActionModal } from '../../employer/components/shared/ConfirmActionModal';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { FormField } from '../../employer/components/shared/FormField';
import { Badge } from '../../employer/components/shared/EmployerStatusBadge';
import { getErrorMessage, useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { useNotify } from '../../employer/store/employerNotificationStore';
import { CareersError, SignedIn } from '../components/CareersState';
import { useCareerUser } from '../hooks/useCareerUser';
import { profileApi } from '../services/profileApi';
import { EMPLOYMENT_LABELS, KIND_LABELS, formatDate } from '../utils/jobFormat';
import type { JobAlert } from '../types';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any type' },
  ...Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => ({ value, label })),
  { value: 'internship', label: KIND_LABELS.internship },
  { value: 'coop', label: KIND_LABELS.coop },
];
const typeName = (value: string) => TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
const KINDS = new Set(['job', 'internship', 'coop']);

/** Search URL for an alert, using the same params as /careers/jobs. */
export function alertSearchUrl(alert: Pick<JobAlert, 'keywords' | 'location' | 'type' | 'remoteOnly'>, sinceViewed?: boolean) {
  const p = new URLSearchParams();
  if (alert.keywords) p.set('q', alert.keywords);
  if (alert.location) p.set('loc', alert.location);
  if (alert.type) p.set(KINDS.has(alert.type) ? 'type' : 'employment', alert.type);
  if (alert.remoteOnly) p.set('remote', '1');
  if (sinceViewed) p.set('sort', 'recent');
  return `/careers/jobs?${p.toString()}`;
}

export function JobAlertsPage() {
  return <SignedIn>{() => <Alerts />}</SignedIn>;
}

function Alerts() {
  const navigate = useNavigate();
  const notify = useNotify();
  const refreshAlerts = useCareerUser((s) => s.refreshAlerts);
  const { data, setData, loading, error, refetch } = useEmployerQuery(() => profileApi.alerts(), []);
  const [form, setForm] = useState({ keywords: '', location: '', type: '', remoteOnly: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<JobAlert | null>(null);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.keywords.trim() && !form.location.trim() && !form.type && !form.remoteOnly) {
      setFormError('Add at least one: keywords, location, job type or remote only.');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      const alerts = await profileApi.createAlert({ ...form, keywords: form.keywords.trim(), location: form.location.trim() });
      setData(alerts);
      setForm({ keywords: '', location: '', type: '', remoteOnly: false });
      notify('Job alert created.');
      void refreshAlerts();
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create the alert.'));
    } finally {
      setCreating(false);
    }
  };

  const view = async (alert: JobAlert) => {
    navigate(alertSearchUrl(alert, alert.newMatches > 0));
    try {
      await profileApi.markAlertViewed(alert.id);
      void refreshAlerts();
    } catch {
      /* viewing still works if this fails */
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      setData(await profileApi.deleteAlert(toDelete.id));
      notify('Job alert deleted.');
      void refreshAlerts();
    } catch (err) {
      notify(getErrorMessage(err, 'Could not delete the alert.'), 'error');
    } finally {
      setToDelete(null);
    }
  };

  const alerts = data ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Job Alerts</h1>
          <p>Save searches and see new matching jobs here. Up to 10 alerts.</p>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={ui.card}>
          <div className={styles.cardHead}><h2>Your alerts</h2></div>
          {loading ? (
            <EmployerLoading label="Loading alerts…" />
          ) : error ? (
            <CareersError message={error} onRetry={refetch} />
          ) : alerts.length === 0 ? (
            <EmployerEmptyState icon={<Bell size={22} />} title="No job alerts yet" description="Create an alert, or use “Create alert” on any job search." />
          ) : (
            <ul className={styles.rows}>
              {alerts.map((alert) => {
                const summary = [alert.keywords && `“${alert.keywords}”`, alert.location, alert.type && typeName(alert.type), alert.remoteOnly && 'Remote only']
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <li key={alert.id} className={styles.rowItem}>
                    <span className={ui.statIcon}><Bell size={16} /></span>
                    <div className={styles.rowMain}>
                      <strong>{summary}</strong>
                      <span>{alert.totalMatches} open job{alert.totalMatches === 1 ? '' : 's'} · Created {formatDate(alert.createdAt)}</span>
                    </div>
                    <div className={styles.rowEnd}>
                      {alert.newMatches > 0 && <Badge tone="info">{alert.newMatches} new</Badge>}
                      <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => void view(alert)}>
                        <Search size={14} /> View jobs
                      </button>
                      <button type="button" className={ui.iconBtn} onClick={() => setToDelete(alert)} aria-label={`Delete alert ${summary}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form className={ui.card} onSubmit={create} noValidate>
          <div className={styles.cardHead}><h2>New alert</h2></div>
          <div style={{ display: 'grid', gap: 14 }}>
            <FormField label="Keywords">
              <input className={ui.input} value={form.keywords} maxLength={120} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="e.g. Customer success" />
            </FormField>
            <FormField label="Location">
              <input className={ui.input} value={form.location} maxLength={120} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City or state" />
            </FormField>
            <FormField label="Job type">
              <select className={ui.select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormField>
            <label className={ui.checkboxRow}>
              <input type="checkbox" checked={form.remoteOnly} onChange={(e) => setForm({ ...form, remoteOnly: e.target.checked })} /> Remote only
            </label>
            {formError && <p className={ui.noticeError} role="alert" style={{ margin: 0 }}>{formError}</p>}
            <button type="submit" className={ui.btnPrimary} disabled={creating || alerts.length >= 10}>
              <Plus size={16} /> {creating ? 'Creating…' : 'Create alert'}
            </button>
            {alerts.length >= 10 && <span className={ui.hint}>You've reached 10 alerts. Delete one to add another.</span>}
            <span className={ui.hint}>Matches show in Fockis (bell icon). <Link to="/careers/jobs" className={ui.linkBtn}>Search jobs</Link></span>
          </div>
        </form>
      </div>

      <ConfirmActionModal
        open={Boolean(toDelete)}
        title="Delete job alert?"
        description="You'll stop seeing new matches for this search."
        confirmLabel="Delete alert"
        variant="danger"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default JobAlertsPage;
