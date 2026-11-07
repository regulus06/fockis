import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/employers — CMS section "employer-benefits". */
export default function AcademyEmployers() {
  const { items, loading, error } = useContentSection('employer-benefits');
  const list = asItems(items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="Employers"
        title="Partner With Fockis Academy"
        subtitle="Connect your organization with career-ready talent across high-demand fields."
        icon="briefcase"
        actions={<Link className="fa-btn fa-btn--primary" to="/academy/contact">Become an Employer Partner</Link>}
      />
      <div className="fa-container fa-section">
        <SectionHead eyebrow="Why partner" title="What employers get" />
        <StateLine loading={loading} error={!loading && error} empty={!loading && !error && list.length === 0} />
        {!loading && !error && (
          <div className="fa-fgrid fa-fgrid--3">
            {list.map((c, i) => (
              <FeatureCard key={c._id ?? c.title} index={i + 2} title={c.title} text={c.description} />
            ))}
          </div>
        )}
        <div className="fa-band">
          <div>
            <b>Hiring now?</b>
            <p>Post jobs and internships for Fockis students on the Career Center board.</p>
          </div>
          <div className="fa-band__btns">
            <Link className="fa-btn fa-btn--primary" to="/academy/career">Career Center</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
