import { useEffect, useState } from 'react';
import { getPrograms } from '../../lib/academyApi';
import { Program } from '../../types/academy';
import PageHero from '../../components/academy/PageHero';
import ProgramsExplorer from '../../components/academy/ProgramsExplorer';

export default function AcademyPrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPrograms()
      .then(setPrograms)
      .catch((err) => {
        console.error('Failed to load programs', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        crumb="Academics"
        title="Explore Our Programs"
        subtitle="Seven career-connected pathways across technology, business, healthcare, and the trades."
      />
      {loading && (
        <section className="section"><div className="wrap"><p>Loading programs…</p></div></section>
      )}
      {!loading && error && (
        <section className="section">
          <div className="wrap">
            <p>Couldn&apos;t load programs right now. Please try again shortly.</p>
          </div>
        </section>
      )}
      {!loading && !error && programs.length > 0 && <ProgramsExplorer programs={programs} />}
    </>
  );
}
