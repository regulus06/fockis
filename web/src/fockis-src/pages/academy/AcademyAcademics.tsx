import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyAcademics() {
  const { items, loading, error } = useContentSection('academics-categories');

  return (
    <>
      <PageHero
        crumb="Academics"
        title="Academics at Fockis Academy"
        subtitle="Flexible credential pathways designed around where you want your career to go."
      />
      <section className="section">
        <div className="wrap">
          {loading && <p>Loading…</p>}
          {!loading && error && <p>Couldn&apos;t load this section right now.</p>}
          {!loading && !error && (
            <div className="grid grid-4">
              {items.map((c) => (
                <div className="card" style={{ padding: 24 }} key={c._id ?? c.title}>
                  <h3 style={{ fontSize: 16 }}>{c.title}</h3>
                  <p style={{ marginTop: 8, fontSize: 14 }}>
                    {c.description ?? `Explore ${c.title.toLowerCase()} across every Fockis Academy department.`}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link className="btn btn-navy" to="/academy/programs">Find Your Program</Link>
          </div>
        </div>
      </section>
    </>
  );
}
