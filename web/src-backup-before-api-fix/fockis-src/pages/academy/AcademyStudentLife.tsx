import PageHero from '../../components/academy/PageHero';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyStudentLife() {
  const { items, loading, error } = useContentSection('student-life-items');

  return (
    <>
      <PageHero crumb="Student Life" title="Life at Fockis Academy" subtitle="A campus community built around belonging, leadership, and hands-on experience." />
      <section className="section">
        <div className="wrap">
          {loading && <p>Loading…</p>}
          {!loading && error && <p>Couldn&apos;t load this section right now.</p>}
          {!loading && !error && (
            <div className="grid grid-3">
              {items.map((i) => (
                <div className="card" style={{ padding: 24 }} key={i._id ?? i.title}>
                  <h3 style={{ fontSize: 16 }}>{i.title}</h3>
                  {i.description && <p style={{ marginTop: 8, fontSize: 14 }}>{i.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
