import { useMemo, useState } from 'react';
import PageHero from '../../components/academy/PageHero';
import { FeatureCard, StateLine, asItems } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { useContentSection } from '../../lib/useContentSection';

/** /academy/library — CMS section "library-resources", searchable in place. */
export default function AcademyLibrary() {
  const { items, loading, error } = useContentSection('library-resources');
  const [q, setQ] = useState('');
  const list = asItems(items);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? list.filter((i) => `${i.title} ${i.description ?? ''}`.toLowerCase().includes(n)) : list;
  }, [list, q]);

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Resources" title="Fockis Digital Library" subtitle="E-books, journals, databases and research guides — available from anywhere." icon="book" />
      <div className="fa-container fa-section">
        <div className="fa-card fa-filterbar">
          <label className="fa-search fa-search--block">
            <Icon name="search" size={15} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search library resources..." aria-label="Search library resources" />
          </label>
          {!loading && !error && <small className="fa-muted">{shown.length} {shown.length === 1 ? 'resource' : 'resources'}</small>}
        </div>
        <div className="fa-section">
          <StateLine loading={loading} error={!loading && error} />
          {!loading && !error && shown.length === 0 && <div className="fa-state">{q ? `No resources match “${q}”.` : 'Nothing here yet — check back soon.'}</div>}
          {!loading && !error && (
            <div className="fa-fgrid fa-fgrid--3">
              {shown.map((c, i) => (
                <FeatureCard key={c._id ?? c.title} index={i} icon={['book', 'file', 'globe', 'layers', 'search', 'bookmark'][i % 6]} title={c.title} text={c.description} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
