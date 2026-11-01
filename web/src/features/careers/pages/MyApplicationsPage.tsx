import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BriefcaseBusiness, ExternalLink } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { EmployerModal } from '../../employer/components/shared/EmployerModal';
import { SearchInput } from '../../employer/components/shared/SearchInput';
import { useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { ApplicationStageBadge } from '../components/ApplicationStageBadge';
import { CareersError, SignedIn } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { applicationsApi } from '../services/applicationsApi';
import { STAGE_LABELS, STAGE_OF, STAGE_ORDER, type SeekerStage } from '../utils/applicationStatus';
import { formatDate, placeLabel, typeLabel } from '../utils/jobFormat';
import type { MyApplication } from '../types';

const TABS: { id: 'all' | SeekerStage; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'review', label: 'Under Review' },
  { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Not selected' },
];

export function MyApplicationsPage() {
  return <SignedIn>{() => <Applications />}</SignedIn>;
}

function Applications() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('status'))?.id ?? 'all') as 'all' | SeekerStage;
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MyApplication | null>(null);
  const { data, loading, error, refetch } = useEmployerQuery(() => applicationsApi.getMyApplications(), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length ?? 0 };
    (data ?? []).forEach((a) => {
      const s = STAGE_OF[a.status];
      c[s] = (c[s] ?? 0) + 1;
    });
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      if (tab !== 'all' && STAGE_OF[a.status] !== tab) return false;
      if (!term) return true;
      return `${a.job?.title ?? ''} ${a.job?.company.name ?? ''}`.toLowerCase().includes(term);
    });
  }, [data, tab, search]);

  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === 'all') next.delete('status');
    else next.set('status', id);
    setParams(next, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>My Applications</h1>
          <p>Track every job you've applied to on Fockis.</p>
        </div>
        <Link to="/careers/jobs" className={ui.btnPrimary}>Find more jobs</Link>
      </div>

      <div className={ui.card}>
        <div className={ui.toolbar} style={{ marginBottom: 14 }}>
          <div className={ui.tabs} role="tablist" aria-label="Filter by status">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={ui.tab} onClick={() => setTab(t.id)}>
                {t.label} <span className={ui.muted}>({counts[t.id] ?? 0})</span>
              </button>
            ))}
          </div>
          <span className={ui.spacer} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search job or company" />
        </div>

        {loading ? (
          <EmployerLoading label="Loading applications…" />
        ) : error ? (
          <CareersError message={error} onRetry={refetch} />
        ) : rows.length === 0 ? (
          <EmployerEmptyState
            icon={<BriefcaseBusiness size={22} />}
            title={data?.length ? 'No applications match' : 'No applications yet'}
            description={data?.length ? 'Try another status or search term.' : 'Applications you submit on Fockis appear here.'}
            action={!data?.length ? <Link to="/careers/jobs" className={ui.btnPrimary}>Browse jobs</Link> : undefined}
          />
        ) : (
          <ul className={styles.rows}>
            {rows.map((app) => (
              <li key={app.id} className={styles.rowItem}>
                <CompanyLogo name={app.job?.company.name ?? 'Job'} src={app.job?.company.logoUrl} />
                <div className={styles.rowMain}>
                  {app.job ? <Link to={`/careers/jobs/${app.job.id}`} className={styles.rowTitle}>{app.job.title}</Link> : <strong>Job no longer available</strong>}
                  <span>
                    {app.job ? `${app.job.company.name} · ${placeLabel(app.job)}` : '—'} · Applied {formatDate(app.appliedAt)}
                  </span>
                </div>
                <div className={styles.rowEnd}>
                  <ApplicationStageBadge status={app.status} />
                  <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={() => setSelected(app)}>View details</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EmployerModal
        open={Boolean(selected)}
        title={selected?.job?.title ?? 'Application'}
        description={selected?.job ? `${selected.job.company.name} · ${typeLabel(selected.job)}` : undefined}
        onClose={() => setSelected(null)}
        footer={
          <>
            <button type="button" className={ui.btnSecondary} onClick={() => setSelected(null)}>Close</button>
            {selected?.job && <Link to={`/careers/jobs/${selected.job.id}`} className={ui.btnPrimary}>View job <ExternalLink size={14} /></Link>}
          </>
        }
      >
        {selected && <ApplicationDetails app={selected} />}
      </EmployerModal>
    </div>
  );
}

function ApplicationDetails({ app }: { app: MyApplication }) {
  const stage = STAGE_OF[app.status];
  const reached = stage === 'rejected' ? -1 : STAGE_ORDER.indexOf(stage);
  const history = [...app.statusHistory].sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <div className={ui.row} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <span className={ui.label}>Status</span>
          <ApplicationStageBadge status={app.status} />
        </div>
        <div className={styles.timeline} aria-hidden>
          {STAGE_ORDER.map((s, i) => (
            <span key={s} className={`${styles.timelineStep} ${stage === 'rejected' ? styles.timelineRejected : i <= reached ? styles.timelineReached : ''}`}>
              {STAGE_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      <dl className={ui.dl}>
        <dt>Applied</dt>
        <dd>{formatDate(app.appliedAt)}</dd>
        <dt>Last update</dt>
        <dd>{formatDate(app.updatedAt)}</dd>
        <dt>Resume</dt>
        <dd>{app.resumeFileName ?? 'None attached'}</dd>
        {app.job && (
          <>
            <dt>Location</dt>
            <dd>{placeLabel(app.job)}</dd>
          </>
        )}
      </dl>

      {history.length > 0 && (
        <div>
          <h3 className={ui.sectionTitle}>History</h3>
          <ul className={styles.history}>
            {history.map((h, i) => (
              <li key={`${h.status}-${i}`}>
                <span>{STAGE_LABELS[STAGE_OF[h.status]] ?? h.status}</span>
                <span className={ui.muted}>{formatDate(h.changedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {app.coverLetter && (
        <div>
          <h3 className={ui.sectionTitle}>Your cover letter</h3>
          <p className={ui.prose} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{app.coverLetter}</p>
        </div>
      )}
    </div>
  );
}

export default MyApplicationsPage;
