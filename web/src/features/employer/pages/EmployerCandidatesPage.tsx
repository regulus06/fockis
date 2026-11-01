import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Briefcase, CalendarDays, GraduationCap, Info, Mail, MapPin, UserSearch } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import styles from '../styles/EmployerApplicants.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { Avatar } from '../components/shared/Avatar';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EmployerPagination } from '../components/shared/EmployerPagination';
import { ApplicationStatusBadge } from '../components/shared/EmployerStatusBadge';
import { useDebouncedValue, getErrorMessage, useEmployerQuery } from '../hooks/useEmployerQuery';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerCandidate } from '../types';
import { EMPLOYER_BASE_PATH } from '../utils/employerConstants';
import { formatEmployerDate } from '../utils/employerFormatters';

const PAGE_SIZE = 12;

export function EmployerCandidatesPage() {
  const notify = useNotify();
  const { can } = useEmployerPermissions();
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [experience, setExperience] = useState('any');
  const [education, setEducation] = useState('');
  const [availability, setAvailability] = useState('any');
  const [savedOnly, setSavedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);

  const q = useDebouncedValue(search);
  const loc = useDebouncedValue(location);
  const edu = useDebouncedValue(education);

  const { data, setData, loading, error, refetch } = useEmployerQuery(
    () =>
      employerApi.listCandidates({
        search: q,
        location: loc,
        experience: experience === 'any' ? undefined : experience,
        education: edu,
        availability: availability === 'any' ? undefined : availability,
        saved: savedOnly || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    [q, loc, experience, edu, availability, savedOnly, page],
  );

  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const toggleSave = async (candidate: EmployerCandidate) => {
    setSavingId(candidate.userId);
    try {
      if (candidate.saved) await employerApi.unsaveCandidate(candidate.userId);
      else await employerApi.saveCandidate(candidate.userId);
      setData((current) =>
        current && {
          ...current,
          items: current.items.map((item) => (item.userId === candidate.userId ? { ...item, saved: !candidate.saved } : item)),
        },
      );
      notify(candidate.saved ? `${candidate.fullName} removed from saved candidates.` : `${candidate.fullName} saved.`);
      if (savedOnly && candidate.saved) await refetch();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setSavingId(null);
    }
  };

  const filtersActive = Boolean(q || loc || edu || experience !== 'any' || availability !== 'any' || savedOnly);

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Candidates" description="Discover and connect with people who applied to your jobs on Fockis." />

      <div className={ui.cardFlush}>
        <div className={ui.toolbar}>
          <SearchInput value={search} onChange={reset(setSearch)} placeholder='Search candidates by name or skill (e.g. "React developer")' />
          <button type="button" className={ui.filterChip} aria-pressed={savedOnly} onClick={() => reset(setSavedOnly)(!savedOnly)}>
            <Bookmark size={14} /> Saved only
          </button>
        </div>
        <div className={styles.filterBar}>
          <label className={ui.field} style={{ flex: '1 1 160px' }}>
            <span className={ui.hint}>Location</span>
            <input className={ui.input} value={location} onChange={(e) => reset(setLocation)(e.target.value)} placeholder="City or country" />
          </label>
          <label className={ui.field} style={{ flex: '1 1 160px' }}>
            <span className={ui.hint}>Experience</span>
            <select className={ui.select} value={experience} onChange={(e) => reset(setExperience)(e.target.value)}>
              <option value="any">Any experience</option>
              <option value="with">Has work experience</option>
              <option value="without">No experience listed</option>
            </select>
          </label>
          <label className={ui.field} style={{ flex: '1 1 160px' }}>
            <span className={ui.hint}>Education</span>
            <input className={ui.input} value={education} onChange={(e) => reset(setEducation)(e.target.value)} placeholder="School or field of study" />
          </label>
          <label className={ui.field} style={{ flex: '1 1 160px' }}>
            <span className={ui.hint}>Availability</span>
            <select className={ui.select} value={availability} onChange={(e) => reset(setAvailability)(e.target.value)}>
              <option value="any">Any time</option>
              <option value="now">Available now</option>
              <option value="30days">Within 30 days</option>
              <option value="later">Later than 30 days</option>
            </select>
          </label>
        </div>
      </div>

      <p className={ui.notice} style={{ margin: 0 }}>
        <Info size={16} />
        For privacy, you only see candidates who applied to your jobs. Contact details come from their application.
      </p>

      {loading && !data && <div className={ui.card}><EmployerLoading rows={5} label="Loading candidates" /></div>}
      {error && <div className={ui.card}><EmployerError message={error} onRetry={refetch} /></div>}

      {data && !error && data.items.length === 0 && (
        <div className={ui.card}>
          <EmployerEmptyState
            icon={<UserSearch size={24} />}
            title={filtersActive ? 'No candidates match these filters' : 'No candidates yet'}
            description={filtersActive ? 'Try broadening your search.' : 'Candidates appear here after they apply to one of your jobs on Fockis.'}
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className={styles.candidateGrid} aria-busy={loading}>
            {data.items.map((candidate) => (
              <div key={candidate.userId} className={`${ui.card} ${styles.candidateCard}`}>
                <div className={styles.candidateTop}>
                  <Avatar name={candidate.fullName} src={candidate.profilePicture} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{candidate.fullName}</h3>
                    <p>
                      {candidate.experience?.roleTitle
                        ? `${candidate.experience.roleTitle}${candidate.experience.company ? ` at ${candidate.experience.company}` : ''}`
                        : candidate.education?.major ?? 'Candidate'}
                    </p>
                  </div>
                  {can('manageApplicants') && (
                    <button
                      type="button"
                      className={ui.iconBtn}
                      onClick={() => toggleSave(candidate)}
                      disabled={savingId === candidate.userId}
                      aria-pressed={candidate.saved}
                      aria-label={candidate.saved ? `Unsave ${candidate.fullName}` : `Save ${candidate.fullName}`}
                      title={candidate.saved ? 'Saved' : 'Save candidate'}
                    >
                      {candidate.saved ? <BookmarkCheck size={18} color="#1677e8" /> : <Bookmark size={18} />}
                    </button>
                  )}
                </div>

                {candidate.skills.length > 0 && (
                  <div className={ui.chips}>
                    {candidate.skills.slice(0, 6).map((skill) => <span key={skill} className={ui.tag}>{skill}</span>)}
                    {candidate.skills.length > 6 && <span className={ui.muted} style={{ fontSize: 12 }}>+{candidate.skills.length - 6}</span>}
                  </div>
                )}

                <div className={styles.candidateMeta}>
                  {candidate.location && <span><MapPin size={13} /> {candidate.location}</span>}
                  {candidate.education && <span><GraduationCap size={13} /> {candidate.education.school}</span>}
                  <span><Briefcase size={13} /> Applied to {candidate.appliedJobs.map((job) => job.title).join(', ') || 'a job'}</span>
                  <span>
                    <CalendarDays size={13} />
                    {candidate.availableStartDate ? `Available ${formatEmployerDate(candidate.availableStartDate)}` : `Last applied ${formatEmployerDate(candidate.lastAppliedAt)}`}
                  </span>
                </div>

                <div className={ui.row}>
                  <ApplicationStatusBadge status={candidate.latestStatus} />
                  <span className={ui.spacer} />
                  <a href={`mailto:${candidate.email}`} className={`${ui.btnSecondary} ${ui.btnSm}`}>
                    <Mail size={14} /> Contact
                  </a>
                  <Link to={`${EMPLOYER_BASE_PATH}/applicants/${candidate.latestApplicationId}`} className={`${ui.btnPrimary} ${ui.btnSm}`}>
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className={ui.cardFlush}>
            <EmployerPagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} noun="candidates" onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

export default EmployerCandidatesPage;
