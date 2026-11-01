import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download, Eye, FileText, Globe, Info, Percent, Sparkles, UserCheck } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerOverview.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { StatCard } from '../components/shared/StatCard';
import { JobStatusBadge } from '../components/shared/EmployerStatusBadge';
import { AreaTrendChart } from '../components/charts/AreaTrendChart';
import { BarList } from '../components/charts/BarList';
import { FunnelChart } from '../components/charts/FunnelChart';
import { useEmployerAnalytics } from '../hooks/useEmployerAnalytics';
import { useNotify } from '../store/employerNotificationStore';
import type { EmployerAnalytics } from '../types';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';
import { formatEmployerDate, formatEmployerNumber, toDateInput } from '../utils/employerFormatters';

const PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

function rangeFor(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  return { from: toDateInput(from), to: toDateInput(to) };
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv(data: EmployerAnalytics, from: string, to: string) {
  const rows: unknown[][] = [
    ['Fockis Employer Center — Hiring report'],
    ['Range', from, to],
    [],
    ['Summary'],
    ['Job views (lifetime)', data.totals.jobViews],
    ['Applications', data.totals.applications],
    ['Qualified', data.totals.qualified],
    ['Conversion rate % (lifetime)', data.totals.conversionRate ?? ''],
    [],
    ['Hiring funnel', 'Count'],
    ...data.funnel.map((stage) => [stage.label, stage.count]),
    [],
    ['Job', 'Status', 'Apply method', 'Views (lifetime)', 'Applications', 'Qualified', 'Conversion %'],
    ...data.jobPerformance.map((job) => [job.title, job.status, job.applicationMethod, job.views, job.applications, job.qualified, job.conversionRate ?? '']),
    [],
    ['Date', 'Applications'],
    ...data.applicationsOverTime.map((day) => [day.date, day.count]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fockis-hiring-report-${from}-to-${to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function EmployerAnalyticsPage() {
  const notify = useNotify();
  const [preset, setPreset] = useState('30');
  const [custom, setCustom] = useState(() => rangeFor(30));
  const [rangeError, setRangeError] = useState<string | null>(null);

  const range = useMemo(() => (preset === 'custom' ? custom : rangeFor(Number(preset))), [preset, custom]);
  const { data, loading, error, refetch } = useEmployerAnalytics(range.from, range.to);

  const updateCustom = (key: 'from' | 'to', value: string) => {
    const next = { ...custom, [key]: value };
    if (!next.from || !next.to || next.from > next.to) {
      setRangeError('Start date must be before end date.');
      return;
    }
    setRangeError(null);
    setCustom(next);
  };

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Hiring Analytics"
        description="Track your hiring performance and job reach."
        action={
          <>
            <label>
              <span className={ui.srOnly}>Date range</span>
              <select className={ui.select} value={preset} onChange={(e) => setPreset(e.target.value)} style={{ width: 'auto' }}>
                {PRESETS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              className={ui.btnSecondary}
              disabled={!data}
              onClick={() => {
                if (!data) return;
                exportCsv(data, range.from, range.to);
                notify('Report exported as CSV.');
              }}
            >
              <Download size={15} /> Export report
            </button>
          </>
        }
      />

      {preset === 'custom' && (
        <div className={ui.card} style={{ padding: 14 }}>
          <div className={ui.row}>
            <label className={ui.field}>
              <span className={ui.hint}>From</span>
              <input className={ui.input} type="date" max={custom.to} defaultValue={custom.from} onChange={(e) => updateCustom('from', e.target.value)} />
            </label>
            <label className={ui.field}>
              <span className={ui.hint}>To</span>
              <input className={ui.input} type="date" min={custom.from} max={toDateInput(new Date())} defaultValue={custom.to} onChange={(e) => updateCustom('to', e.target.value)} />
            </label>
            {rangeError && <span className={ui.fieldError}>{rangeError}</span>}
          </div>
        </div>
      )}

      {loading && !data && <div className={ui.card}><EmployerLoading label="Loading analytics…" /></div>}
      {error && <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>}

      {data && !error && (
        <>
          <div className={ui.statGrid} aria-busy={loading}>
            <StatCard icon={<Eye size={19} />} label="Job Views" value={data.totals.jobViews} hint="All-time total" />
            <StatCard icon={<FileText size={19} />} label="Applications" value={data.totals.applications} hint={`${formatEmployerDate(data.range.from)} – ${formatEmployerDate(data.range.to)}`} />
            <StatCard icon={<UserCheck size={19} />} label="Qualified" value={data.totals.qualified} hint="Shortlisted, interview or hired" />
            <StatCard
              icon={<Percent size={19} />}
              label="Conversion Rate"
              value={data.totals.conversionRate === null ? '—' : `${data.totals.conversionRate}%`}
              hint="All-time applications ÷ views"
            />
          </div>

          <p className={ui.notice} style={{ margin: 0 }}>
            <Info size={16} />
            Job views are counted from when view tracking was enabled and are stored as lifetime totals, so views and
            conversion rate don't change with the date range.
          </p>

          <div className={styles.chartRow}>
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Applications Over Time</h2>
                  <p>{formatEmployerNumber(data.totals.applications)} in this range</p>
                </div>
              </div>
              <AreaTrendChart data={data.applicationsOverTime} />
            </div>

            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Top Job Performance</h2>
                  <p>Applications in this range</p>
                </div>
              </div>
              {data.topJobs.length ? (
                <BarList
                  valueLabel="applications"
                  items={data.topJobs.map((job) => ({
                    id: job.jobId,
                    label: job.title,
                    value: job.applications,
                    href: `${EMPLOYER_BASE_PATH}/jobs/${job.jobId}`,
                    detail: `${job.views} views`,
                  }))}
                />
              ) : (
                <EmployerEmptyState icon={<BarChart3 size={22} />} title="No applications in this range" />
              )}
            </div>
          </div>

          <div className={ui.grid2}>
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Hiring Funnel</h2>
                  <p>Furthest stage reached by applications in this range</p>
                </div>
              </div>
              {data.totals.applications ? <FunnelChart stages={data.funnel} /> : <p className={ui.muted} style={{ fontSize: 13.5 }}>No applications in this range.</p>}
            </div>

            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Application Sources</h2>
                  <p>Where candidates apply</p>
                </div>
              </div>
              <ul className={ui.list}>
                <li>
                  <span className={ui.statIcon} style={{ margin: 0 }}><Sparkles size={17} /></span>
                  <span style={{ flex: 1, fontSize: 14 }}>
                    Fockis applications
                    <span className={ui.cellSub}>Submitted through the Fockis form in this range</span>
                  </span>
                  <strong>{formatEmployerNumber(data.sources.fockisApplications)}</strong>
                </li>
                <li>
                  <span className={ui.statIcon} style={{ margin: 0 }}><Globe size={17} /></span>
                  <span style={{ flex: 1, fontSize: 14 }}>
                    Company website listings
                    <span className={ui.cellSub}>
                      {data.sources.externalListings} listing{data.sources.externalListings === 1 ? '' : 's'} · {formatEmployerNumber(data.sources.externalViews)} views.
                      Applications made on your website aren't visible to Fockis.
                    </span>
                  </span>
                  <strong>—</strong>
                </li>
              </ul>
            </div>
          </div>

          <div className={ui.cardFlush}>
            <div className={ui.cardHeaderPadded}>
              <div>
                <h2>Job Performance</h2>
                <p>Every listing, sorted by applications</p>
              </div>
            </div>
            {data.jobPerformance.length ? (
              <div className={ui.tableWrap}>
                <table className={`${ui.table} ${ui.responsiveTable}`}>
                  <thead>
                    <tr>
                      <th>Job</th><th>Status</th><th className={ui.num}>Views</th><th className={ui.num}>Applications</th><th className={ui.num}>Qualified</th><th className={ui.num}>Conversion (all-time)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobPerformance.map((job) => (
                      <tr key={job.jobId}>
                        <td data-label="Job">
                          <Link to={`${EMPLOYER_BASE_PATH}/jobs/${job.jobId}`} className={ui.cellTitle}>{job.title}</Link>
                          {job.applicationMethod === 'external' && <span className={ui.cellSub}>Applies on company website</span>}
                        </td>
                        <td data-label="Status"><JobStatusBadge status={job.status} /></td>
                        <td data-label="Views" className={ui.num}>{formatEmployerNumber(job.views)}</td>
                        <td data-label="Applications" className={ui.num}>{formatEmployerNumber(job.applications)}</td>
                        <td data-label="Qualified" className={ui.num}>{formatEmployerNumber(job.qualified)}</td>
                        <td data-label="Conversion" className={ui.num}>{job.conversionRate === null ? '—' : `${job.conversionRate}%`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmployerEmptyState title="No jobs yet" description="Analytics appear once you publish a job." />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EmployerAnalyticsPage;
