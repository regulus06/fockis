/**
 * ProducerMusicPage.tsx
 *
 * Drop-in location: web/src/features/playlists/pages/ProducerMusicPage.tsx
 *
 * A page where a listener browses one producer's catalogue and pays to
 * unlock individual tracks (or the whole catalogue at once). Free tracks
 * play immediately; locked tracks show a price tag instead of a play button
 * until purchased.
 *
 * WIRING NOTES (things to connect to your real project):
 * - Replace `MOCK_PRODUCER` / `MOCK_TRACKS` with calls into your
 *   `playlistsApi.ts` (e.g. getProducer(id), getProducerTracks(id)).
 * - Replace `useAuth` import below with your real
 *   `features/playlists/hooks/useAuth.ts`.
 * - Replace the inline `purchaseTrack` / `purchaseAll` mock handlers with
 *   real payment calls (Stripe checkout, etc.) — they're written as async
 *   functions already so swapping the body is a one-line change.
 * - Types below (Track, Producer) should move into
 *   `features/playlists/types/playlist.types.ts` if they don't already
 *   have equivalents there.
 * - Formatting helpers (duration, play count, price) should move into
 *   `features/playlists/utils/format.ts`.
 */

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types — move to ../types/playlist.types.ts
// ---------------------------------------------------------------------------

export interface Producer {
  id: string;
  name: string;
  avatarUrl: string;
  coverUrl: string;
  tagline: string;
  followers: number;
  trackCount: number;
  bundlePriceCents: number; // price to unlock every locked track at once
}

export interface Track {
  id: string;
  title: string;
  album: string;
  coverUrl: string;
  durationSec: number;
  plays: number;
  genre: string;
  isFree: boolean;
  priceCents: number; // ignored if isFree
}

// ---------------------------------------------------------------------------
// Mock data — replace with playlistsApi calls
// ---------------------------------------------------------------------------

const MOCK_PRODUCER: Producer = {
  id: "prod_marlowe",
  name: "Marlowe Reyes",
  avatarUrl: "https://i.pravatar.cc/160?img=13",
  coverUrl:
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&q=80",
  tagline: "Producer · Soul, boom-bap & film scores",
  followers: 128_400,
  trackCount: 6,
  bundlePriceCents: 1499,
};

const MOCK_TRACKS: Track[] = [
  {
    id: "t1",
    title: "Amber Streetlight",
    album: "Night Sessions",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80",
    durationSec: 214,
    plays: 34_327,
    genre: "Soul",
    isFree: true,
    priceCents: 0,
  },
  {
    id: "t2",
    title: "Static & Silk",
    album: "Night Sessions",
    coverUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80",
    durationSec: 198,
    plays: 29_758,
    genre: "R&B",
    isFree: false,
    priceCents: 199,
  },
  {
    id: "t3",
    title: "Low Tide",
    album: "Coastline EP",
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80",
    durationSec: 204,
    plays: 28_370,
    genre: "Soundtrack",
    isFree: false,
    priceCents: 249,
  },
  {
    id: "t4",
    title: "Ninth Floor",
    album: "Coastline EP",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80",
    durationSec: 493,
    plays: 25_703,
    genre: "Boom Bap",
    isFree: false,
    priceCents: 299,
  },
  {
    id: "t5",
    title: "Paper Moths",
    album: "Night Sessions",
    coverUrl:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&q=80",
    durationSec: 187,
    plays: 18_204,
    genre: "Soul",
    isFree: false,
    priceCents: 199,
  },
  {
    id: "t6",
    title: "Rooftop, 4AM",
    album: "Coastline EP",
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80",
    durationSec: 231,
    plays: 12_998,
    genre: "Lo-fi",
    isFree: true,
    priceCents: 0,
  },
];

// ---------------------------------------------------------------------------
// Formatting helpers — move to ../utils/format.ts
// ---------------------------------------------------------------------------

