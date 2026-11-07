/**
 * /academy/campus — Institutional homepage (design board screen 1: navy, white
 * and gold), now in the same component system as the rest of Academy.
 *
 * Real data only:
 *   Programs → GET /academy/programs        Jobs   → GET /academy/jobs
 *   News     → GET /academy/news            Events → GET /academy/events
 *   "Why Fockis" / learning features → CMS sections home-why-us, learning-features
 *
 * Hero text, photo, badge and statistics: Admin → Settings → Institution
 * (useSiteInfo / useCampusStats). Statistics are hidden until an admin adds them.
 *
 * The old "Student Portal preview" block was removed: it showed a demo
 * student's data on a public page. Students use /academy/portal instead.
 */
import { Link } from 'react-router-dom';
import { Icon } from '../../components/academy/market/Icon';
import { SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { themeFor } from '../../components/academy/market/FaCourseCard';
import { useAcademyLoad } from '../../lib/useAcademyLoad';
import { useContentSection } from '../../lib/useContentSection';
import { getEvents, getJobs, getNews, getPrograms } from '../../lib/academyApi';
import { shortDate } from '../../lib/academyLearnApi';
import { useCampusStats, useSiteInfo } from '../../lib/siteInfo';
import { HeroDuo, LibraryArt } from '../../components/academy/market/Art';

const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

const QUICK = [
  { title: 'Apply', sub: 'Start your application.', href: '/academy/admissions', icon: 'file' },
  { title: 'Visit', sub: 'Explore Fockis Academy.', href: '/academy/contact', icon: 'building' },
  { title: 'Programs', sub: 'Find a program that fits your goals.', href: '/academy/programs', icon: 'layers' },
  { title: 'Financial Aid', sub: 'Tuition, scholarships, and aid.', href: '/academy/financial-aid', icon: 'dollar' },
  { title: 'Student Portal', sub: 'Access your academic resources.', href: '/academy/portal', icon: 'grid' },
  { title: 'Contact', sub: 'Connect with admissions.', href: '/academy/contact', icon: 'message' },
];

export default function AcademyCampus() {
  const programs = useAcademyLoad(getPrograms);
  const jobs = useAcademyLoad(getJobs);
  const news = useAcademyLoad(getNews);
  const events = useAcademyLoad(getEvents);
  const { info } = useSiteInfo();
  const { stats } = useCampusStats();
  const whyUs = useContentSection('home-why-us');
  const features = useContentSection('learning-features');

  const progList = programs.state.status === 'ready' ? programs.state.data.filter((p) => p.isActive !== false).slice(0, 4) : [];
  const jobList = jobs.state.status === 'ready' ? jobs.state.data.filter((j) => j.isActive !== false && j.active !== false).slice(0, 3) : [];
  const newsList = news.state.status === 'ready' ? news.state.data.slice(0, 4) : [];
  const evList = events.state.status === 'ready' ? events.state.data.filter((e) => e.isActive !== false).slice(0, 4) : [];
  const why = asItems(whyUs.items);
  const feat = asItems(features.items);

  return (
    <div className="fa-root fa-page">
      {/* HERO — design board screen 1 */}
      <section className="fa-inst__hero">
        <div className="fa-container fa-inst__herorow">
          <div className="fa-inst__copy">
            <p className="fa-eyebrow">— {info.campus_eyebrow || `${info.name || 'Fockis Academy'} · Purpose-built for careers`}</p>
            <h1>{info.campus_title || `Build Your Future at ${info.name || 'Fockis Academy'}`}</h1>
            <p className="fa-inst__lead">{info.campus_lead || 'Career-focused education, innovative programs, and a community designed to help you succeed — on campus or online.'}</p>
            <div className="fa-inst__btns">
              <Link className="fa-btn fa-btn--gold" to="/academy/programs">Explore Programs</Link>
              <Link className="fa-btn fa-btn--ghost-light" to="/academy/admissions">Apply Now</Link>
            </div>
            {stats.length > 0 && (
              <div className="fa-inst__stats">
                {stats.map((x) => (
                  <div key={x._id || x.label}>
                    <b>{x.value}</b>
                    <span>{x.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="fa-inst__media">
            {info.campus_image ? <img src={info.campus_image} alt={info.campus_badge_title || 'Campus'} /> : <LibraryArt />}
            {info.campus_badge_title && (
              <div className="fa-inst__mediacard">
                <div>
                  <b>{info.campus_badge_title}</b>
                  {info.campus_badge_subtitle && <small>{info.campus_badge_subtitle}</small>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="fa-container">
        {/* QUICK ACTIONS */}
        <section className="fa-quick">
          {QUICK.map((q) => (
            <Link key={q.title} to={q.href} className="fa-card fa-quick__item">
              <span className="fa-quick__ic">
                <Icon name={q.icon} size={22} />
              </span>
              <b>{q.title}</b>
              <small>{q.sub}</small>
            </Link>
          ))}
        </section>

        {/* PROGRAMS */}
        {(programs.state.status !== 'ready' || progList.length > 0) && (
        <section className="fa-section">
          <SectionHead eyebrow="Programs" title="Explore Our Programs" sub="Career-connected pathways built around real employer demand." action={<Link className="fa-btn fa-btn--outline fa-btn--sm" to="/academy/programs">View All Programs</Link>} />
          <StateLine loading={programs.state.status === 'loading'} error={programs.state.status === 'error' ? programs.state.error : false} onRetry={programs.reload} empty={programs.state.status === 'ready' && progList.length === 0} />
          <div className="fa-fgrid fa-fgrid--4">
            {progList.map((p) => {
              const id = String(p.id || p._id || p.code || p.name);
              return (
                <Link key={id} to={`/academy/programs?program=${encodeURIComponent(id)}`} className="fa-card fa-prog">
                  <span className="fa-prog__thumb" style={{ background: themeFor(id) }}>
                    <Icon name="cap" size={28} stroke={1.5} />
                  </span>
                  <span className="fa-prog__body">
                    {(s(p.level) || s(p.degree)) && <span className="fa-badge tone-blue">{s(p.level) || s(p.degree)}</span>}
                    <b>{p.name}</b>
                    {(s(p.desc) || s(p.description)) && <small>{s(p.desc) || s(p.description)}</small>}
                    <em>
                      Explore Program <Icon name="right" size={12} />
                    </em>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        )}
      </div>

      {/* WHY FOCKIS — navy band */}
      {(whyUs.loading || why.length > 0) && (
      <section className="fa-navyband">
        <div className="fa-container">
          <SectionHead eyebrow="Why Fockis" title="Why Choose Fockis Academy?" sub="A modern, career-connected approach to higher education." />
          <StateLine loading={whyUs.loading} error={!whyUs.loading && whyUs.error} />
          {!whyUs.loading && !whyUs.error && (
            <div className="fa-fgrid fa-fgrid--3">
              {why.map((w, i) => (
                <div key={w._id ?? w.title} className="fa-navycard">
                  <span>
                    <Icon name={['award', 'briefcase', 'users', 'globe', 'heart', 'shield'][i % 6]} size={18} />
                  </span>
                  <b>{w.title}</b>
                  {w.description && <p>{w.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      <div className="fa-container">
        {/* ONLINE LEARNING */}
        <section className="fa-section fa-split">
          <div>
            <SectionHead eyebrow="Online Learning" title="Learn Anywhere. Build Your Future." sub="Live classes, recorded lessons, seminars and certificates — all inside Fockis Academy." />
            {!features.loading && !features.error && feat.length > 0 && (
              <ul className="fa-checks">
                {feat.slice(0, 8).map((f) => (
                  <li key={f._id ?? f.title}>
                    <Icon name="checkCircle" size={17} /> {f.title}
                  </li>
                ))}
              </ul>
            )}
            <div className="fa-detail__btns">
              <Link className="fa-btn fa-btn--primary" to="/academy/learn">Browse Courses</Link>
              <Link className="fa-btn fa-btn--outline" to="/academy/online-learning">How it works</Link>
            </div>
          </div>
          <div className="fa-split__media">
            <HeroDuo />
          </div>
        </section>

        {/* CAREER */}
        {(jobs.state.status !== 'ready' || jobList.length > 0) && (
        <section className="fa-section">
          <SectionHead eyebrow="Career Center" title="Turn Education Into a Career" sub="Internships, employer partners and coaching built into every program." action={<Link className="fa-btn fa-btn--outline fa-btn--sm" to="/academy/career">View Career Center</Link>} />
          <StateLine loading={jobs.state.status === 'loading'} error={jobs.state.status === 'error' ? jobs.state.error : false} onRetry={jobs.reload} empty={jobs.state.status === 'ready' && jobList.length === 0} />
          <div className="fa-fgrid fa-fgrid--3">
            {jobList.map((j) => (
              <Link key={String(j._id || j.id || j.title)} to="/academy/career" className="fa-card fa-job">
                <div className="fa-job__top">
                  <span className="fa-stat__ic tone-blue">
                    <Icon name="briefcase" size={16} />
                  </span>
                  <span className="fa-badge tone-amber">{s(j.employmentType) || s(j.type) || 'job'}</span>
                </div>
                <b>{j.title}</b>
                <small className="fa-muted">{[s(j.company) || s(j.companyName), s(j.location) || s(j.loc)].filter(Boolean).join(' · ')}</small>
                {(s(j.salary) || s(j.pay)) && <span className="fa-job__pay">{s(j.salary) || s(j.pay)}</span>}
              </Link>
            ))}
          </div>
        </section>
        )}

        {/* NEWS + EVENTS */}
        {(news.state.status !== 'ready' || events.state.status !== 'ready' || newsList.length > 0 || evList.length > 0) && (
        <section className="fa-section fa-split fa-split--top">
          <div>
            <SectionHead eyebrow="News" title="Campus News" />
            <StateLine loading={news.state.status === 'loading'} error={news.state.status === 'error' ? news.state.error : false} onRetry={news.reload} empty={news.state.status === 'ready' && newsList.length === 0} />
            <div className="fa-fgrid fa-fgrid--2">
              {newsList.map((n, i) => (
                <article key={String(n._id || n.id || n.title)} className="fa-card fa-news">
                  <span className="fa-news__thumb" style={n.imageUrl ? { backgroundImage: `url(${n.imageUrl})` } : { background: themeFor(n.title + i) }} />
                  <div>
                    <small>{[s(n.tag) || s(n.category), s(n.date) || shortDate(s(n.publishedAt) || s(n.createdAt))].filter(Boolean).join(' · ')}</small>
                    <b>{n.title}</b>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div>
            <SectionHead eyebrow="Events" title="Upcoming Events" action={<Link className="fa-link" to="/academy/calendar">Calendar <Icon name="right" size={13} /></Link>} />
            <StateLine loading={events.state.status === 'loading'} error={events.state.status === 'error' ? events.state.error : false} onRetry={events.reload} empty={events.state.status === 'ready' && evList.length === 0} />
            <ul className="fa-evlist">
              {evList.map((e) => {
                const id = String(e._id || e.id || '');
                const d = new Date(e.startDate || e.date || '');
                const ok = !Number.isNaN(d.getTime());
                return (
                  <li key={id || e.title}>
                    <Link className="fa-card fa-evrow" to={id ? `/academy/events/${encodeURIComponent(id)}` : '/academy/calendar'}>
                      <span className="fa-evrow__date">
                        <b>{ok ? d.getDate() : s(e.d) ?? '–'}</b>
                        <small>{ok ? d.toLocaleDateString(undefined, { month: 'short' }) : s(e.m) ?? ''}</small>
                      </span>
                      <span>
                        <b>{e.title}</b>
                        <small>{s(e.location) || s(e.loc) || 'Details inside'}</small>
                      </span>
                      <Icon name="right" size={15} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
        )}

        <section className="fa-band">
          <div>
            <b>Your future starts with one application</b>
            <p>Join a community building real careers in technology, business, healthcare and the skilled trades.</p>
          </div>
          <div className="fa-band__btns">
            <Link className="fa-btn fa-btn--gold" to="/academy/admissions">Start Your Application</Link>
            <Link className="fa-btn fa-btn--white" to="/academy/contact">Request Information</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
