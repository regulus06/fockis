import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Briefcase, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/CareersPages.module.scss';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { EmployerPagination } from '../../employer/components/shared/EmployerPagination';
import { useEmployerQuery, getErrorMessage } from '../../employer/hooks/useEmployerQuery';
import { useNotify } from '../../employer/store/employerNotificationStore';
import { CareersError } from '../components/CareersState';
import { JobCard } from '../components/JobCard';
import { careersApi, searchJobsIn } from '../services/careersApi';
import { profileApi } from '../services/profileApi';
import { useCareerUser } from '../hooks/useCareerUser';
import type { DatePosted, ExperienceLevel, JobKind, JobSort } from '../types';
import { EMPLOYMENT_LABELS, EXPERIENCE_LABELS, KIND_LABELS } from '../utils/jobFormat';

const PAGE_SIZE = 10;
const list = <T extends string>(value: string | null, allowed: readonly T[]) =>
  (value ?? '').split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));

const KINDS = ['job', 'internship', 'coop'] as const;
const EMPLOYMENT = ['full_time', 'part_time', 'contract', 'temporary'] as const;
const EXPERIENCE = ['entry', 'mid', 'senior'] as const;

export interface JobSearchPageProps {
  /** Locks the job kind (used by /careers/internships and /careers/co-ops). */
  presetKind?: JobKind;
  title?: string;
}

