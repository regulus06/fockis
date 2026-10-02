import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { playlistsApi } from '../services/playlistsApi';
import type {
  AccessType,
  ContentType,
  Playlist,
  PlaylistSummary,
  Producer,
  ProducerCategory,
} from '../types/playlist.types';

import { MediaMasthead } from '../components/MediaMasthead';
import { MediaFooter } from '../components/MediaFooter';
import { PlaylistCard } from '../components/PlaylistCard';
import { ProducerCard } from '../components/ProducerCard';
import { CreatePlaylistModal } from '../components/CreatePlaylistModal';
import { ErrorState, SkeletonGrid } from '../components/StateViews';

import '../styles/Playlists.scss';

// ---------------------------------------------------------------------------
// Fockis Music navigation
// ---------------------------------------------------------------------------

const HERO_SUBNAV = [
  { to: '/music', label: 'Music' },
  { to: '/music', label: 'Videos' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/music', label: 'Producers' },
  { to: '/music', label: 'Premium' },
  { to: '/music/library', label: 'My Library' },
];

// ---------------------------------------------------------------------------
// Existing monetization content
// ---------------------------------------------------------------------------

const MONETIZE_CARDS = [
  {
    title: 'Sell Your Music',
    body: 'Publish tracks, albums, beats, mixes, and collections your way.',
  },
  {
    title: 'Sell Your Videos',
    body: 'Monetize music videos, productions, documentaries, and tutorials.',
  },
  {
    title: 'Build Your Audience',
    body: 'Grow followers and build a professional creator profile.',
  },
  {
    title: 'Keep Creating',
    body: 'Give your audience a reason to return with new releases.',
  },
];

// ---------------------------------------------------------------------------
// Music Home data
// ---------------------------------------------------------------------------

type MusicAccess = 'FREE' | 'PAID' | 'PREMIUM' | 'EXCLUSIVE';

interface HomeTrack {
  id: string;
  title: string;
  artist: string;
  cover: string;
  genre: string;
  access: MusicAccess;
  price?: number;
}

interface HomeRelease {
  id: string;
  title: string;
  artist: string;
  cover: string;
  releaseDate: string;
  access: MusicAccess;
  price?: number;
}

interface HomeProducer {
  id: string;
  name: string;
  avatar: string;
  genre: string;
  releaseCount: number;
  followers: string;
  verified: boolean;
}

interface HomePremiumItem {
  id: string;
  title: string;
  artist: string;
  cover: string;
  access: 'PREMIUM' | 'EXCLUSIVE';
  price: number;
  featured?: boolean;
}

const MOCK_TRACKS: HomeTrack[] = [
  {
    id: 't1',
    title: 'Summer Nights',
    artist: 'DJ Marcus',
    cover: 'https://picsum.photos/seed/t1/400/400',
    genre: 'Afrobeats',
    access: 'PAID',
    price: 2.99,
  },
  {
    id: 't2',
    title: 'Golden Hour',
    artist: 'Nadia Cole',
    cover: 'https://picsum.photos/seed/t2/400/400',
    genre: 'R&B',
    access: 'FREE',
  },
  {
    id: 't3',
    title: 'Midnight Drive',
    artist: 'Rue Alva',
    cover: 'https://picsum.photos/seed/t3/400/400',
    genre: 'Synthwave',
    access: 'PREMIUM',
    price: 4.99,
  },
  {
    id: 't4',
    title: 'Concrete Bloom',
    artist: 'Yusuf K',
    cover: 'https://picsum.photos/seed/t4/400/400',
    genre: 'Hip-Hop',
    access: 'PAID',
    price: 1.99,
  },
  {
    id: 't5',
    title: 'Velvet Room',
    artist: 'Sable & Wren',
    cover: 'https://picsum.photos/seed/t5/400/400',
    genre: 'Neo-Soul',
    access: 'EXCLUSIVE',
    price: 9.99,
  },
  {
    id: 't6',
    title: 'Static Bloom',
    artist: 'Anders Fjeld',
    cover: 'https://picsum.photos/seed/t6/400/400',
    genre: 'Electronic',
    access: 'FREE',
  },
];

const MOCK_RELEASES: HomeRelease[] = [
  {
    id: 'r1',
    title: 'Paper Skies',
    artist: 'Lior Mendes',
    cover: 'https://picsum.photos/seed/r1/400/400',
    releaseDate: 'Aug 28',
    access: 'PAID',
    price: 3.49,
  },
  {
    id: 'r2',
    title: 'Low Tide',
    artist: 'Coastline',
    cover: 'https://picsum.photos/seed/r2/400/400',
    releaseDate: 'Aug 26',
    access: 'FREE',
  },
  {
    id: 'r3',
    title: 'Amber Room',
    artist: 'Nadia Cole',
    cover: 'https://picsum.photos/seed/r3/400/400',
    releaseDate: 'Aug 24',
    access: 'PREMIUM',
    price: 5.99,
  },
  {
    id: 'r4',
    title: 'Marrow',
    artist: 'Kessler',
    cover: 'https://picsum.photos/seed/r4/400/400',
    releaseDate: 'Aug 21',
    access: 'PAID',
    price: 2.49,
  },
  {
    id: 'r5',
    title: 'Glasswing',
    artist: 'DJ Marcus',
    cover: 'https://picsum.photos/seed/r5/400/400',
    releaseDate: 'Aug 19',
    access: 'EXCLUSIVE',
    price: 8.99,
  },
  {
    id: 'r6',
    title: 'Hollow Bloom',
    artist: 'Rue Alva',
    cover: 'https://picsum.photos/seed/r6/400/400',
    releaseDate: 'Aug 17',
    access: 'FREE',
  },
];

const MOCK_PRODUCERS: HomeProducer[] = [
  {
    id: 'p1',
    name: 'DJ Marcus',
    avatar: 'https://i.pravatar.cc/200?img=12',
    genre: 'Afrobeats · Amapiano',
    releaseCount: 34,
    followers: '12.4K',
    verified: true,
  },
  {
    id: 'p2',
    name: 'Nadia Cole',
    avatar: 'https://i.pravatar.cc/200?img=47',
    genre: 'R&B · Neo-Soul',
    releaseCount: 21,
    followers: '8.9K',
    verified: true,
  },
  {
    id: 'p3',
    name: 'Rue Alva',
    avatar: 'https://i.pravatar.cc/200?img=33',
    genre: 'Synthwave',
    releaseCount: 17,
    followers: '6.1K',
    verified: false,
  },
  {
    id: 'p4',
    name: 'Sable & Wren',
    avatar: 'https://i.pravatar.cc/200?img=5',
    genre: 'Neo-Soul Duo',
    releaseCount: 12,
    followers: '5.4K',
    verified: true,
  },
  {
    id: 'p5',
    name: 'Kessler',
    avatar: 'https://i.pravatar.cc/200?img=52',
    genre: 'Alt Hip-Hop',
    releaseCount: 26,
    followers: '9.7K',
    verified: false,
  },
];

const MOCK_PREMIUM: HomePremiumItem[] = [
  {
    id: 'pm1',
    title: 'Wren House — Studio Sessions',
    artist: 'Sable & Wren',
    cover: 'https://picsum.photos/seed/pm1/700/900',
    access: 'EXCLUSIVE',
    price: 16.99,
    featured: true,
  },
  {
    id: 'pm2',
    title: 'Nightshade (Deluxe)',
    artist: 'Rue Alva',
    cover: 'https://picsum.photos/seed/pm2/500/500',
    access: 'PREMIUM',
    price: 12.99,
  },
  {
    id: 'pm3',
    title: 'Unreleased: Foundry Demos',
    artist: 'Kessler',
    cover: 'https://picsum.photos/seed/pm3/500/500',
    access: 'EXCLUSIVE',
    price: 6.99,
  },
  {
    id: 'pm4',
    title: 'Afterglow — Acoustic',
    artist: 'Nadia Cole',
    cover: 'https://picsum.photos/seed/pm4/500/500',
    access: 'PREMIUM',
    price: 4.99,
  },
];

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapAccess(access: MusicAccess): AccessType {
  switch (access) {
    case 'PAID':
      return 'paid';

    case 'PREMIUM':
      return 'premium';

    case 'EXCLUSIVE':
      return 'exclusive';

    case 'FREE':
    default:
      return 'free';
  }
}

function mapProducerCategory(
  producer: HomeProducer,
): ProducerCategory {
  if (producer.name === 'DJ Marcus') {
    return 'dj';
  }

  return 'recording-artist';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFollowers(value: string): number {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/,/g, '');

  if (normalized.endsWith('K')) {
    return Math.round(
      Number.parseFloat(normalized.slice(0, -1)) * 1000,
    );
  }

  if (normalized.endsWith('M')) {
    return Math.round(
      Number.parseFloat(normalized.slice(0, -1)) * 1_000_000,
    );
  }

  const parsed = Number.parseInt(normalized, 10);

  return Number.isFinite(parsed) ? parsed : 0;
}

function createProducer(
  producer: HomeProducer,
): Producer {
  return {
    id: producer.id,
    username: slugify(producer.name),
    displayName: producer.name,
    avatarUrl: producer.avatar,
    category: mapProducerCategory(producer),
    verified: producer.verified,
    followerCount: parseFollowers(producer.followers),
    releaseCount: producer.releaseCount,
    isFollowedByCurrentUser: false,
  };
}

function createPlaylistSummary(
  id: string,
  title: string,
  artist: string,
  coverImageUrl: string,
  access: MusicAccess,
  creator: Producer,
  genre?: string,
  price?: number,
): PlaylistSummary {
  const normalizedAccess = mapAccess(access);

  return {
    id,
    slug: slugify(title),
    title,
    description: `${title} by ${artist}. Discover this collection on Fockis Media.`,
    coverImageUrl,
    contentType: 'collection' satisfies ContentType,
    mediaKind: 'audio',
    genre,
    tags: genre ? [genre] : [],
    creator,
    access: normalizedAccess,
    price,
    currency: price !== undefined ? 'USD' : undefined,
    visibility: 'public',
    status: 'published',
    isFeatured: true,
    allowComments: true,
    allowSharing: true,
    releaseDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trackCount: 1,
    totalDurationSeconds: 0,
    playCount: 0,
    followerCount: creator.followerCount,
    favoriteCount: 0,
    rating: undefined,
    isFavoritedByCurrentUser: false,
    isPurchasedByCurrentUser: false,
    isOwnedByCurrentUser: false,
  };
}

// ---------------------------------------------------------------------------
// Build Music Home content into existing Playlist page data model.
// ---------------------------------------------------------------------------

function buildMusicPlaylists(): PlaylistSummary[] {
  const producerMap = new Map<string, Producer>();

  MOCK_PRODUCERS.forEach((producer) => {
    producerMap.set(
      producer.name,
      createProducer(producer),
    );
  });

  const fallbackProducer = createProducer({
    id: 'music-home-creator',
    name: 'Fockis Music',
    avatar: 'https://i.pravatar.cc/200?img=13',
    genre: 'Independent Music',
    releaseCount: 0,
    followers: '0',
    verified: true,
  });

  const getCreator = (
    artist: string,
  ): Producer => {
    return (
      producerMap.get(artist) ??
      fallbackProducer
    );
  };

  const tracks = MOCK_TRACKS.map((track) =>
    createPlaylistSummary(
      `music-track-${track.id}`,
      track.title,
      track.artist,
      track.cover,
      track.access,
      getCreator(track.artist),
      track.genre,
      track.price,
    ),
  );

  const releases = MOCK_RELEASES.map((release) =>
    createPlaylistSummary(
      `music-release-${release.id}`,
      release.title,
      release.artist,
      release.cover,
      release.access,
      getCreator(release.artist),
      undefined,
      release.price,
    ),
  );

  const premium = MOCK_PREMIUM.map((item) =>
    createPlaylistSummary(
      `music-premium-${item.id}`,
      item.title,
      item.artist,
      item.cover,
      item.access,
      getCreator(item.artist),
      undefined,
      item.price,
    ),
  );

  return [
    ...tracks,
    ...releases,
    ...premium,
  ];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PlaylistPage() {
  const [producers, setProducers] =
    useState<Producer[] | null>(null);

  const [featured, setFeatured] =
    useState<PlaylistSummary[] | null>(null);

  const [premium, setPremium] =
    useState<PlaylistSummary[] | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);

  const [createOpen, setCreateOpen] =
    useState(false);

  const musicData = useMemo(() => {
    const mappedProducers =
      MOCK_PRODUCERS.map(createProducer);

    const mappedPlaylists =
      buildMusicPlaylists();

    return {
      producers: mappedProducers,
      playlists: mappedPlaylists,
      premium: mappedPlaylists.filter(
        (playlist) =>
          playlist.access === 'premium' ||
          playlist.access === 'exclusive',
      ),
    };
  }, []);

  // ==========================================================================
  // LOAD DATA
  // ==========================================================================

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const [
        producerData,
        featuredData,
        premiumData,
      ] = await Promise.all([
        playlistsApi.getFeaturedProducers(),
        playlistsApi.getFeaturedPlaylists(),
        playlistsApi.getPremiumPlaylists(),
      ]);

      setProducers(
        producerData.length > 0
          ? producerData
          : musicData.producers,
      );

      setFeatured(
        featuredData.length > 0
          ? featuredData
          : musicData.playlists.slice(0, 8),
      );

      setPremium(
        premiumData.length > 0
          ? premiumData
          : musicData.premium.slice(0, 4),
      );
    } catch (err) {
      console.error(
        '[PlaylistPage] Failed to load playlist API data:',
        err,
      );

      setProducers(
        musicData.producers,
      );

      setFeatured(
        musicData.playlists.slice(0, 8),
      );

      setPremium(
        musicData.premium.slice(0, 4),
      );

      setError(false);
    } finally {
      setLoading(false);
    }
  }, [musicData]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // ==========================================================================
  // FAVORITE
  // ==========================================================================

  const handleFavorite = async (
    id: string,
  ) => {
    try {
      await playlistsApi.favoritePlaylist(id);
    } catch (err) {
      console.error(
        '[PlaylistPage] Failed to favorite playlist:',
        err,
      );
    }
  };

  // ==========================================================================
  // CREATED
  // ==========================================================================

  const handlePlaylistCreated = (
    _playlist: Playlist,
  ) => {
    setCreateOpen(false);
    void loadAll();
  };

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (error && !loading) {
    return (
      <div className="fk-root">
        <MediaMasthead />

        <main>
          <section className="fk-section">
            <div className="fk-container">
              <ErrorState
                onRetry={() => {
                  void loadAll();
                }}
              />
            </div>
          </section>
        </main>

        <MediaFooter />
      </div>
    );
  }

  // ==========================================================================
  // PAGE
  // ==========================================================================

  return (
    <div className="fk-root">
      <MediaMasthead />

      <main>

        {/* ================================================================
            HERO
        ================================================================ */}

        <section className="fk-hero">
          <div className="fk-container">

            <div className="fk-hero__grid">

              <div>

                <div className="fk-hero__eyebrow">
                  Fockis Media · Music
                </div>

                <h1 className="fk-hero__title">
                  Music collections,
                  <br />
                  curated your way.
                </h1>

                <p className="fk-hero__lede">
                  Discover playlists from independent
                  producers, build your own collections,
                  and access premium music and video
                  experiences on Fockis.
                </p>

                <div className="fk-hero__actions">

                  <button
                    type="button"
                    className="fk-btn fk-btn--gold"
                    onClick={() =>
                      setCreateOpen(true)
                    }
                  >
                    Create a Playlist
                  </button>

                  <Link
                    to="/music"
                    className="fk-btn fk-btn--outline-inverse"
                    aria-label="Open Fockis Music"
                  >
                    Explore Music
                  </Link>

                </div>

                <nav
                  aria-label="Media navigation"
                >
                  <ul className="fk-hero__subnav">

                    {HERO_SUBNAV.map(
                      (item, index) => (
                        <li
                          key={`${item.label}-${index}`}
                        >

                          <Link
                            to={item.to}
                            className="fk-hero__subnav-link"
                            aria-current={
                              item.label ===
                              'Music'
                                ? 'page'
                                : undefined
                            }
                          >
                            {item.label}
                          </Link>

                        </li>
                      ),
                    )}

                  </ul>
                </nav>

              </div>

              <aside
                className="fk-hero__panel"
                aria-label="Playlist statistics"
              >

                <div className="fk-hero__panel-title">
                  Fockis Media
                </div>

                <div className="fk-hero__stat">
                  <span>
                    Featured Producers
                  </span>

                  <span className="fk-hero__stat-value">
                    {loading
                      ? '—'
                      : producers?.length ?? 0}
                  </span>
                </div>

                <div className="fk-hero__stat">
                  <span>
                    Featured Playlists
                  </span>

                  <span className="fk-hero__stat-value">
                    {loading
                      ? '—'
                      : featured?.length ?? 0}
                  </span>
                </div>

                <div className="fk-hero__stat">
                  <span>
                    Premium Collections
                  </span>

                  <span className="fk-hero__stat-value">
                    {loading
                      ? '—'
                      : premium?.length ?? 0}
                  </span>
                </div>

                <div className="fk-hero__stat">
                  <span>
                    Creator Marketplace
                  </span>

                  <span className="fk-hero__stat-value">
                    LIVE
                  </span>
                </div>

              </aside>

            </div>

          </div>
        </section>

        {/* ================================================================
            FEATURED PRODUCERS
        ================================================================ */}

        <section className="fk-section">
          <div className="fk-container">

            <div className="fk-section-head">

              <div className="fk-section-head__text">

                <div className="fk-eyebrow">
                  The creators
                </div>

                <h2 className="fk-heading-lg">
                  Featured producers
                </h2>

                <p className="fk-body">
                  Discover the artists and producers
                  building collections across
                  Fockis Media.
                </p>

              </div>

              <Link
                to="/music"
                className="fk-btn fk-btn--outline fk-btn--sm"
                aria-label="Open Fockis Music producers"
              >
                View all producers
              </Link>

            </div>

            {loading ? (
              <SkeletonGrid count={4} />
            ) : producers &&
              producers.length > 0 ? (

              <div className="fk-producer-rail">

                {producers.map(
                  (producer) => (
                    <ProducerCard
                      key={producer.id}
                      producer={producer}
                    />
                  ),
                )}

              </div>

            ) : (

              <div className="fk-empty">

                <div className="fk-empty__title">
                  No featured producers yet
                </div>

                <p className="fk-empty__body">
                  New creators will appear
                  here as they publish their
                  work.
                </p>

              </div>

            )}

          </div>
        </section>

        {/* ================================================================
            FEATURED PLAYLISTS
        ================================================================ */}

        <section className="fk-section">
          <div className="fk-container">

            <div className="fk-section-head">

              <div className="fk-section-head__text">

                <div className="fk-eyebrow">
                  Curated collections
                </div>

                <h2 className="fk-heading-lg">
                  Featured playlists
                </h2>

                <p className="fk-body">
                  Find collections created by
                  Fockis producers and discover
                  your next favorite tracks.
                </p>

              </div>

              <Link
                to="/playlists"
                className="fk-btn fk-btn--outline fk-btn--sm"
              >
                Browse playlists
              </Link>

            </div>

            {loading ? (
              <SkeletonGrid count={8} />
            ) : featured &&
              featured.length > 0 ? (

              <div className="fk-grid">

                {featured.map(
                  (playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onFavorite={() => {
                        void handleFavorite(
                          playlist.id,
                        );
                      }}
                    />
                  ),
                )}

              </div>

            ) : (

              <div className="fk-empty">

                <div className="fk-empty__title">
                  No featured playlists yet
                </div>

                <p className="fk-empty__body">
                  Be one of the first creators
                  to publish a playlist on
                  Fockis.
                </p>

                <button
                  type="button"
                  className="fk-btn fk-btn--primary"
                  onClick={() =>
                    setCreateOpen(true)
                  }
                >
                  Create a Playlist
                </button>

              </div>

            )}

          </div>
        </section>

        {/* ================================================================
            PREMIUM PLAYLISTS
        ================================================================ */}

        <section className="fk-section fk-section--dark">
          <div className="fk-container">

            <div className="fk-section-head">

              <div className="fk-section-head__text">

                <div className="fk-eyebrow">
                  Premium access
                </div>

                <h2
                  className="fk-heading-lg"
                  style={{
                    color: '#fff',
                  }}
                >
                  Exclusive collections
                </h2>

                <p
                  className="fk-body"
                  style={{
                    color:
                      'rgba(255,255,255,0.72)',
                  }}
                >
                  Unlock premium and exclusive
                  collections from independent
                  artists and producers.
                </p>

              </div>

              <Link
                to="/music"
                className="fk-btn fk-btn--outline-inverse fk-btn--sm"
                aria-label="Open Fockis Music premium collections"
              >
                Explore Premium
              </Link>

            </div>

            {loading ? (
              <SkeletonGrid count={4} />
            ) : premium &&
              premium.length > 0 ? (

              <div className="fk-grid">

                {premium.map(
                  (playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      onFavorite={() => {
                        void handleFavorite(
                          playlist.id,
                        );
                      }}
                    />
                  ),
                )}

              </div>

            ) : (

              <div className="fk-empty fk-empty--dark">

                <div className="fk-empty__title">
                  Premium collections
                  are coming soon
                </div>

                <p className="fk-empty__body">
                  Producers will be able
                  to publish premium and
                  exclusive playlist
                  experiences here.
                </p>

              </div>

            )}

          </div>
        </section>

        {/* ================================================================
            MONETIZATION
        ================================================================ */}

        <section className="fk-section">
          <div className="fk-container">

            <div className="fk-section-head">

              <div className="fk-section-head__text">

                <div className="fk-eyebrow">
                  For producers
                </div>

                <h2 className="fk-heading-lg">
                  Turn your creativity
                  into revenue
                </h2>

                <p className="fk-body-lg">
                  Build your audience and create
                  new revenue opportunities by
                  publishing music, video, and
                  playlist collections on Fockis.
                </p>

              </div>

            </div>

            <div className="fk-monetize-grid">

              {MONETIZE_CARDS.map(
                (card, index) => (

                  <article
                    key={card.title}
                    className="fk-monetize-card"
                  >

                    <div className="fk-monetize-card__index">
                      {String(
                        index + 1,
                      ).padStart(2, '0')}
                    </div>

                    <h3 className="fk-monetize-card__title">
                      {card.title}
                    </h3>

                    <p className="fk-body">
                      {card.body}
                    </p>

                  </article>

                ),
              )}

            </div>

          </div>
        </section>

        {/* ================================================================
            CTA
        ================================================================ */}

        <section className="fk-section fk-section--tight">
          <div className="fk-container">

            <div className="fk-cta">

              <div>

                <div className="fk-eyebrow">
                  Start creating
                </div>

                <h2 className="fk-heading-md">
                  Have a collection
                  worth sharing?
                </h2>

                <p className="fk-body">
                  Create your first Fockis
                  playlist and start building
                  your audience.
                </p>

              </div>

              <button
                type="button"
                className="fk-btn fk-btn--primary"
                onClick={() =>
                  setCreateOpen(true)
                }
              >
                Create Playlist
              </button>

            </div>

          </div>
        </section>

      </main>

      <MediaFooter />

      {/* ================================================================
          CREATE PLAYLIST MODAL
      ================================================================ */}

      {createOpen && (
        <CreatePlaylistModal
          open={createOpen}
          onClose={() =>
            setCreateOpen(false)
          }
          onCreated={
            handlePlaylistCreated
          }
        />
      )}

    </div>
  );
}

export default PlaylistPage;