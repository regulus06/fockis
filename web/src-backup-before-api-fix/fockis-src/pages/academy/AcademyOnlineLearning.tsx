import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyOnlineLearning() {
  const { items, loading, error } = useContentSection('learning-features');

  return (
    <>
      <PageHero crumb="Academics" title="Learn Anywhere. Build Your Future." subtitle="A complete online learning experience powered by Fockis Learn — our custom LMS." />
      <section className="section">
        <div className="wrap">
          {loading && <p>Loading…</p>}
          {!loading && error && <p>Couldn&apos;t load this section right now.</p>}
          {!loading && !error && (
            <div className="grid grid-4">
              {items.map((i) => (
                <div className="card" style={{ padding: 20 }} key={i._id ?? i.title}>
                  <h3 style={{ fontSize: 14.5 }}>{i.title}</h3>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link className="btn btn-gold" to="/academy/lms">Explore Fockis Learn</Link>
          </div>
        </div>
      </section>
    </>
  );
}