export function JobSearchPage({ presetKind, title }: JobSearchPageProps) {
  const notify = useNotify();
  const user = useCareerUser((state) => state.user);
  const refreshAlerts = useCareerUser((state) => state.refreshAlerts);
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get('q') ?? '';
  const loc = params.get('loc') ?? '';
  const kinds = presetKind ? [presetKind] : list(params.get('type'), KINDS);
  const employment = list(params.get('employment'), EMPLOYMENT);
  const experience = list(params.get('exp'), EXPERIENCE);
  const remoteOnly = params.get('remote') === '1';
  const salaryFloor = Number(params.get('salary') ?? 0) || 0;
  const posted = (params.get('posted') as DatePosted) || 'any';
  const sort = (params.get('sort') as JobSort) || (q ? 'relevance' : 'recent');
  const page = Number(params.get('page') ?? 1) || 1;

  const [keywordDraft, setKeywordDraft] = useState(q);
  const [locationDraft, setLocationDraft] = useState(loc);
  useEffect(() => setKeywordDraft(q), [q]);
  useEffect(() => setLocationDraft(loc), [loc]);

  const jobs = useEmployerQuery(() => careersApi.fetchAllJobs(), []);

  const result = useMemo(
    () =>
      jobs.data
        ? searchJobsIn(jobs.data, {
            keyword: q,
            location: loc,
            kinds,
            employmentTypes: employment,
            experience,
            remoteOnly,
            salaryFloor,
            datePosted: posted,
            sort,
            page,
            pageSize: PAGE_SIZE,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [jobs.data, params.toString(), presetKind],
  );

  const countries = useMemo(() => [...new Set((jobs.data ?? []).map((job) => job.country).filter(Boolean))].sort(), [jobs.data]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: !('page' in changes) });
  };

  const toggleIn = (key: string, current: string[], value: string) => {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next.join(',') || null });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update({ q: keywordDraft.trim() || null, loc: locationDraft.trim() || null });
  };

  const clearAll = () => {
    setKeywordDraft('');
    setLocationDraft('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const createAlert = async () => {
    try {
      await profileApi.createAlert({
        keywords: q,
        location: loc,
        type: kinds.length === 1 ? kinds[0] : employment.length === 1 ? employment[0] : '',
        remoteOnly,
      });
      notify('Job alert created. New matches will appear in Job Alerts.');
      void refreshAlerts();
    } catch (error) {
      notify(getErrorMessage(error), 'error');
    }
  };

  const facets = result?.facets;
  const filtersActive = Boolean(q || loc || (!presetKind && kinds.length) || employment.length || experience.length || remoteOnly || salaryFloor || posted !== 'any');

  return (
    <div className={styles.page}>
      <form className={styles.searchBar} onSubmit={submit} role="search">
        <label className={styles.heroField}>
          <span className={ui.srOnly}>Job title, company or keywords</span>
          <Search size={17} />
          <input value={keywordDraft} onChange={(e) => setKeywordDraft(e.target.value)} placeholder="Job title, company, or keywords" />
        </label>
        <label className={styles.heroField}>
          <span className={ui.srOnly}>Location</span>
          <MapPin size={17} />
          <input value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} placeholder="City, country or “Remote”" list="careers-countries" />
          <datalist id="careers-countries">
            <option value="Remote" />
            {countries.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <button type="submit" className={ui.btnPrimary}><Search size={16} /> Search</button>
      </form>

      <div className={styles.listingLayout}>
        <aside className={`${styles.filters} ${showFilters ? '' : styles.filtersHidden}`} aria-label="Filters">
          <div className={styles.filterHead}>
            <h2>Filters</h2>
            <button type="button" className={ui.linkBtn} onClick={clearAll} disabled={!filtersActive}>Clear All</button>
          </div>

          <fieldset className={styles.filterGroup}>
            <legend>Job Type</legend>
            {EMPLOYMENT.map((value) => (
              <label key={value} className={styles.check}>
                <input type="checkbox" checked={employment.includes(value)} onChange={() => toggleIn('employment', employment, value)} />
                {EMPLOYMENT_LABELS[value]} <em>({facets?.employmentTypes[value] ?? 0})</em>
              </label>
            ))}
            {!presetKind &&
              (['internship', 'coop'] as const).map((value) => (
                <label key={value} className={styles.check}>
                  <input type="checkbox" checked={kinds.includes(value)} onChange={() => toggleIn('type', kinds, value)} />
                  {KIND_LABELS[value]} <em>({facets?.kinds[value] ?? 0})</em>
                </label>
              ))}
            <label className={styles.check}>
              <input type="checkbox" checked={remoteOnly} onChange={() => update({ remote: remoteOnly ? null : '1' })} />
              Remote <em>({facets?.remote ?? 0})</em>
            </label>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend>Experience Level</legend>
            {EXPERIENCE.map((value) => (
              <label key={value} className={styles.check}>
                <input type="checkbox" checked={experience.includes(value)} onChange={() => toggleIn('exp', experience, value)} />
                {EXPERIENCE_LABELS[value as ExperienceLevel]} <em>({facets?.experience[value] ?? 0})</em>
              </label>
            ))}
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend>Salary Range</legend>
            <input
              className={styles.range}
              type="range"
              min={0}
              max={200000}
              step={10000}
              value={salaryFloor}
              onChange={(e) => update({ salary: e.target.value === '0' ? null : e.target.value })}
              aria-label="Minimum yearly salary"
              aria-valuetext={salaryFloor ? `$${salaryFloor.toLocaleString()} or more per year` : 'Any salary'}
            />
            <div className={styles.rangeValue}>
              <span>{salaryFloor ? `$${salaryFloor.toLocaleString()}+ / year` : 'Any salary'}</span>
              <span>$200,000+</span>
            </div>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend>Location</legend>
            <select className={ui.select} value={countries.includes(loc) ? loc : ''} onChange={(e) => update({ loc: e.target.value || null })} aria-label="Country">
              <option value="">All locations</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </fieldset>

          <fieldset className={styles.filterGroup}>
            <legend>Date Posted</legend>
            <select className={ui.select} value={posted} onChange={(e) => update({ posted: e.target.value === 'any' ? null : e.target.value })} aria-label="Date posted">
              <option value="any">Any time</option>
              <option value="24h">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
            </select>
          </fieldset>
        </aside>

        <div aria-live="polite">
          <div className={styles.resultsHead}>
            <h1>
              {title ? `${title} · ` : ''}
              {result ? `${result.total.toLocaleString()} ${result.total === 1 ? 'Job' : 'Jobs'} Found` : 'Jobs'}
            </h1>
            <div className={ui.row}>
              <button type="button" className={`${ui.btnSecondary} ${ui.btnSm} ${styles.filtersToggle}`} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
                <SlidersHorizontal size={14} /> Filters
              </button>
              {user && filtersActive && (
                <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} onClick={createAlert}>
                  <Bell size={14} /> Create alert
                </button>
              )}
              <label>
                Sort by:
                <select className={ui.select} value={sort} onChange={(e) => update({ sort: e.target.value })} style={{ width: 'auto', minHeight: 34 }}>
                  <option value="recent">Most Recent</option>
                  <option value="relevance">Most Relevant</option>
                  <option value="salary">Highest Salary</option>
                </select>
              </label>
            </div>
          </div>

          {jobs.loading && !jobs.data && <div className={ui.card}><EmployerLoading rows={6} label="Loading jobs" /></div>}
          {jobs.error && <div className={ui.card}><CareersError message={jobs.error} onRetry={jobs.refetch} /></div>}

          {result && result.items.length === 0 && (
            <div className={ui.card}>
              <EmployerEmptyState
                icon={<Briefcase size={24} />}
                title={filtersActive ? 'No jobs match your search' : 'No open jobs yet'}
                description={filtersActive ? 'Try fewer filters or a broader keyword.' : 'New opportunities are posted regularly — check back soon.'}
                action={filtersActive && <button type="button" className={ui.btnSecondary} onClick={clearAll}>Clear filters</button>}
              />
            </div>
          )}

          {result && result.items.length > 0 && (
            <>
              <div className={styles.jobList}>{result.items.map((job) => <JobCard key={job.id} job={job} />)}</div>
              <div className={ui.cardFlush} style={{ marginTop: 14 }}>
                <EmployerPagination
                  page={result.page}
                  pages={result.pages}
                  total={result.total}
                  limit={result.pageSize}
                  noun="jobs"
                  onPageChange={(next) => {
                    update({ page: String(next) });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default JobSearchPage;
