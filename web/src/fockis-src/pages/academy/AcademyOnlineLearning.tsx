import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, SectionHead, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/online-learning — CMS section "learning-features". */
export default function AcademyOnlineLearning() {
  const { items, loading, error } = useContentSection('learning-features');
  const list = asItems(items);

  return (
    <div className="fa-root fa-page">
      <PageHero
        crumb="Academics"
        title="Learn Anywhere. Build Your Future."
        subtitle="Courses, live classes, seminars and certificates — a complete online learning experience on Fockis Academy."
        icon="monitor"
        actions={
          <>
            <Link className="fa-btn fa-btn--primary" to="/academy/learn">Explore Courses</Link>
            <Link className="fa-btn fa-btn--white" to="/academy/portal">My Learning</Link>
          </>
        }
      />
      <div className="fa-container fa-section">
        <SectionHead eyebrow="Features" title="Everything you need to learn online" />
        <StateLine loading={loading} error={!loading && error} empty={!loading && !error && list.length === 0} />
        {!loading && !error && (
          <div className="fa-fgrid fa-fgrid--4">
            {list.map((c, i) => (
              <FeatureCard key={c._id ?? c.title} index={i} title={c.title} text={c.description} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
