import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyFinancialAid() {
  const tuition = useContentSection('tuition-rates');
  const options = useContentSection('financial-aid-options');

  return (
    <>
      <PageHero
        crumb="Admissions"
        title="Tuition & Financial Aid"
        subtitle="Understand the true cost of your education and the aid available to make it affordable."
      />
      <section className="section">
        <div className="wrap">
          {tuition.loading && <p>Loading tuition rates…</p>}
          {!tuition.loading && tuition.error && <p>Couldn&apos;t load tuition rates right now.</p>}
          {!tuition.loading && !tuition.error && (
            <div className="grid grid-3" style={{ marginBottom: 48 }}>
              {tuition.items.map((t) => (
                <div className="card tuition-card" key={t._id ?? t.title}>
                  <small className="mono" style={{ color: 'var(--gold-600)' }}>EXAMPLE — {t.title.toUpperCase()}</small>
                  <div className="price">{t.meta?.price ?? '—'}</div>
                  <p>{t.description}</p>
                  <div className="demo-note">Demo value for prototype only</div>
                </div>
              ))}
            </div>
          )}

          <div className="section-head">
            <div className="eyebrow">Aid Options</div>
            <h2>Ways to Pay for Fockis Academy</h2>
          </div>
          {options.loading && <p>Loading…</p>}
          {!options.loading && options.error && <p>Couldn&apos;t load this section right now.</p>}
          {!options.loading && !options.error && (
            <div className="grid grid-4">
              {options.items.map((t) => (
                <div className="card" style={{ padding: 22 }} key={t._id ?? t.title}>
                  <h3 style={{ fontSize: 15.5 }}>{t.title}</h3>
                  <p style={{ marginTop: 8, fontSize: 14 }}>Learn how {t.title.toLowerCase()} can reduce your out-of-pocket cost.</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link className="btn btn-navy" to="/academy/contact">Talk to Financial Aid</Link>
          </div>
        </div>
      </section>
    </>
  );
}
