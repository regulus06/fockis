import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Program, ProgramCategory, CurriculumRow } from '../../types/academy';
import { getCurriculum } from '../../lib/academyApi';
import ProgramCard from './ProgramCard';

const CATEGORIES: (ProgramCategory | 'all')[] = ['all', 'technology', 'business', 'healthcare', 'trades'];

export default function ProgramsExplorer({ programs }: { programs: Program[] }) {
  const [searchParams] = useSearchParams();
  const initialProgram = searchParams.get('program') ?? programs[0]?.id ?? '';
  const [filter, setFilter] = useState<ProgramCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState(initialProgram);
  const [rows, setRows] = useState<CurriculumRow[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  const filtered = useMemo(
    () => (filter === 'all' ? programs : programs.filter((p) => p.cat === filter)),
    [filter, programs]
  );

  const selected = programs.find((p) => p.id === selectedId) ?? programs[0];

  useEffect(() => {
    if (!selected) return;
    setLoadingCurriculum(true);
    getCurriculum(selected.id)
      .then(setRows)
      .catch((err) => {
        console.error(`Failed to load curriculum for ${selected.id}`, err);
        setRows([]);
      })
      .finally(() => setLoadingCurriculum(false));
  }, [selected]);

  return (
    <>
      <section className="section">
        <div className="wrap">
          <div className="filter-row">
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>
                {c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <div className="grid grid-3">
            {filtered.map((p) => (
              <ProgramCard key={p.id} program={p} onClick={() => setSelectedId(p.id)} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--paper-dim)' }} id="program-detail">
        <div className="wrap">
          <div className="section-head">
            <div className="eyebrow">Program Detail</div>
            <h2>{selected?.name}</h2>
            <p>{selected?.desc}</p>
          </div>
          <div className="grid grid-3">
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 15 }}>Degree Path</h3>
              <p style={{ marginTop: 8, fontSize: 14 }}>Associate of Applied Science → Bachelor&apos;s Completion</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 15 }}>Format</h3>
              <p style={{ marginTop: 8, fontSize: 14 }}>On-campus, online, and hybrid sections available</p>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 15 }}>Est. Duration</h3>
              <p style={{ marginTop: 8, fontSize: 14 }}>2 years (Associate) · 4 years (Bachelor&apos;s)</p>
            </div>
          </div>
          <h3 style={{ margin: '32px 0 16px', fontSize: 17 }}>Sample Curriculum</h3>
          {loadingCurriculum ? (
            <p>Loading curriculum…</p>
          ) : rows.length === 0 ? (
            <p>Curriculum details aren&apos;t available for this program yet.</p>
          ) : (
            <table>
              <thead><tr><th>Code</th><th>Course</th><th>Credits</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td className="mono">{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-gold" to="/academy/admissions">Apply to This Program</Link>
            <Link className="btn btn-outline" to="/academy/contact">Request Info</Link>
          </div>
        </div>
      </section>
    </>
  );
}
