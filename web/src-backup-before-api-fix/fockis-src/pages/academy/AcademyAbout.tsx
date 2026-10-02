import PageHero from '../../components/academy/PageHero';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyAbout() {
  const pillars = useContentSection('about-pillars');
  const facts = useContentSection('about-facts');
  const leadership = useContentSection('about-leadership');

  return (
    <>
      <PageHero crumb="About" title="About Fockis Academy" subtitle="A modern, career-focused institution built for students entering a changing workforce." />
      <section className="section">
        <div className="wrap">
          {pillars.loading && <p>Loading…</p>}
          {!pillars.loading && pillars.error && <p>Couldn&apos;t load this section right now.</p>}
          {!pillars.loading && !pillars.error && (
            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              {pillars.items.map((p) => (
                <div className="card" style={{ padding: 26 }} key={p._id ?? p.title}>
                  <h3>{p.title}</h3>
                  <p style={{ marginTop: 10 }}>{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {!facts.loading && !facts.error && (
            <div className="grid grid-3">
              {facts.items.map((f) => (
                <div className="card" style={{ padding: 24 }} key={f._id ?? f.title}>
                  <h3 style={{ fontSize: 15.5 }}>{f.title}</h3>
                  <p style={{ marginTop: 8, fontSize: 14 }}>{f.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="divider"></div>

          <div className="section-head">
            <div className="eyebrow">Leadership</div>
            <h2>Institutional Leadership</h2>
          </div>
          {leadership.loading && <p>Loading…</p>}
          {!leadership.loading && leadership.error && <p>Couldn&apos;t load this section right now.</p>}
          {!leadership.loading && !leadership.error && (
            <div className="grid grid-3">
              {leadership.items.map((l) => (
                <div className="card faculty-card" key={l._id ?? l.title}>
                  <div className="faculty-photo">{l.meta?.initials ?? l.title.slice(0, 2).toUpperCase()}</div>
                  <h3 style={{ fontSize: 15.5 }}>{l.title}</h3>
                  <p style={{ fontSize: 13.5, marginTop: 4 }}>{l.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
