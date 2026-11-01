import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, Briefcase, Building2, MapPin } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { SearchInput } from '../../employer/components/shared/SearchInput';
import { useDebouncedValue, useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { CareersError } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { companiesApi } from '../services/companiesApi';

export function CompaniesPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const debounced = useDebouncedValue(search, 300);
  const { data, loading, error, refetch } = useEmployerQuery(() => companiesApi.list(debounced), [debounced]);

  const setSearch = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value);
    else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Companies hiring on Fockis</h1>
          <p>Explore employers and their open roles.</p>
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search companies or industries" />
      </div>

      {loading && !data ? (
        <div className={ui.card}><EmployerLoading label="Loading companies…" /></div>
      ) : error ? (
        <div className={ui.card}><CareersError message={error} onRetry={refetch} /></div>
      ) : !data?.length ? (
        <div className={ui.card}>
          <EmployerEmptyState
            icon={<Building2 size={22} />}
            title={search ? 'No companies match' : 'No companies yet'}
            description={search ? 'Try a different name or industry.' : 'Companies appear here once they set up an employer profile.'}
          />
        </div>
      ) : (
        <div className={styles.companyGrid}>
          {data.map((company) => (
            <Link key={company.id} to={`/careers/companies/${company.id}`} className={styles.companyCard}>
              <CompanyLogo name={company.name} src={company.logoUrl} size="lg" />
              <h3>
                {company.name}
                {company.verified && <BadgeCheck size={16} color="#1677e8" aria-label="Verified employer" />}
              </h3>
              {company.tagline && <p>{company.tagline}</p>}
              <div className={styles.companyMeta}>
                {company.industry && <span><Building2 size={13} /> {company.industry}</span>}
                {company.location && <span><MapPin size={13} /> {company.location}</span>}
                <span><Briefcase size={13} /> {company.openJobs} open job{company.openJobs === 1 ? '' : 's'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompaniesPage;
