import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/student-life — CMS section "student-life-items". */
export default function AcademyStudentLife() {
  const { items, loading, error } = useContentSection('student-life-items');
  const list = asItems(items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="Student Life"
        title="Life at Fockis Academy"
        subtitle="A community built around belonging, leadership, and hands-on experience — on campus and online."
        icon="users"
        actions={<Link className="fa-btn fa-btn--primary" to="/academy/calendar">See Upcoming Events</Link>}
      />
      <div className="fa-container fa-section">
        <StateLine loading={loading} error={!loading && error} empty={!loading && !error && list.length === 0} />
        {!loading && !error && (
          <div className="fa-fgrid fa-fgrid--3">
            {list.map((c, i) => (
              <FeatureCard key={c._id ?? c.title} index={i + 3} title={c.title} text={c.description} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
