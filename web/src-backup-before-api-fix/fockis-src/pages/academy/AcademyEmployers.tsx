import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyEmployers() {
  const { items, loading, error } = useContentSection('employer-benefits');

  return (
    <>
      <PageHero crumb="Employers" title="Partner With Fockis Academy" subtitle="Connect your organization with career-ready talent across seven high-demand fields." />
      <section className="section">
        <div className="wrap">
          {loading && <p>Loading…</p>}
          {!loading && error && <p>Couldn&apos;t load this section right now.</p>}
          {!loading && !error && (
            <div className="grid grid-3">
              {items.map((i) => (
                <div className="card" style={{ padding: 22 }} key={i._id ?? i.title}>
                  <h3 style={{ fontSize: 15.5 }}>{i.title}</h3>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link className="btn btn-gold" to="/academy/contact">Become an Employer Partner</Link>
          </div>
        </div>
      </section>
    </>
  );
}
