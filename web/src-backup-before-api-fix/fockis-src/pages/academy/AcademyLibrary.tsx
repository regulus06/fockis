import PageHero from '../../components/academy/PageHero';
import LibrarySearch from '../../components/academy/LibrarySearch';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyLibrary() {
  const { items, loading, error } = useContentSection('library-resources');

  return (
    <>
      <PageHero crumb="Resources" title="Fockis Digital Library" subtitle="Search thousands of academic resources from anywhere." />
      <section className="section">
        <div className="wrap">
          <LibrarySearch />
          {loading && <p>Loading…</p>}
          {!loading && error && <p>Couldn&apos;t load this section right now.</p>}
          {!loading && !error && (
            <div className="grid grid-3">
              {items.map((i) => (
                <div className="card" style={{ padding: 22 }} key={i._id ?? i.title}>
                  <h3 style={{ fontSize: 15.5 }}>{i.title}</h3>
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
