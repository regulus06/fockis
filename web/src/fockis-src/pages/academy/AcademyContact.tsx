import PageHero from '../../components/academy/PageHero';
import ContactForm from '../../components/academy/ContactForm';

export default function AcademyContact() {
  return (
    <>
      <PageHero crumb="Contact" title="Contact Fockis Academy" subtitle="Reach the admissions office, request information, or find your way to campus." />
      <section className="section">
        <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <h3 style={{ marginBottom: 16 }}>Admissions Office</h3>
            <p>
              Fockis Academy
              <br />
              Admissions Office
              <br />
              1200 Innovation Way
              <br />
              Columbus, OH 43004
            </p>
            <p style={{ marginTop: 14 }}>
              Phone: (614) 555-0198
              <br />
              Email: admissions@fockisacademy.edu
            </p>
            <p style={{ marginTop: 14 }}>Office Hours: Mon–Fri, 8:00 AM – 6:00 PM</p>
            <div className="card" style={{ marginTop: 24, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)', fontSize: 13.5 }}>
              Map placeholder
            </div>
          </div>
          <div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
