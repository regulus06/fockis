import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { SectionHead, StateLine } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { themeFor } from '../../components/academy/market/FaCourseCard';
import { useAcademyLoad } from '../../lib/useAcademyLoad';
import { getCurriculum, getPrograms, type AcademyCurriculum, type AcademyProgram } from '../../lib/academyApi';

const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const pid = (p: AcademyProgram) => String(p.id || p._id || p.code || p.name);
const pdesc = (p: AcademyProgram) => s(p.description) || s(p.desc);
const plevel = (p: AcademyProgram) => s(p.level) || s(p.degree);
const pcat = (p: AcademyProgram) => s(p.cat) || s(p.department) || 'Other';
const ICON: Record<string, string> = { technology: 'cpu', business: 'chart', healthcare: 'heart', trades: 'tools' };

type Row = { code: string; name: string; credits: string };
function toRows(r: AcademyCurriculum | AcademyCurriculum[]): Row[] {
  const arr = Array.isArray(r) ? r : r?.courses ? (r.courses as unknown as AcademyCurriculum[]) : [r];
  return arr
    .filter(Boolean)
    .map((x) => ({ code: String(x.code || x.courseCode || ''), name: String(x.name || x.courseName || x.title || ''), credits: x.credits != null ? String(x.credits) : '' }))
    .filter((x) => x.code || x.name);
}

/** /academy/programs — GET /academy/programs and /academy/programs/:id/curriculum. */
export default function AcademyPrograms() {
  const { state, reload } = useAcademyLoad(getPrograms);
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useState('All');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [rowsErr, setRowsErr] = useState(false);

  const list = useMemo(() => (state.status === 'ready' ? state.data.filter((p) => p.isActive !== false) : []), [state]);
  const cats = useMemo(() => ['All', ...Array.from(new Set(list.map(pcat)))], [list]);
  const shown = cat === 'All' ? list : list.filter((p) => pcat(p) === cat);
  const selected = list.find((p) => pid(p) === params.get('program')) ?? list[0];

  useEffect(() => {
    if (!selected) return;
    let off = false;
    setRows(null);
    setRowsErr(false);
    getCurriculum(pid(selected))
      .then((r) => !off && setRows(toRows(r)))
      .catch(() => !off && (setRows([]), setRowsErr(true)));
    return () => {
      off = true;
    };
  }, [selected]);

  function pick(p: AcademyProgram) {
    const next = new URLSearchParams(params);
    next.set('program', pid(p));
    setParams(next, { replace: true });
    document.getElementById('program-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Programs" title="Explore Our Programs" subtitle="Career-connected pathways across technology, business, healthcare and the trades." icon="layers" actions={<Link className="fa-btn fa-btn--primary" to="/academy/admissions">Apply Now</Link>} />
      <div className="fa-container fa-section">
        <div className="fa-chips fa-chips--bar">
          {cats.map((c) => (
            <button key={c} className={`fa-chipbtn ${cat === c ? 'is-on' : ''}`} onClick={() => setCat(c)}>
              {c[0].toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
        <StateLine loading={state.status === 'loading'} error={state.status === 'error' ? state.error : false} onRetry={reload} empty={state.status === 'ready' && shown.length === 0} />
        <div className="fa-fgrid fa-fgrid--3">
          {shown.map((p) => (
            <button key={pid(p)} className={`fa-card fa-prog ${selected && pid(selected) === pid(p) ? 'is-on' : ''}`} onClick={() => pick(p)}>
              <span className="fa-prog__thumb" style={{ background: themeFor(pid(p)) }}>
                <Icon name={ICON[pcat(p).toLowerCase()] ?? 'cap'} size={28} stroke={1.5} />
              </span>
              <span className="fa-prog__body">
                {plevel(p) && <span className="fa-badge tone-blue">{plevel(p)}</span>}
                <b>{p.name}</b>
                {pdesc(p) && <small>{pdesc(p)}</small>}
                <em>
                  View curriculum <Icon name="right" size={12} />
                </em>
              </span>
            </button>
          ))}
        </div>

        {selected && (
          <section id="program-detail" className="fa-card fa-pad fa-section">
            <SectionHead eyebrow="Program detail" title={selected.name} sub={pdesc(selected)} />
            <div className="fa-meta fa-meta--wrap">
              {plevel(selected) && <span className="fa-chip"><Icon name="award" size={12} /> {plevel(selected)}</span>}
              <span className="fa-chip"><Icon name="layers" size={12} /> {pcat(selected)}</span>
            </div>
            <h4 className="fa-subhead">Curriculum</h4>
            {rows === null ? (
              <StateLine loading />
            ) : rows.length === 0 ? (
              <div className="fa-state">{rowsErr ? 'Curriculum details aren’t available right now.' : 'Curriculum details aren’t published for this program yet.'}</div>
            ) : (
              <div className="fa-tablewrap">
                <table className="fa-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Course</th>
                      <th>Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.code + r.name}>
                        <td><b>{r.code}</b></td>
                        <td>{r.name}</td>
                        <td>{r.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="fa-detail__btns">
              <Link className="fa-btn fa-btn--primary" to="/academy/admissions">Apply to This Program</Link>
              <Link className="fa-btn fa-btn--outline" to="/academy/contact">Request Info</Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
