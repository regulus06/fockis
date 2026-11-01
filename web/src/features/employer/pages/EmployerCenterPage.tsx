import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Eye,
  FileText,
  Plus,
  UserCheck,
  UserSearch,
} from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerOverview.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { StatCard } from '../components/shared/StatCard';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { JobStatusBadge, JobTypeBadge } from '../components/shared/EmployerStatusBadge';
import { AreaTrendChart } from '../components/charts/AreaTrendChart';
import { DonutChart } from '../components/charts/DonutChart';
import { useEmployerDashboard } from '../hooks/useEmployerDashboard';
import { useEmployerStore } from '../store/employerStore';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';
import { formatEmployerDate, formatRelative } from '../utils/employerFormatters';

const RANGES = [7, 30, 90];

export function EmployerCenterPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refetch } = useEmployerDashboard(days);
  const company = useEmployerStore((state) => state.me?.company);
  const { isOwner } = useEmployerPermissions();

  const companyName = company?.companyName;

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Employer Center"
        description={
          companyName
            ? `Welcome back. Manage ${companyName}'s hiring, applications and company presence on Fockis.`
            : 'Manage your hiring, applications, and company presence on Fockis.'
        }
        action={
          isOwner && (
            <Link to={`${EMPLOYER_BASE_PATH}/jobs/new`} className={ui.btnPrimary}>
              <Plus size={16} /> Create Job Listing
            </Link>
          )
        }
      />

      {!companyName && (
        <div className={styles.welcome}>
          <p>
            <strong>Set up your company profile.</strong> Candidates trust employers with a complete profile — add your
            logo, description and location.
          </p>
          <Link to={`${EMPLOYER_BASE_PATH}/profile`} className={`${ui.btnSecondary} ${ui.btnSm}`}>
            Complete profile
          </Link>
        </div>
      )}

      {loading && !data && <div className={ui.card}><EmployerLoading label="Loading dashboard…" /></div>}
      {error && !data && <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>}

      {data && (
        <>
          <div role="region" className={ui.statGrid} aria-label="Hiring summary">
            <StatCard
              icon={<Briefcase size={19} />}
              label="Active Jobs"
              value={data.stats.activeJobs}
              delta={data.stats.newJobsThisWeek}
              hint={data.stats.pendingApprovalJobs ? `${data.stats.pendingApprovalJobs} pending approval` : undefined}
            />
            <StatCard icon={<FileText size={19} />} label="Applications" value={data.stats.applications} delta={data.stats.newApplicationsThisWeek} />
            <StatCard
              icon={<UserCheck size={19} />}
              label="Qualified"
              value={data.stats.qualified}
              delta={data.stats.newQualifiedThisWeek}
              hint={!data.stats.newQualifiedThisWeek ? 'Shortlisted, interview or hired' : undefined}
            />
            <StatCard icon={<Eye size={19} />} label="Job Views" value={data.stats.jobViews} hint="Public job page views" />
          </div>

          <div className={styles.chartRow}>
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Application Trends</h2>
                  <p>{data.applicationTrend.reduce((s, d) => s + d.count, 0)} applications in the last {days} days</p>
                </div>
                <label>
                  <span className={ui.srOnly}>Date range</span>
                  <select className={ui.select} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 'auto', minHeight: 34 }}>
                    {RANGES.map((r) => <option key={r} value={r}>Last {r} days</option>)}
                  </select>
                </label>
              </div>
              <AreaTrendChart data={data.applicationTrend} />
            </div>

            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Applications by Type</h2>
                  <p>All-time, by job type</p>
                </div>
              </div>
              {data.stats.applications ? (
                <DonutChart
                  centerLabel="Applications"
                  slices={data.applicationsByType.map((item) => ({ label: item.label, value: item.count }))}
                />
              ) : (
                <EmployerEmptyState title="No applications yet" description="Applications will appear here once candidates apply." />
              )}
            </div>
          </div>

          <div className={ui.split}>
            <div className={ui.cardFlush}>
              <div className={ui.cardHeaderPadded}>
                <div>
                  <h2>Recent Job Listings</h2>
                  <p>{data.stats.totalJobs} total</p>
                </div>
                <Link to={`${EMPLOYER_BASE_PATH}/jobs`} className={ui.linkBtn}>View all</Link>
              </div>
              {data.recentJobs.length ? (
                <div className={ui.tableWrap}>
                  <table className={`${ui.table} ${ui.responsiveTable}`}>
                    <thead>
                      <tr><th>Job Title</th><th>Type</th><th className={ui.num}>Applications</th><th>Status</th><th>Posted</th></tr>
                    </thead>
                    <tbody>
                      {data.recentJobs.map((job) => (
                        <tr key={job.id}>
                          <td data-label="Job"><Link to={`${EMPLOYER_BASE_PATH}/jobs/${job.id}`} className={ui.cellTitle}>{job.title}</Link><span className={ui.cellSub}>{job.location}</span></td>
                          <td data-label="Type"><JobTypeBadge type={job.type} /></td>
                          <td data-label="Applications" className={ui.num}>{job.applicationsCount}</td>
                          <td data-label="Status"><JobStatusBadge status={job.status} /></td>
                          <td data-label="Posted">{formatEmployerDate(job.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmployerEmptyState
                  icon={<Briefcase size={24} />}
                  title="No job listings yet"
                  description="Publish your first job to start receiving applications."
                  action={isOwner && <Link to={`${EMPLOYER_BASE_PATH}/jobs/new`} className={ui.btnPrimary}><Plus size={16} /> Create Job Listing</Link>}
                />
              )}
            </div>

            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <div>
                  <h2>Recent Activity</h2>
                  <p>{data.stats.upcomingInterviews} upcoming interview{data.stats.upcomingInterviews === 1 ? '' : 's'}</p>
                </div>
              </div>
              {data.recentActivity.length ? (
                <ul className={styles.activity}>
                  {data.recentActivity.map((item) => (
                    <li key={item.id}>
                      <span className={styles.activityIcon} aria-hidden="true">
                        {item.type === 'interview' ? <CalendarDays size={14} /> : item.type === 'status' ? <UserCheck size={14} /> : <FileText size={14} />}
                      </span>
                      <div>
                        <Link to={item.link}>{item.message}</Link>
                        <time dateTime={item.at}>{formatRelative(item.at)}</time>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={ui.muted} style={{ fontSize: 13.5 }}>No activity yet. New applications and status changes show up here.</p>
              )}
            </div>
          </div>

          <div role="region" className={ui.card} aria-labelledby="quick-actions">
            <h2 id="quick-actions" className={ui.sectionTitle}>Quick Actions</h2>
            <div className={styles.quickActions}>
              {isOwner && (
                <Link to={`${EMPLOYER_BASE_PATH}/jobs/new`} className={styles.quickAction}>
                  <span className={styles.quickIcon}><Plus size={18} /></span>
                  <span><strong>Create Job Listing</strong><span>Publish a new opportunity</span></span>
                </Link>
              )}
              <Link to={`${EMPLOYER_BASE_PATH}/candidates`} className={styles.quickAction}>
                <span className={styles.quickIcon}><UserSearch size={18} /></span>
                <span><strong>Find Candidates</strong><span>Search people who applied</span></span>
              </Link>
              <Link to={`${EMPLOYER_BASE_PATH}/profile`} className={styles.quickAction}>
                <span className={styles.quickIcon}><Building2 size={18} /></span>
                <span><strong>Update Company Profile</strong><span>Logo, about and media</span></span>
              </Link>
              <Link to={`${EMPLOYER_BASE_PATH}/analytics`} className={styles.quickAction}>
                <span className={styles.quickIcon}><BarChart3 size={18} /></span>
                <span><strong>View Analytics</strong><span>Views, funnel and top jobs</span></span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EmployerCenterPage;
