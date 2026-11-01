import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarClock,
  Clock3,
  GraduationCap,
  Laptop,
  MapPin,
  Search,
  ShieldCheck,
  Video,
} from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/CareersPages.module.scss';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { CareersError } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { JobCard } from '../components/JobCard';
import { careersApi, searchJobsIn } from '../services/careersApi';
import { companiesApi } from '../services/companiesApi';
import { CAREER_RESOURCES } from '../data/careerResources';
import { formatSalary, placeLabel } from '../utils/jobFormat';

const RESOURCE_ICONS = { resume: BookOpen, interview: Video, advice: CalendarClock, certifications: ShieldCheck, search: Search };

const fmt = (n: number) => new Intl.NumberFormat().format(n);

export function CareersHomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const jobs = useEmployerQuery(() => careersApi.fetchAllJobs(), []);
  const companies = useEmployerQuery(() => companiesApi.list(), []);

  const stats = useMemo(() => (jobs.data ? searchJobsIn(jobs.data, {}) : null), [jobs.data]);

  const popular = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of jobs.data ?? []) {
      for (const skill of job.skills) counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([skill]) => skill);
  }, [jobs.data]);

  const locations = useMemo(
    () => [...new Set((jobs.data ?? []).flatMap((job) => [job.city, job.country].filter(Boolean)))].sort().slice(0, 40),
    [jobs.data],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (location.trim()) params.set('loc', location.trim());
    navigate(`/careers/jobs${params.toString() ? `?${params}` : ''}`);
  };

  const featured = (jobs.data ?? []).slice(0, 6);
  const internships = (jobs.data ?? []).filter((job) => job.kind === 'internship').slice(0, 3);
  const heroJobs = (jobs.data ?? []).slice(0, 3);

  const categories = stats && [
    { label: 'All Jobs', count: stats.total, icon: Briefcase, to: '/careers/jobs' },
    { label: 'Internships', count: stats.facets.kinds.internship, icon: GraduationCap, to: '/careers/jobs?type=internship' },
    { label: 'Remote', count: stats.facets.remote, icon: Laptop, to: '/careers/jobs?remote=1' },
    { label: 'Part-time', count: stats.facets.employmentTypes.part_time, icon: Clock3, to: '/careers/jobs?employment=part_time' },
    { label: 'Full-time', count: stats.facets.employmentTypes.full_time, icon: Briefcase, to: '/careers/jobs?employment=full_time' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroText}>
          <h1 id="hero-title">Find work that moves you forward.</h1>
          <p>Discover jobs, internships, and opportunities from top companies on Fockis.</p>
          <form className={styles.heroSearch} onSubmit={submit} role="search">
            <label className={styles.heroField}>
              <span className={ui.srOnly}>Job title, keywords, or company</span>
              <Search size={17} />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Job title, keywords, or company" />
            </label>
            <label className={styles.heroField}>
              <span className={ui.srOnly}>Location</span>
              <MapPin size={17} />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, country or “Remote”" list="careers-home-locations" />
              <datalist id="careers-home-locations">
                <option value="Remote" />
                {locations.map((loc) => <option key={loc} value={loc} />)}
              </datalist>
            </label>
            <button type="submit" className={ui.btnPrimary}>Search Jobs</button>
          </form>
          {stats && (
            <div className={styles.heroStat}>
              <strong>{fmt(stats.total)}</strong>
              <span>open roles on Fockis Careers</span>
            </div>
          )}
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          {heroJobs.map((job) => (
            <Link key={job.id} to={`/careers/jobs/${job.id}`} className={styles.floatCard} tabIndex={-1}>
              <CompanyLogo name={job.company.name} src={job.company.logoUrl} size="sm" />
              <span style={{ minWidth: 0 }}>
                <strong>{job.title}</strong>
                <span>{job.company.name} · {placeLabel(job)}</span>
                {formatSalary(job) && <span style={{ display: 'block', color: '#1677e8', fontWeight: 650 }}>{formatSalary(job)}</span>}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {jobs.loading && !jobs.data && <div className={ui.card}><EmployerLoading label="Loading jobs…" /></div>}
      {jobs.error && <div className={ui.card}><CareersError message={jobs.error} onRetry={jobs.refetch} /></div>}

      {categories && (
        <nav className={styles.categories} aria-label="Browse by category">
          {categories.map(({ label, count, icon: Icon, to }) => (
            <Link key={label} to={to} className={styles.category}>
              <span className={styles.categoryIcon}><Icon size={21} /></span>
              <strong>{label}</strong>
              <span>{fmt(count)} {count === 1 ? 'job' : 'jobs'}</span>
            </Link>
          ))}
        </nav>
      )}

      {companies.data && companies.data.length > 0 && (
        <div>
          <div className={styles.sectionHead}>
            <h2>Featured Companies</h2>
            <Link to="/careers/companies">View all <ArrowRight size={14} /></Link>
          </div>
          <div className={styles.companyStrip}>
            {companies.data.slice(0, 5).map((company) => (
              <Link key={company.id} to={`/careers/companies/${company.id}`} className={styles.companyTile}>
                <CompanyLogo name={company.name} src={company.logoUrl} size="sm" />
                <span style={{ minWidth: 0 }}>
                  <strong>{company.name}</strong>
                  <span>{company.openJobs} open {company.openJobs === 1 ? 'job' : 'jobs'}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {jobs.data && (
        <div>
          <div className={styles.sectionHead}>
            <div>
              <h2>Featured Jobs</h2>
              <p>The newest opportunities on Fockis</p>
            </div>
            <Link to="/careers/jobs">See all jobs <ArrowRight size={14} /></Link>
          </div>
          {featured.length ? (
            <div className={styles.jobList}>
              {featured.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          ) : (
            <div className={ui.card}>
              <EmployerEmptyState icon={<Briefcase size={24} />} title="No open jobs yet" description="Check back soon — new opportunities are posted every week." />
            </div>
          )}
        </div>
      )}

      {internships.length > 0 && (
        <div>
          <div className={styles.sectionHead}>
            <div>
              <h2>Internships</h2>
              <p>Start your career with hands-on experience</p>
            </div>
            <Link to="/careers/internships">All internships <ArrowRight size={14} /></Link>
          </div>
          <div className={styles.jobList}>{internships.map((job) => <JobCard key={job.id} job={job} />)}</div>
        </div>
      )}

      {popular.length > 0 && (
        <div>
          <div className={styles.sectionHead}><h2>Popular Searches</h2></div>
          <div className={styles.chipLinks}>
            {popular.map((term) => (
              <Link key={term} to={`/careers/jobs?q=${encodeURIComponent(term)}`}><Search size={13} /> {term}</Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className={styles.sectionHead}>
          <div>
            <h2>Career Resources</h2>
            <p>Tools, guides, and tips to grow your career</p>
          </div>
          <Link to="/careers/resources">All resources <ArrowRight size={14} /></Link>
        </div>
        <div className={styles.resourceRow}>
          {CAREER_RESOURCES.slice(0, 3).map((resource) => {
            const Icon = RESOURCE_ICONS[resource.category];
            return (
              <Link key={resource.id} to={`/careers/resources#${resource.id}`} className={styles.resourceTile}>
                <span className={styles.tileIcon}><Icon size={20} /></span>
                <span><strong>{resource.title}</strong><span>{resource.summary}</span></span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.ctaBand}>
        <div>
          <h2>Hiring? Reach candidates on Fockis.</h2>
          <p>Post jobs, review applicants and schedule interviews in the Employer Center.</p>
        </div>
        <Link to="/careers/employer/jobs/new" className={ui.btnPrimary}>Post a Job</Link>
      </div>
    </div>
  );
}

export default CareersHomePage;
