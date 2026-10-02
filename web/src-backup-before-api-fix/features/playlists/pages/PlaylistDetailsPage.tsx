import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { playlistsApi } from '../services/playlistsApi';
import type { Playlist } from '../types/playlist.types';
import { MediaMasthead } from '../components/MediaMasthead';
import { MediaFooter } from '../components/MediaFooter';
import { PlaylistAccessBadge } from '../components/PlaylistAccessBadge';
import { PlaylistPlayer } from '../components/PlaylistPlayer';
import { ErrorState, LockedState, SkeletonGrid } from '../components/StateViews';
import { HeartIcon, PlayIcon, ShareIcon, VerifiedIcon } from '../components/icons';
import { formatCount, formatDate, formatDuration, formatLongDuration } from '../utils/format';
import { useAuth } from '../hooks/useAuth';
import '../styles/Playlists.scss';

export function PlaylistDetailsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState(false);
  const [activeTrackId, setActiveTrackId] = useState<string | undefined>(undefined);
  const [unlocking, setUnlocking] = useState(false);

  const load = async () => {
    if (!slug) return;
    setError(false);
    setPlaylist(null);
    try {
      const data = await playlistsApi.getPlaylistBySlug(slug);
      setPlaylist(data);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const isLocked = !!playlist && playlist.access !== 'free' && !playlist.isPurchasedByCurrentUser && !playlist.isOwnedByCurrentUser;

  const handleUnlock = async () => {
    if (!playlist) return;
    setUnlocking(true);
    try {
      const result = await playlistsApi.unlockPlaylist(playlist.id);
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      await load();
    } finally {
      setUnlocking(false);
    }
  };

  const handleFavorite = async () => {
    if (!playlist) return;
    if (playlist.isFavoritedByCurrentUser) {
      await playlistsApi.unfavoritePlaylist(playlist.id);
    } else {
      await playlistsApi.favoritePlaylist(playlist.id);
    }
    await load();
  };

  const handleAddToLibrary = async () => {
    if (!playlist) return;
    await playlistsApi.addToLibrary(playlist.id);
    await load();
  };

  const handleShare = async () => {
    if (!playlist) return;
    const url = `${window.location.origin}/media/playlists/${playlist.slug}`;
    if (navigator.share) {
      await navigator.share({ title: playlist.title, url }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(url).catch(() => undefined);
    }
  };

  return (
    <div className="fk-root">
      <MediaMasthead />

      {error && (
        <div className="fk-container" style={{ padding: 'var(--fk-space-7) 0' }}>
          <ErrorState onRetry={load} />
        </div>
      )}

      {!error && !playlist && (
        <div className="fk-container" style={{ padding: 'var(--fk-space-7) 0' }}>
          <SkeletonGrid count={4} />
        </div>
      )}

      {playlist && (
        <>
          <section className="fk-details-hero">
            <div className="fk-container">
              <div className="fk-details-hero__grid">
                <div className="fk-details-hero__art">
                  <img src={playlist.coverImageUrl} alt="" />
                </div>

                <div>
                  <div className="fk-details-hero__type">
                    {playlist.contentType.replace('-', ' ')} &middot; {playlist.genre ?? 'Various'}
                  </div>
                  <h1 className="fk-details-hero__title">{playlist.title}</h1>

                  <Link to={`/media/producers/${playlist.creator.username}`} className="fk-details-hero__creator">
                    <img src={playlist.creator.avatarUrl} alt="" />
                    <span>{playlist.creator.displayName}</span>
                    {playlist.creator.verified && (
                      <span className="fk-verified" title="Verified producer"><VerifiedIcon /></span>
                    )}
                  </Link>

                  <p className="fk-details-hero__desc">{playlist.description}</p>

                  <div className="fk-details-hero__meta">
                    <div><strong>{playlist.trackCount}</strong>Tracks</div>
                    <div><strong>{formatLongDuration(playlist.totalDurationSeconds)}</strong>Duration</div>
                    <div><strong>{formatCount(playlist.followerCount)}</strong>Followers</div>
                    <div><strong>{formatDate(playlist.releaseDate)}</strong>Released</div>
                    <div><PlaylistAccessBadge access={playlist.access} price={playlist.price} currency={playlist.currency} size="lg" /></div>
                  </div>

                  <div className="fk-details-hero__actions">
                    {isLocked ? (
                      <>
                        <button type="button" className="fk-btn fk-btn--outline-inverse" onClick={() => setActiveTrackId(playlist.tracks.find((t) => !t.isLocked)?.id)}>
                          Preview
                        </button>
                        <button type="button" className="fk-btn fk-btn--gold" onClick={handleUnlock} disabled={unlocking}>
                          {unlocking ? 'Processing…' : `Unlock for ${playlist.price ? `$${playlist.price.toFixed(2)}` : 'access'}`}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="fk-btn fk-btn--gold"
                        onClick={() => setActiveTrackId(playlist.tracks[0]?.id)}
                      >
                        <PlayIcon width={16} height={16} /> {playlist.access === 'free' ? 'Play Now' : 'Play All'}
                      </button>
                    )}
                    <button type="button" className="fk-btn fk-btn--outline-inverse" onClick={handleAddToLibrary}>
                      Add to Library
                    </button>
                    <button
                      type="button"
                      className="fk-btn fk-btn--outline-inverse"
                      aria-pressed={!!playlist.isFavoritedByCurrentUser}
                      onClick={handleFavorite}
                    >
                      <HeartIcon width={16} height={16} filled={playlist.isFavoritedByCurrentUser} /> Favorite
                    </button>
                    {playlist.allowSharing && (
                      <button type="button" className="fk-btn fk-btn--outline-inverse" onClick={handleShare}>
                        <ShareIcon width={16} height={16} /> Share
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="fk-section">
            <div className="fk-container">
              {isLocked ? (
                <LockedState access={playlist.access} price={playlist.price} currency={playlist.currency} onUnlock={handleUnlock} />
              ) : (
                <>
                  <h2 className="fk-heading-md" style={{ marginBottom: 'var(--fk-space-4)' }}>Tracklist</h2>
                  <div className="fk-tracklist">
                    {playlist.tracks.map((track, i) => (
                      <button
                        key={track.id}
                        type="button"
                        className="fk-tracklist__row"
                        aria-current={activeTrackId === track.id}
                        disabled={track.isLocked}
                        onClick={() => setActiveTrackId(track.id)}
                      >
                        <span className="fk-tracklist__index">{i + 1}</span>
                        <span>
                          <div className="fk-tracklist__title">{track.title}</div>
                          <div className="fk-tracklist__artist">{track.artist}</div>
                        </span>
                        <span className="fk-tracklist__duration fk-data">{formatDuration(track.durationSeconds)}</span>
                        {track.isLocked && <PlaylistAccessBadge access={playlist.access} price={playlist.price} currency={playlist.currency} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {!isLocked && (
            <div className="fk-container" style={{ paddingBottom: 'var(--fk-space-7)' }}>
              <PlaylistPlayer
                playlist={playlist}
                initialTrackId={activeTrackId}
                onPlayRecorded={(trackId) => playlistsApi.recordPlay(playlist.id, trackId)}
              />
            </div>
          )}

          {!isAuthenticated && (
            <p className="fk-visually-hidden" role="status">
              Sign in to save this playlist to your library or purchase access.
            </p>
          )}
        </>
      )}

      <MediaFooter />
    </div>
  );
}

export default PlaylistDetailsPage;