function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPlays(plays: number): string {
  return plays.toLocaleString("en-US");
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProducerMusicPage() {
  const producer = MOCK_PRODUCER;
  const tracks = MOCK_TRACKS;

  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [catalogueUnlocked, setCatalogueUnlocked] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null);
  const [pendingBundle, setPendingBundle] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const lockedTracks = useMemo(
    () => tracks.filter((t) => !t.isFree && !purchasedIds.has(t.id)),
    [tracks, purchasedIds]
  );

  function isUnlocked(track: Track): boolean {
    return track.isFree || catalogueUnlocked || purchasedIds.has(track.id);
  }

  function handlePlay(track: Track) {
    if (!isUnlocked(track)) {
      setPendingTrack(track);
      return;
    }
    if (nowPlaying?.id === track.id) {
      setIsPlaying((p) => !p);
      return;
    }
    setNowPlaying(track);
    setIsPlaying(true);
  }

  // Replace body with a real payment call (Stripe Checkout / your billing API)
  async function purchaseTrack(track: Track) {
    setPurchasing(true);
    await new Promise((r) => setTimeout(r, 700));
    setPurchasedIds((prev) => new Set(prev).add(track.id));
    setPurchasing(false);
    setPendingTrack(null);
    setNowPlaying(track);
    setIsPlaying(true);
  }

  // Replace body with a real payment call for the full-catalogue bundle
  async function purchaseAll() {
    setPurchasing(true);
    await new Promise((r) => setTimeout(r, 900));
    setCatalogueUnlocked(true);
    setPurchasing(false);
    setPendingBundle(false);
  }

  return (
    <div className="producer-music-page">
      {/* ---------------- Cover / hero ---------------- */}
      <div
        className="producer-music-page__hero"
        style={{ backgroundImage: `url(${producer.coverUrl})` }}
      >
        <div className="producer-music-page__hero-scrim" />
        <div className="producer-music-page__hero-content">
          <img
            className="producer-music-page__avatar"
            src={producer.avatarUrl}
            alt={producer.name}
          />
          <div>
            <p className="producer-music-page__eyebrow">Producer catalogue</p>
            <h1 className="producer-music-page__name">{producer.name}</h1>
            <p className="producer-music-page__tagline">{producer.tagline}</p>
            <p className="producer-music-page__stats">
              {formatPlays(producer.followers)} followers · {producer.trackCount}{" "}
              tracks
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- Unlock-all banner ---------------- */}
      {!catalogueUnlocked && lockedTracks.length > 0 && (
        <div className="unlock-banner">
          <div>
            <p className="unlock-banner__title">
              Unlock all {lockedTracks.length} remaining tracks
            </p>
            <p className="unlock-banner__subtitle">
              One payment, full catalogue, yours to keep.
            </p>
          </div>
          <button
            className="btn btn--primary"
            onClick={() => setPendingBundle(true)}
          >
            Unlock all for {formatPrice(producer.bundlePriceCents)}
          </button>
        </div>
      )}

      {/* ---------------- Track list ---------------- */}
      <div className="track-list">
        <div className="track-list__header">
          <span>#</span>
          <span>Title</span>
          <span>Genre</span>
          <span>Plays</span>
          <span>Duration</span>
          <span />
        </div>

        {tracks.map((track, i) => {
          const unlocked = isUnlocked(track);
          const isCurrent = nowPlaying?.id === track.id;
          return (
            <div
              key={track.id}
              className={`track-row${unlocked ? "" : " track-row--locked"}${
                isCurrent ? " track-row--active" : ""
              }`}
            >
              <span className="track-row__index">{i + 1}</span>

              <button
                className="track-row__main"
                onClick={() => handlePlay(track)}
                aria-label={unlocked ? `Play ${track.title}` : `Unlock ${track.title}`}
              >
                <span className="track-row__art-wrap">
                  <img src={track.coverUrl} alt="" className="track-row__art" />
                  <span className="track-row__play-icon">
                    {unlocked ? (
                      isCurrent && isPlaying ? (
                        <PauseIcon />
                      ) : (
                        <PlayIcon />
                      )
                    ) : (
                      <LockIcon />
                    )}
                  </span>
                </span>
                <span className="track-row__text">
                  <span className="track-row__title">{track.title}</span>
                  <span className="track-row__album">{track.album}</span>
                </span>
              </button>

              <span className="track-row__genre">{track.genre}</span>
              <span className="track-row__plays">{formatPlays(track.plays)}</span>
              <span className="track-row__duration">
                {formatDuration(track.durationSec)}
              </span>

              <span className="track-row__action">
                {unlocked ? (
                  track.isFree ? (
                    <span className="pill pill--free">Free</span>
                  ) : (
                    <span className="pill pill--owned">Owned</span>
                  )
                ) : (
                  <button
                    className="btn btn--ghost btn--small"
                    onClick={() => setPendingTrack(track)}
                  >
                    {formatPrice(track.priceCents)}
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* ---------------- Player footer ---------------- */}
      {nowPlaying && (
        <div className="player-footer">
          <div className="player-footer__track">
            <img src={nowPlaying.coverUrl} alt="" />
            <div>
              <p className="player-footer__title">{nowPlaying.title}</p>
              <p className="player-footer__album">{nowPlaying.album}</p>
            </div>
          </div>
          <button
            className="player-footer__toggle"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="player-footer__time">
            {formatDuration(nowPlaying.durationSec)}
          </span>
        </div>
      )}

      {/* ---------------- Single-track purchase modal ---------------- */}
      {pendingTrack && (
        <PurchaseModal
          title={pendingTrack.title}
          subtitle={pendingTrack.album}
          coverUrl={pendingTrack.coverUrl}
          priceLabel={formatPrice(pendingTrack.priceCents)}
          busy={purchasing}
          onCancel={() => setPendingTrack(null)}
          onConfirm={() => purchaseTrack(pendingTrack)}
        />
      )}

      {/* ---------------- Bundle purchase modal ---------------- */}
      {pendingBundle && (
        <PurchaseModal
          title={`All of ${producer.name}'s catalogue`}
          subtitle={`${lockedTracks.length} tracks unlocked instantly`}
          coverUrl={producer.avatarUrl}
          priceLabel={formatPrice(producer.bundlePriceCents)}
          busy={purchasing}
          onCancel={() => setPendingBundle(false)}
          onConfirm={purchaseAll}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchase modal
// ---------------------------------------------------------------------------

function PurchaseModal({
  title,
  subtitle,
  coverUrl,
  priceLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  subtitle: string;
  coverUrl: string;
  priceLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true">
      <div className="modal">
        <img src={coverUrl} alt="" className="modal__art" />
        <p className="modal__eyebrow">Unlock to listen</p>
        <h2 className="modal__title">{title}</h2>
        <p className="modal__subtitle">{subtitle}</p>
        <div className="modal__price">{priceLabel}</div>
        <div className="modal__actions">
          <button className="btn btn--muted" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={onConfirm} disabled={busy}>
            {busy ? "Processing…" : "Pay & unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons — move to ../components/icons.tsx if not already present there
// ---------------------------------------------------------------------------

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 0 1 6 0v3z" />
    </svg>
  );
}
