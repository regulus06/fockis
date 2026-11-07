import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FaAccordion, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { useContentSection } from '../../lib/useContentSection';

// Purely navigational — every link routes to an existing page.
const LINKS: { label: string; href: string; icon: string }[] = [
  { label: 'How to Apply', href: '#steps', icon: 'clipboard' },
  { label: 'Admission Requirements', href: '#faq', icon: 'checkCircle' },
  { label: 'Tuition & Fees', href: '/academy/financial-aid', icon: 'dollar' },
  { label: 'Financial Aid & Scholarships', href: '/academy/financial-aid', icon: 'wallet' },
  { label: 'Programs', href: '/academy/programs', icon: 'layers' },
  { label: 'Online Learning', href: '/academy/online-learning', icon: 'monitor' },
  { label: 'Academic Calendar', href: '/academy/calendar', icon: 'calendar' },
  { label: 'Contact Admissions', href: '/academy/contact', icon: 'message' },
];

/** /academy/admissions — CMS sections "admissions-steps" and "admissions-faq". */
export default function AcademyAdmissions() {
  const steps = useContentSection('admissions-steps');
  const faq = useContentSection('admissions-faq');
  const stepList = asItems(steps.items);
  const faqList = asItems(faq.items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="Admissions"
        title="Your Journey Starts Here"
        subtitle="Everything you need to apply, enroll, and register for your first term at Fockis Academy."
        icon="clipboard"
        actions={
          <>
            <Link className="fa-btn fa-btn--primary" to="/academy/contact">Start Your Application</Link>
            <Link className="fa-btn fa-btn--white" to="/academy/financial-aid">Tuition & Aid</Link>
          </>
        }
      />
      <div className="fa-container fa-section">
        <div className="fa-linkgrid">
          {LINKS.map((l) =>
            l.href.startsWith('#') ? (
              <a key={l.label} className="fa-card fa-linkcard" href={l.href}>
                <Icon name={l.icon} size={18} /> {l.label} <Icon name="right" size={14} />
              </a>
            ) : (
              <Link key={l.label} className="fa-card fa-linkcard" to={l.href}>
                <Icon name={l.icon} size={18} /> {l.label} <Icon name="right" size={14} />
              </Link>
            ),
          )}
        </div>

        <div id="steps" className="fa-section">
          <SectionHead eyebrow="Process" title="Steps to Enrollment" />
          <StateLine loading={steps.loading} error={!steps.loading && steps.error} empty={!steps.loading && !steps.error && stepList.length === 0} />
          {!steps.loading && !steps.error && (
            <ol className="fa-steps">
              {stepList.map((s, i) => (
                <li key={s._id ?? s.title} className="fa-card">
                  <span className="fa-steps__n">{i + 1}</span>
                  <b>{s.title}</b>
                  {s.description && <p>{s.description}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div id="faq" className="fa-section fa-two-col">
          <SectionHead eyebrow="Frequently asked" title="Admission Requirements" sub="Can't find your answer? Our admissions team replies within one business day." action={<Link className="fa-btn fa-btn--outline fa-btn--sm" to="/academy/contact">Ask a question</Link>} />
          <div>
            <StateLine loading={faq.loading} error={!faq.loading && faq.error} empty={!faq.loading && !faq.error && faqList.length === 0} />
            {!faq.loading && !faq.error && <FaAccordion items={faqList.map((f) => ({ q: f.title, a: f.description ?? '' }))} />}
          </div>
        </div>
      </div>
    </div>
  );
}
