import { useEffect, useState } from 'react';
import { playlistsApi } from '../services/playlistsApi';
import type { PlaylistSummary, Producer } from '../types/playlist.types';
import { MediaMasthead } from '../components/MediaMasthead';
import { MediaFooter } from '../components/MediaFooter';
import { PlaylistCard } from '../components/PlaylistCard';
import { ProducerCard } from '../components/ProducerCard';
import { EmptyPlaylistsState, ErrorState, SkeletonGrid, UnauthorizedState } from '../components/StateViews';
import { useAuth } from '../hooks/useAuth';
import '../styles/Playlists.scss';

export function MyFavoritePlaylistsPage() {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<PlaylistSummary[] | null>(null);
  const [favoriteProducers, setFavoriteProducers] = useState<Producer[] | null>(null);
  const [recent, setRecent] = useState<PlaylistSummary[] | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    if (!isAuthenticated) return;
    setError(false);
    setFavorites(null);
    setFavoriteProducers(null);
    setRecent(null);
    try {
      const [favData, producerData, recentData] = await Promise.all([
        playlistsApi.getMyFavorites(),
        playlistsApi.getMyFavoriteProducers(),
        playlistsApi.getMyRecentlyPlayed(),
      ]);
      setFavorites(favData);
      setFavoriteProducers(producerData);
      setRecent(recentData);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const premiumFavorites = favorites?.filter((p) => p.access === 'premium' || p.access === 'exclusive') ?? [];

  return (
    <div className="fk-root">
      <MediaMasthead />

      <section className="fk-section fk-section--tight" style={{ borderBottom: 'none' }}>
        <div className="fk-container">
          <div className="fk-eyebrow">Saved</div>
          <h1 className="fk-heading-lg">Favorites</h1>
        </div>
      </section>

      <div className="fk-container">
        {!isAuthenticated ? (
          <UnauthorizedState />
        ) : error ? (
          <ErrorState onRetry={load} />
        ) : (
          <>
            <section className="fk-section" style={{ paddingTop: 0 }}>
              <div className="fk-section-head">
                <div className="fk-section-head__text">
                  <h2 className="fk-heading-md">Favorite Playlists</h2>
                </div>
              </div>
              {favorites === null ? (
                <SkeletonGrid count={4} />
              ) : favorites.length === 0 ? (
                <EmptyPlaylistsState context="favorites" />
              ) : (
                <div className="fk-grid">
                  {favorites.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
                </div>
              )}
            </section>

            <section className="fk-section">
              <div className="fk-section-head">
                <div className="fk-section-head__text">
                  <h2 className="fk-heading-md">Favorite Producers</h2>
                </div>
              </div>
              {favoriteProducers === null ? (
                <div className="fk-producer-rail" aria-hidden="true">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="fk-skeleton" style={{ height: 260, borderRadius: 10 }} />
                  ))}
                </div>
              ) : favoriteProducers.length === 0 ? (
                <EmptyPlaylistsState context="favorite producers" />
              ) : (
                <div className="fk-producer-rail">
                  {favoriteProducers.map((producer) => <ProducerCard key={producer.id} producer={producer} />)}
                </div>
              )}
            </section>

            <section className="fk-section">
              <div className="fk-section-head">
                <div className="fk-section-head__text">
                  <h2 className="fk-heading-md">Recently Played</h2>
                </div>
              </div>
              {recent === null ? (
                <SkeletonGrid count={4} />
              ) : recent.length === 0 ? (
                <EmptyPlaylistsState context="recently played media" />
              ) : (
                <div className="fk-grid">
                  {recent.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
                </div>
              )}
            </section>

            <section className="fk-section" style={{ borderBottom: 'none' }}>
              <div className="fk-section-head">
                <div className="fk-section-head__text">
                  <h2 className="fk-heading-md">Saved Premium Content</h2>
                </div>
              </div>
              {favorites === null ? (
                <SkeletonGrid count={4} />
              ) : premiumFavorites.length === 0 ? (
                <EmptyPlaylistsState context="premium content" />
              ) : (
                <div className="fk-grid">
                  {premiumFavorites.map((p) => <PlaylistCard key={p.id} playlist={p} />)}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <MediaFooter />
    </div>
  );
}

export default MyFavoritePlaylistsPage;