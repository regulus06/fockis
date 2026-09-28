import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPrograms, getJobs, getStudentCourses, getStudentDashboard, getNews, getEvents, StudentDashboard } from '../../lib/academyApi';
import { Program, JobListing, Course, NewsItem, CampusEvent } from '../../types/academy';
import { NetworkMotif } from '../../components/academy/icons';
import QuickActionCard from '../../components/academy/QuickActionCard';
import ProgramCard from '../../components/academy/ProgramCard';
import WhyCard from '../../components/academy/WhyCard';
import DashboardPreview from '../../components/academy/DashboardPreview';
import CareerBoard from '../../components/academy/CareerBoard';
import NewsCard from '../../components/academy/NewsCard';
import EventRow from '../../components/academy/EventRow';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyHome() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<StudentDashboard | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const whyUs = useContentSection('home-why-us');
  const learningFeatures = useContentSection('learning-features');

  useEffect(() => {
    getPrograms().then(setPrograms).catch((err) => console.error('Failed to load programs', err));
    getJobs().then(setJobs).catch((err) => console.error('Failed to load jobs', err));
    getStudentCourses('demo-student').then(setCourses).catch((err) => console.error('Failed to load courses', err));
    getStudentDashboard('demo-student').then(setStats).catch((err) => console.error('Failed to load dashboard', err));
    getNews().then(setNews).catch((err) => console.error('Failed to load news', err));
    getEvents().then(setEvents).catch((err) => console.error('Failed to load events', err));
  }, []);

  return (
    <>
      <section className="hero">
        <NetworkMotif />
        <div className="wrap">
          <div>
            <div className="eyebrow">Fockis Academy · Est. Purpose-Built for Careers</div>
            <h1>Build Your Future at Fockis Academy</h1>
            <p className="lede">
              Career-focused education, innovative programs, and a community designed to help you succeed — on
              campus or online.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-gold" to="/academy/programs">Explore Programs</Link>
              <Link className="btn btn-ghost-light" to="/academy/admissions">Apply Now</Link>
            </div>
            <div className="hero-stats">
              <div><span>5,000+</span><small>Students</small></div>
              <div><span>100+</span><small>Programs & Certificates</small></div>
              <div><span>90%</span><small>Career/Transfer Success</small></div>
              <div><span>200+</span><small>Employer Partners</small></div>
            </div>
          </div>
          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop"
              alt="Students collaborating on a technology project"
            />
            <div className="tag">
              <div><strong>Cybersecurity Lab</strong><small>Fockis Technology Center</small></div>
              <span className="badge badge-gold">Live</span>
            </div>
          </div>
        </div>
      </section>

      <section className="quick-actions wrap">
        <div className="qa-grid">
          <QuickActionCard title="Apply" sub="Start your application." href="/academy/admissions" icon="doc" />
          <QuickActionCard title="Visit" sub="Explore Fockis Academy." href="/academy/contact" icon="pin" />
          <QuickActionCard title="Programs" sub="Find a program that fits your goals." href="/academy/programs" icon="book" />
          <QuickActionCard title="Financial Aid" sub="Tuition, scholarships, and aid." href="/academy/financial-aid" icon="coin" />
          <QuickActionCard title="Student Portal" sub="Access your academic resources." href="/academy/portal" icon="grid" />
          <QuickActionCard title="Contact" sub="Connect with admissions." href="/academy/contact" icon="mail" />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Programs</div>
            <h2>Explore Our Programs</h2>
            <p>Seven career-connected pathways built around real employer demand.</p>
          </div>
          <div className="grid grid-4">
            {programs.slice(0, 4).map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link className="btn btn-navy" to="/academy/programs">View All Programs</Link>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Why Fockis</div>
            <h2>Why Choose Fockis Academy?</h2>
            <p>A modern, career-connected approach to higher education.</p>
          </div>
          {whyUs.loading && <p style={{ color: '#B9C4CF' }}>Loading…</p>}
          {!whyUs.loading && whyUs.error && <p style={{ color: '#B9C4CF' }}>Couldn&apos;t load this section right now.</p>}
          {!whyUs.loading && !whyUs.error && (
            <div className="grid grid-3">
              {whyUs.items.map((w) => (
                <WhyCard key={w._id ?? w.title} title={w.title} desc={w.description ?? ''} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div className="eyebrow">Online Learning</div>
            <h2>Learn Anywhere. Build Your Future.</h2>
            <p style={{ marginTop: 16, fontSize: 16 }}>
              Take courses fully online with live classes, recorded lectures, digital textbooks, and direct
              instructor messaging — all inside Fockis Learn.
            </p>
            {!learningFeatures.loading && !learningFeatures.error && (
              <div className="grid grid-2" style={{ marginTop: 24 }}>
                {learningFeatures.items.slice(0, 8).map((i) => (
                  <div key={i._id ?? i.title} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
                    <span className="badge badge-gold" style={{ width: 8, height: 8, padding: 0, borderRadius: '50%' }}></span>
                    {i.title}
                  </div>
                ))}
              </div>
            )}
            <Link className="btn btn-navy" style={{ marginTop: 28, display: 'inline-flex' }} to="/academy/online-learning">
              Explore Online Learning
            </Link>
          </div>
          <div className="hero-visual" style={{ aspectRatio: '1 / 1', boxShadow: 'var(--shadow-l)' }}>
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=900&auto=format&fit=crop"
              alt="Student learning online on a laptop"
            />
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper-dim)' }}>
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Student Success</div>
            <h2>The Student Portal</h2>
            <p>A preview of what students see when they log in.</p>
          </div>
          <DashboardPreview stats={stats} courses={courses} />
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Career Center</div>
            <h2>Turn Education Into a Career</h2>
            <p>Internships, employer partners, and coaching built into every program.</p>
          </div>
          <CareerBoard jobs={jobs.slice(0, 3)} hideFilters />
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link className="btn btn-navy" to="/academy/career">View Career Center</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper-dim)' }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div className="eyebrow">News</div>
              <h2>Campus News</h2>
            </div>
            <Link className="btn btn-outline btn-sm" to="/academy/about">All News</Link>
          </div>
          <div className="grid grid-4">
            {news.map((n) => (
              <NewsCard key={n.title} item={n} />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Events</div>
            <h2>Upcoming Events</h2>
          </div>
          <div>
            {events.map((e) => (
              <EventRow key={e.title} event={e} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'linear-gradient(160deg, var(--navy-950), var(--navy-800))', color: '#fff', textAlign: 'center' }}>
        <div className="wrap">
          <h2 style={{ color: '#fff', fontSize: 'clamp(24px,3.4vw,36px)' }}>Your Future Starts With One Application</h2>
          <p style={{ color: '#C9D3DE', maxWidth: 520, margin: '16px auto 28px' }}>
            Join a community of students building real careers in technology, business, healthcare, and the skilled
            trades.
          </p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-gold" to="/academy/admissions">Start Your Application</Link>
            <Link className="btn btn-ghost-light" to="/academy/contact">Request Information</Link>
          </div>
        </div>
      </section>
    </>
  );
}
