import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FaModal, FeatureCard, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { useContentSection } from '../../lib/useContentSection';
import { useAcademyLoad } from '../../lib/useAcademyLoad';
import { useAcademyToast } from '../../lib/academyToastStore';
import { getJobs, getStoredToken, submitJobApplication, type AcademyJob } from '../../lib/academyApi';

const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const company = (j: AcademyJob) => s(j.company) || s(j.companyName);
const place = (j: AcademyJob) => s(j.location) || s(j.loc);
const kind = (j: AcademyJob) => (s(j.employmentType) || s(j.type) || 'job').toLowerCase();
const pay = (j: AcademyJob) => s(j.salary) || s(j.salaryRange) || s(j.pay);
const desc = (j: AcademyJob) => s(j.description) || s(j.desc);
const TYPES = ['all', 'job', 'internship', 'apprenticeship'];

/** /academy/career — CMS "career-services" + GET /academy/jobs; Apply posts /academy/jobs/applications. */
export default function AcademyCareer() {
  const services = useContentSection('career-services');
  const jobs = useAcademyLoad(getJobs);
  const toast = useAcademyToast((st) => st.showToast);
  const [type, setType] = useState('all');
  const [open, setOpen] = useState<AcademyJob | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => (jobs.state.status === 'ready' ? jobs.state.data.filter((j) => j.isActive !== false && j.active !== false) : []), [jobs.state]);
  const shown = type === 'all' ? list : list.filter((j) => kind(j).includes(type));
  const svc = asItems(services.items);

  async function apply(j: AcademyJob) {
    if (s(j.applicationUrl)) {
      window.open(s(j.applicationUrl), '_blank', 'noopener');
      return;
    }
    const id = String(j._id || j.id || '');
    if (!id) return toast("Couldn't apply — this job has no id.");
    if (!getStoredToken()) return toast('Sign in to Fockis Academy to apply.');
    setBusy(true);
    try {
      await submitJobApplication({ jobId: id });
      toast(`Application sent: ${j.title}`);
      setOpen(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't submit application. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Career Center" title="Turn Education Into a Career" subtitle="Job placement, internships and coaching built directly into your Fockis Academy experience." icon="briefcase" actions={<Link className="fa-btn fa-btn--white" to="/academy/employers">For Employers</Link>} />
      <div className="fa-container fa-section">
        <StateLine loading={services.loading} error={!services.loading && services.error} />
        {!services.loading && !services.error && svc.length > 0 && (
          <div className="fa-fgrid fa-fgrid--3">
            {svc.map((c, i) => (
              <FeatureCard key={c._id ?? c.title} index={i} icon={['briefcase', 'user', 'chart', 'users', 'file', 'award'][i % 6]} title={c.title} text={c.description} />
            ))}
          </div>
        )}

        <div className="fa-section">
          <SectionHead
            eyebrow="Job board"
            title="Open roles for Fockis students"
            action={
              <div className="fa-chips">
                {TYPES.map((t) => (
                  <button key={t} className={`fa-chipbtn ${type === t ? 'is-on' : ''}`} onClick={() => setType(t)}>
                    {t === 'all' ? 'All' : `${t[0].toUpperCase()}${t.slice(1)}s`}
                  </button>
                ))}
              </div>
            }
          />
          <StateLine loading={jobs.state.status === 'loading'} error={jobs.state.status === 'error' ? jobs.state.error : false} onRetry={jobs.reload} />
          {jobs.state.status === 'ready' && shown.length === 0 && <div className="fa-state">No open roles right now.</div>}
          <div className="fa-fgrid fa-fgrid--3">
            {shown.map((j) => (
              <div key={String(j._id || j.id || j.title)} className="fa-card fa-job">
                <div className="fa-job__top">
                  <span className="fa-stat__ic tone-blue">
                    <Icon name="briefcase" size={16} />
                  </span>
                  <span className="fa-badge tone-amber">{kind(j)}</span>
                </div>
                <b>{j.title}</b>
                <small className="fa-muted">{[company(j), place(j)].filter(Boolean).join(' · ')}</small>
                {pay(j) && <span className="fa-job__pay">{pay(j)}</span>}
                <div className="fa-job__btns">
                  <button className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => setOpen(j)}>
                    View Job
                  </button>
                  <button className="fa-btn fa-btn--primary fa-btn--xs" disabled={busy} onClick={() => apply(j)}>
                    Apply
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {open && (
        <FaModal title={open.title} onClose={() => setOpen(null)}>
          <p className="fa-muted">{[company(open), place(open), pay(open)].filter(Boolean).join(' · ')}</p>
          <p className="fa-pre" style={{ marginTop: 12, lineHeight: 1.6 }}>
            {desc(open) ?? 'No description provided.'}
          </p>
          <div className="fa-builder__foot">
            <button className="fa-btn fa-btn--primary" disabled={busy} onClick={() => apply(open)}>
              {busy ? 'Sending…' : 'Apply Now'}
            </button>
          </div>
        </FaModal>
      )}
    </div>
  );
}
