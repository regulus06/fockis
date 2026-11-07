import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { FaModal, StateLine } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { Person } from '../../components/academy/market/Shared';
import { useAcademyLoad } from '../../lib/useAcademyLoad';
import { getFaculty, type AcademyFaculty as Fac } from '../../lib/academyApi';

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const role = (f: Fac) => str(f.title) || str(f.position) || str(f.pos);
const dept = (f: Fac) => str(f.department) || str(f.dept);
const bio = (f: Fac) => str(f.bio) || str(f.biography);
const photo = (f: Fac) => str(f.photoUrl) || str(f.imageUrl) || str(f.avatarUrl);

/** /academy/faculty — GET /academy/faculty, with department filter and profile dialog. */
export default function AcademyFaculty() {
  const { state, reload } = useAcademyLoad(getFaculty);
  const [q, setQ] = useState('');
  const [d, setD] = useState('All');
  const [open, setOpen] = useState<Fac | null>(null);

  const list = state.status === 'ready' ? state.data.filter((f) => f.isActive !== false) : [];
  const depts = useMemo(() => ['All', ...Array.from(new Set(list.map(dept).filter(Boolean) as string[]))], [list]);
  const shown = list.filter((f) => (d === 'All' || dept(f) === d) && `${f.name} ${role(f) ?? ''} ${dept(f) ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Instructors" title="Meet Our Instructors" subtitle="Professors, industry experts and program leaders across every Fockis Academy department." icon="users" actions={<Link className="fa-btn fa-btn--primary" to="/academy/teach">Become an Instructor</Link>} />
      <div className="fa-container fa-section">
        <div className="fa-card fa-filterbar">
          <label className="fa-search fa-search--block">
            <Icon name="search" size={15} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or subject" aria-label="Search instructors" />
          </label>
          <div className="fa-chips">
            {depts.map((x) => (
              <button key={x} className={`fa-chipbtn ${d === x ? 'is-on' : ''}`} onClick={() => setD(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <div className="fa-section">
          <StateLine loading={state.status === 'loading'} error={state.status === 'error' ? state.error : false} onRetry={reload} empty={state.status === 'ready' && shown.length === 0} />
          <div className="fa-fgrid fa-fgrid--4">
            {shown.map((f, i) => (
              <div key={String(f._id || f.id || f.name)} className="fa-card fa-person-card">
                {photo(f) ? <img src={photo(f)} alt="" /> : <Person look={{ skin: (i * 2) % 6, hair: i % 6, shirt: ['#1d5ee8', '#0b1f4d', '#7c3aed', '#0ea5a4'][i % 4], style: i % 2 ? 'long' : 'short', glasses: i % 3 === 0 }} size={80} />}
                <b>{f.name}</b>
                {role(f) && <p>{role(f)}</p>}
                {dept(f) && <span className="fa-badge tone-blue">{dept(f)}</span>}
                <button className="fa-btn fa-btn--outline fa-btn--xs" onClick={() => setOpen(f)}>
                  View Profile
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {open && (
        <FaModal title={open.name} onClose={() => setOpen(null)}>
          <div className="fa-profile">
            {photo(open) ? <img src={photo(open)} alt="" /> : <Person look={{ skin: 2, hair: 1, shirt: '#1d5ee8' }} size={84} />}
            <div>
              {role(open) && <b>{role(open)}</b>}
              {dept(open) && <p className="fa-muted">{dept(open)}</p>}
              {str(open.email) && (
                <p className="fa-muted">
                  <Icon name="message" size={13} /> {str(open.email)}
                </p>
              )}
            </div>
          </div>
          <p className="fa-muted fa-pre" style={{ marginTop: 14 }}>
            {bio(open) ?? 'This instructor hasn’t added a biography yet.'}
          </p>
        </FaModal>
      )}
    </div>
  );
}
