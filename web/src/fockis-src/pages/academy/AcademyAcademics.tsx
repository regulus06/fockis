import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/academics — credential pathways from CMS section "academics-categories". */
export default function AcademyAcademics() {
  const { items, loading, error } = useContentSection('academics-categories');
  const list = asItems(items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="Academics"
        title="Academics at Fockis Academy"
        subtitle="Flexible credential pathways designed around where you want your career to go."
        icon="cap"
        actions={<Link className="fa-btn fa-btn--primary" to="/academy/programs">Find Your Program</Link>}
      />
      <div className="fa-container fa-section">
        <SectionHead eyebrow="Pathways" title="Choose how you learn" sub="Every pathway connects to Fockis Academy courses, live classes and certificates." />
        <StateLine loading={loading} error={!loading && error} empty={!loading && !error && list.length === 0} />
        {!loading && !error && (
          <div className="fa-fgrid fa-fgrid--4">
            {list.map((c, i) => (
              <FeatureCard key={c._id ?? c.title} index={i} title={c.title} text={c.description ?? `Explore ${c.title.toLowerCase()} across every Fockis Academy department.`} />
            ))}
          </div>
        )}
        <div className="fa-band">
          <div>
            <b>Not sure where to start?</b>
            <p>Browse all published courses or talk to an advisor.</p>
          </div>
          <div className="fa-band__btns">
            <Link className="fa-btn fa-btn--primary" to="/academy/learn">Browse Courses</Link>
            <Link className="fa-btn fa-btn--white" to="/academy/contact">Talk to an Advisor</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
