import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import StepCard from '../../components/academy/StepCard';
import Accordion from '../../components/academy/Accordion';
import { useContentSection } from '../../lib/useContentSection';

// Purely navigational (not editorial content) — every link just routes to
// an existing page, so it's kept as static config rather than CMS content.
const LINKS: { label: string; href: string }[] = [
  { label: 'How to Apply', href: '/academy/admissions' },
  { label: 'Admission Requirements', href: '/academy/admissions' },
  { label: 'Application Deadlines', href: '/academy/admissions' },
  { label: 'Tuition & Fees', href: '/academy/financial-aid' },
  { label: 'Financial Aid', href: '/academy/financial-aid' },
  { label: 'Scholarships', href: '/academy/financial-aid' },
  { label: 'Transfer Students', href: '/academy/admissions' },
  { label: 'International Students', href: '/academy/admissions' },
  { label: 'Veterans', href: '/academy/admissions' },
  { label: 'Returning Students', href: '/academy/admissions' },
];

export default function AcademyAdmissions() {
  const steps = useContentSection('admissions-steps');
  const faq = useContentSection('admissions-faq');

  return (
    <>
      <PageHero
        crumb="Admissions"
        title="Your Journey Starts Here"
        subtitle="Everything you need to apply, enroll, and register for your first term at Fockis Academy."
      />
      <section className="section">
        <div className="wrap">
          <div className="grid grid-4" style={{ marginBottom: 48 }}>
            {LINKS.map((l) => (
              <Link className="card" style={{ padding: '18px 20px', fontWeight: 600, fontSize: 14.5 }} to={l.href} key={l.label}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="section-head">
            <div className="eyebrow">Process</div>
            <h2>Five Steps to Enrollment</h2>
          </div>
          {steps.loading && <p>Loading…</p>}
          {!steps.loading && steps.error && <p>Couldn&apos;t load this section right now.</p>}
          {!steps.loading && !steps.error && (
            <div className="steps-row">
              {steps.items.map((s, i) => (
                <StepCard key={s._id ?? s.title} step={`STEP ${i + 1}`} title={s.title} desc={s.description ?? ''} />
              ))}
            </div>
          )}

          <div className="divider"></div>

          <div className="section-head">
            <div className="eyebrow">Frequently Asked</div>
            <h2>Admission Requirements</h2>
          </div>
          {faq.loading && <p>Loading…</p>}
          {!faq.loading && faq.error && <p>Couldn&apos;t load this section right now.</p>}
          {!faq.loading && !faq.error && (
            <Accordion items={faq.items.map((f) => ({ q: f.title, a: f.description ?? '' }))} />
          )}

          <div style={{ marginTop: 36 }}>
            <Link className="btn btn-gold" to="/academy/contact">Start Your Application</Link>
          </div>
        </div>
      </section>
    </>
  );
}
