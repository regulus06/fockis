import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Briefcase, Building2, CalendarDays, Globe, MapPin, Users } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { CareersError } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { JobCard } from '../components/JobCard';
import { companiesApi } from '../services/companiesApi';
import { safeApplicationUrl } from '../utils/externalApply';

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export function CompanyProfilePage() {
  const { companyId = '' } = useParams<{ companyId: string }>();
  const [tab, setTab] = useState<'about' | 'jobs'>('about');
  const { data: company, loading, error, refetch } = useEmployerQuery(() => companiesApi.getCompanyById(companyId), [companyId], {
    enabled: Boolean(companyId),
  });

  if (loading && !company) return <div className={ui.card}><EmployerLoading label="Loading company…" /></div>;
  if (error || !company) return <div className={ui.card}><CareersError message={error ?? 'Company not found.'} onRetry={refetch} /></div>;

  const website = safeApplicationUrl(company.website);
  const socials = Object.entries(company.socialLinks ?? {})
    .map(([key, url]) => [key, safeApplicationUrl(url)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  return (
    <div className={styles.page}>
      <Link to="/careers/companies" className={ui.linkBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> All companies
      </Link>

      <div className={ui.cardFlush} style={{ overflow: 'hidden' }}>
        <div className={styles.companyCover} style={company.coverImageUrl ? { backgroundImage: `url("${company.coverImageUrl}")` } : undefined} />
        <div className={styles.companyHeader}>
          <CompanyLogo name={company.name} src={company.logoUrl} size="lg" />
          <div className={styles.companyHeaderText}>
            <h1>
              {company.name}
              {company.verified && <BadgeCheck size={20} color="#1677e8" aria-label="Verified employer" />}
            </h1>
            {company.tagline && <p className={ui.muted} style={{ margin: '4px 0 0' }}>{company.tagline}</p>}
            <div className={styles.companyMeta} style={{ marginTop: 8 }}>
              {company.industry && <span><Building2 size={13} /> {company.industry}</span>}
              {company.location && <span><MapPin size={13} /> {company.location}</span>}
              {company.companySize && <span><Users size={13} /> {company.companySize} employees</span>}
              {company.foundedYear && <span><CalendarDays size={13} /> Founded {company.foundedYear}</span>}
            </div>
          </div>
          <div className={ui.row}>
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className={ui.btnSecondary}>
                <Globe size={15} /> Website
              </a>
            )}
            <button type="button" className={ui.btnPrimary} onClick={() => setTab('jobs')}>
              <Briefcase size={15} /> {company.openJobs} open job{company.openJobs === 1 ? '' : 's'}
            </button>
          </div>
        </div>
        <div className={ui.tabs} role="tablist" style={{ padding: '0 24px' }}>
          <button type="button" role="tab" className={ui.tab} aria-selected={tab === 'about'} onClick={() => setTab('about')}>About</button>
          <button type="button" role="tab" className={ui.tab} aria-selected={tab === 'jobs'} onClick={() => setTab('jobs')}>Jobs ({company.jobs.length})</button>
        </div>
      </div>

      {tab === 'about' ? (
        <div className={styles.twoCol}>
          <div className={styles.stack}>
            <div className={ui.card}>
              <h2 className={ui.sectionTitle}>About {company.name}</h2>
              {company.about ? (
                <p className={ui.prose} style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{company.about}</p>
              ) : (
                <p className={ui.muted} style={{ margin: 0 }}>This company hasn't added a description yet.</p>
              )}
            </div>
            {company.media.length > 0 && (
              <div className={ui.card}>
                <h2 className={ui.sectionTitle}>Life at {company.name}</h2>
                <div className={styles.media}>
                  {company.media.map((m) => (
                    <figure key={m.url}>
                      <img src={m.url} alt={m.caption || `${company.name} photo`} loading="lazy" />
                      {m.caption && <figcaption>{m.caption}</figcaption>}
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className={styles.stack}>
            <div className={ui.card}>
              <h2 className={ui.sectionTitle}>Company details</h2>
              <dl className={ui.dl}>
                <dt>Industry</dt><dd>{company.industry || '—'}</dd>
                <dt>Size</dt><dd>{company.companySize || '—'}</dd>
                <dt>Headquarters</dt><dd>{company.location || '—'}</dd>
                <dt>Founded</dt><dd>{company.foundedYear ?? '—'}</dd>
              </dl>
              {socials.length > 0 && (
                <div className={ui.row} style={{ marginTop: 14, flexWrap: 'wrap' }}>
                  {socials.map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className={`${ui.btnSecondary} ${ui.btnSm}`}>
                      {SOCIAL_LABELS[key] ?? key}
                    </a>
                  ))}
                </div>
              )}
            </div>
            {company.jobs.length > 0 && (
              <div className={ui.card}>
                <div className={styles.cardHead}>
                  <h2>Latest jobs</h2>
                  <button type="button" className={ui.linkBtn} onClick={() => setTab('jobs')}>View all</button>
                </div>
                <ul className={styles.rows}>
                  {company.jobs.slice(0, 3).map((job) => (
                    <li key={job.id} className={styles.rowItem} style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                      <div className={styles.rowMain}>
                        <Link to={`/careers/jobs/${job.id}`} className={styles.rowTitle}>{job.title}</Link>
                        <span>{job.location || job.country}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : company.jobs.length === 0 ? (
        <div className={ui.card}>
          <EmployerEmptyState icon={<Briefcase size={22} />} title="No open jobs" description={`${company.name} has no open roles right now.`} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {company.jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}

export default CompanyProfilePage;
