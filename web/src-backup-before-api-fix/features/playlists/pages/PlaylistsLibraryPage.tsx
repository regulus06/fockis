import { useEffect, useState } from 'react';
import { playlistsApi } from '../services/playlistsApi';
import type { ContentType, LibraryTab, PlaylistSummary, SortOption } from '../types/playlist.types';
import { MediaMasthead } from '../components/MediaMasthead';
import { MediaFooter } from '../components/MediaFooter';
import { PlaylistCard } from '../components/PlaylistCard';
import { EmptyPlaylistsState, ErrorState, SkeletonGrid, UnauthorizedState } from '../components/StateViews';
import { GridIcon, ListIcon, SearchIcon } from '../components/icons';
import { useAuth } from '../hooks/useAuth';
import '../styles/Playlists.scss';

const TABS: { value: LibraryTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'music', label: 'Music' },
  { value: 'videos', label: 'Videos' },
  { value: 'purchased', label: 'Purchased' },
  { value: 'premium', label: 'Premium' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'recent', label: 'Recently Played' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'most-played', label: 'Most Played' },
  { value: 'top-rated', label: 'Highest Rated' },
  { value: 'price', label: 'Price' },
  { value: 'new-releases', label: 'New Releases' },
];

const CATEGORIES: { value: ContentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'music', label: 'Music' },
  { value: 'video', label: 'Videos' },
  { value: 'podcast', label: 'Podcasts' },
  { value: 'beats', label: 'Beats' },
  { value: 'dj-mix', label: 'DJ Mixes' },
  { value: 'album', label: 'Albums' },
  { value: 'collection', label: 'Producer Collections' },
];

export function PlaylistsLibraryPage() {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState<LibraryTab>('all');
  const [category, setCategory] = useState<ContentType | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('recent');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [items, setItems] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    if (!isAuthenticated) return;
    setError(false);
    setItems(null);
    try {
      const result = await playlistsApi.getMyLibrary({
        tab,
        contentType: category,
        sort,
        search: search || undefined,
      });
      setItems(result.items);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category, sort, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setTimeout(load, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="fk-root">
      <MediaMasthead />

      <section className="fk-section fk-section--tight" style={{ borderBottom: 'none' }}>
        <div className="fk-container">
          <div className="fk-eyebrow">My Library</div>
          <h1 className="fk-heading-lg">Your media collection</h1>
        </div>
      </section>

      <section className="fk-section" style={{ borderBottom: 'none', paddingTop: 0 }}>
        <div className="fk-container">
          {!isAuthenticated ? (
            <UnauthorizedState />
          ) : (
            <div className="fk-layout">
              <aside className="fk-sidebar" aria-label="Filter by category">
                <div className="fk-sidebar__group">
                  <div className="fk-sidebar__heading">Categories</div>
                  <ul className="fk-sidebar__list">
                    {CATEGORIES.map((c) => (
                      <li key={c.value}>
                        <button
                          type="button"
                          className="fk-sidebar__item"
                          aria-current={category === c.value}
                          onClick={() => setCategory(c.value)}
                        >
                          {c.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>

              <div>
                <div className="fk-category-scroll" role="tablist" aria-label="Filter by category">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      className="fk-category-scroll__chip"
                      aria-current={category === c.value}
                      onClick={() => setCategory(c.value)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="fk-tabs" role="tablist" aria-label="Library sections">
                  {TABS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      className="fk-tabs__tab"
                      aria-selected={tab === t.value}
                      onClick={() => setTab(t.value)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="fk-toolbar">
                  <div className="fk-search">
                    <SearchIcon />
                    <input
                      type="search"
                      placeholder="Search your library"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      aria-label="Search your library"
                    />
                  </div>
                  <select className="fk-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} aria-label="Sort by">
                    {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <div className="fk-view-toggle" role="group" aria-label="Layout">
                    <button type="button" aria-pressed={view === 'grid'} aria-label="Grid view" onClick={() => setView('grid')}>
                      <GridIcon width={16} height={16} />
                    </button>
                    <button type="button" aria-pressed={view === 'list'} aria-label="List view" onClick={() => setView('list')}>
                      <ListIcon width={16} height={16} />
                    </button>
                  </div>
                </div>

                {error && <ErrorState onRetry={load} />}

                {!error && items === null && <SkeletonGrid count={6} />}

                {!error && items && items.length === 0 && (
                  <EmptyPlaylistsState context={tab === 'favorites' ? 'favorites' : tab === 'premium' ? 'premium content' : 'playlists'} />
                )}

                {!error && items && items.length > 0 && (
                  <div className={`fk-grid${view === 'list' ? ' fk-grid--list' : ''}`}>
                    {items.map((playlist) => (
                      <PlaylistCard key={playlist.id} playlist={playlist} layout={view} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <MediaFooter />
    </div>
  );
}

export default PlaylistsLibraryPage;