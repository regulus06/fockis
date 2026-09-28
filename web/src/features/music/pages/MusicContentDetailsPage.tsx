import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { musicApi } from "../services/musicApi";
import { musicEntitlementApi } from "../services/musicEntitlementApi";
import { ContentAccessGate } from "../components/ContentAccessGate";
import MusicUnlockButton from "../components/MusicUnlockButton";
import type {
  MusicContent,
  MusicQueryResult,
  ResolvedAccess,
} from "../types/music.types";

import "../styles/MusicContentDetailsPage.scss";

// ============================================================================
// TYPES
// ============================================================================

type AccessResponse = ResolvedAccess;

type QueueItem = MusicContent & {
  id?: string;
  _id?: string | { $oid?: string };
};

type PlaybackPanelProps = {
  content: MusicContent;
  mode: "full" | "preview";
  onEnded?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

type AccessType =
  | "free"
  | "preview_paid"
  | "paid"
  | "premium"
  | "exclusive";

type QueueDirection = "next" | "previous";

// ============================================================================
// HELPERS
// ============================================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/+$/, "");

function getContentId(content: QueueItem | null | undefined): string {
  if (!content) return "";

  const directId =
    typeof content.id === "string"
      ? content.id
      : typeof content._id === "string"
        ? content._id
        : "";

  if (directId) return directId;

  if (
    content._id &&
    typeof content._id === "object" &&
    typeof content._id.$oid === "string"
  ) {
    return content._id.$oid;
  }

  return "";
}

function normalizeStorageUrl(value?: string | null): string {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `${window.location.protocol}${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${API_BASE_URL}${raw}`;
  }

  return `${API_BASE_URL}/${raw}`;
}

function resolveCoverUrl(content: QueueItem): string {
  const candidate =
    (content as any).coverImageUrl ||
    (content as any).thumbnailUrl ||
    (content as any).artworkUrl ||
    (content as any).posterUrl ||
    (content as any).coverUrl ||
    (content as any).coverImage?.url ||
    (content as any).coverImage?.storageKey ||
    (content as any).media?.thumbnailUrl ||
    (content as any).media?.coverImageUrl;

  return normalizeStorageUrl(candidate);
}

function getTitle(content: QueueItem): string {
  return (
    String(
      (content as any).title ||
        (content as any).name ||
        "Untitled",
    ).trim() || "Untitled"
  );
}

function getDescription(content: QueueItem): string {
  return String(
    (content as any).description ||
      (content as any).summary ||
      "",
  ).trim();
}

function getGenre(content: QueueItem): string {
  return String((content as any).genre || "").trim();
}

function getProducerName(content: QueueItem): string {
  const producer =
    (content as any).producer ||
    (content as any).creator ||
    (content as any).artist;

  if (typeof producer === "string") {
    return producer;
  }

  if (producer && typeof producer === "object") {
    return (
      String(
        producer.displayName ||
          producer.name ||
          producer.username ||
          producer.fullName ||
          "",
      ).trim() || "Fockis Creator"
    );
  }

  return "Fockis Creator";
}

function getAccessType(content: QueueItem): AccessType {
  const raw = String((content as any).accessType || "free").toLowerCase();

  if (
    raw === "free" ||
    raw === "preview_paid" ||
    raw === "paid" ||
    raw === "premium" ||
    raw === "exclusive"
  ) {
    return raw;
  }

  return "free";
}

function getPriceCents(content: QueueItem): number {
  const value = Number(
    (content as any).priceCents ??
      (content as any).price ??
      0,
  );

  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function getCurrency(content: QueueItem): string {
  const value = String(
    (content as any).currency ||
      "USD",
  )
    .trim()
    .toUpperCase();

  return value || "USD";
}

function getDurationSeconds(content: QueueItem): number | null {
  const value = Number(
    (content as any).durationSeconds ??
      (content as any).media?.durationSeconds ??
      0,
  );

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "";
  }

  const total = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      secs,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function formatPrice(
  priceCents: number,
  currency: string,
): string {
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return "Free";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(priceCents / 100);
  } catch {
    return `${currency} ${(priceCents / 100).toFixed(2)}`;
  }
}

function isVideo(content: QueueItem): boolean {
  const type = String(
    (content as any).type ||
      (content as any).mediaKind ||
      (content as any).kind ||
      "",
  ).toLowerCase();

  const mediaKind = String(
    (content as any).mediaKind ||
      "",
  ).toLowerCase();

  return (
    type.includes("video") ||
    type.includes("movie") ||
    type.includes("film") ||
    mediaKind.includes("video")
  );
}

function isAudio(content: QueueItem): boolean {
  const type = String(
    (content as any).type ||
      (content as any).mediaKind ||
      "",
  ).toLowerCase();

  return (
    type.includes("audio") ||
    type.includes("song") ||
    type.includes("track") ||
    type.includes("music") ||
    type.includes("album")
  );
}

function getQueueItems(
  response: MusicQueryResult | null | undefined,
): QueueItem[] {
  if (!response) return [];

  const source =
    (response as any).items ||
    (response as any).content ||
    (response as any).results ||
    (response as any).data ||
    [];

  if (!Array.isArray(source)) {
    return [];
  }

  const unique = new Map<string, QueueItem>();

  for (const item of source) {
    if (!item || typeof item !== "object") continue;

    const id = getContentId(item);

    if (!id) continue;

    unique.set(id, item as QueueItem);
  }

  return Array.from(unique.values());
}

// ============================================================================
// PLAYBACK PANEL
// ============================================================================

function PlaybackPanel({
  content,
  mode,
  onEnded,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: PlaybackPanelProps) {
  const contentId = getContentId(content);

  const [playbackUrl, setPlaybackUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPlaybackUrl() {
      if (!contentId) {
        setLoading(false);
        setError("This content does not have a valid ID.");
        return;
      }

      setLoading(true);
      setError("");
      setPlaybackUrl("");

      try {
        const result =
          await musicEntitlementApi.getPlaybackUrl(
            contentId,
          );

        if (cancelled) return;

        if (!result?.url) {
          throw new Error(
            "The server did not return an authorized playback URL.",
          );
        }

        setPlaybackUrl(result.url);
      } catch (err) {
        if (cancelled) return;

        console.error(
          "[MusicPlayback] Failed to load authorized playback URL:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to prepare playback.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlaybackUrl();

    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const title = getTitle(content);
  const video = isVideo(content);
  const audio = isAudio(content);

  const handleEnded = () => {
    onEnded?.();
  };

  if (loading) {
    return (
      <section className="music-content-details__player music-content-details__player--loading">
        <div className="music-content-details__player-spinner" />
        <p>
          {mode === "preview"
            ? "Preparing your preview…"
            : "Preparing secure playback…"}
        </p>
      </section>
    );
  }

  if (error || !playbackUrl) {
    return (
      <section className="music-content-details__player music-content-details__player--error">
        <div className="music-content-details__player-error-icon">
          !
        </div>

        <h3>Playback unavailable</h3>

        <p>
          {error ||
            "The authorized media URL could not be created."}
        </p>

        <button
          type="button"
          className="music-content-details__retry-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="music-content-details__player">
      <div className="music-content-details__player-media">
        {video ? (
          <video
            ref={(element) => {
              mediaRef.current = element;
            }}
            className="music-content-details__video"
            src={playbackUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onEnded={handleEnded}
          >
            Your browser does not support video playback.
          </video>
        ) : audio ? (
          <div className="music-content-details__audio-shell">
            <div className="music-content-details__audio-art">
              {resolveCoverUrl(content) ? (
                <img
                  src={resolveCoverUrl(content)}
                  alt=""
                />
              ) : (
                <span>♫</span>
              )}
            </div>

            <div className="music-content-details__audio-info">
              <strong>{title}</strong>

              <span>
                {mode === "preview"
                  ? "Preview"
                  : "Authorized playback"}
              </span>
            </div>

            <audio
              ref={(element) => {
                mediaRef.current = element;
              }}
              className="music-content-details__audio"
              src={playbackUrl}
              controls
              autoPlay
              preload="metadata"
              onEnded={handleEnded}
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : (
          <video
            ref={(element) => {
              mediaRef.current = element;
            }}
            className="music-content-details__video"
            src={playbackUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onEnded={handleEnded}
          >
            Your browser does not support media playback.
          </video>
        )}
      </div>

      <div className="music-content-details__player-footer">
        <div className="music-content-details__player-status">
          <span
            className={
              mode === "preview"
                ? "music-content-details__status music-content-details__status--preview"
                : "music-content-details__status music-content-details__status--full"
            }
          >
            {mode === "preview"
              ? "Preview"
              : "Authorized"}
          </span>

          <span className="music-content-details__secure-label">
            🔐 Secure playback
          </span>
        </div>

        <div className="music-content-details__player-navigation">
          <button
            type="button"
            className="music-content-details__player-nav"
            disabled={!hasPrevious}
            onClick={onPrevious}
            aria-label="Previous content"
          >
            ← Previous
          </button>

          <button
            type="button"
            className="music-content-details__player-nav"
            disabled={!hasNext}
            onClick={onNext}
            aria-label="Next content"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// QUEUE PREVIEW CARD
// ============================================================================

function QueuePreviewCard({
  content,
  index,
  active,
  onClick,
}: {
  content: QueueItem;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const cover = resolveCoverUrl(content);
  const duration = formatDuration(
    getDurationSeconds(content),
  );
  const accessType = getAccessType(content);

  return (
    <button
      type="button"
      className={[
        "music-content-details__queue-card",
        active
          ? "music-content-details__queue-card--active"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <span className="music-content-details__queue-card-number">
        {index + 1}
      </span>

      <span className="music-content-details__queue-card-art">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
          />
        ) : (
          <span>
            {isVideo(content) ? "▶" : "♫"}
          </span>
        )}
      </span>

      <span className="music-content-details__queue-card-info">
        <strong>{getTitle(content)}</strong>

        <span>
          {getProducerName(content)}
        </span>
      </span>

      <span className="music-content-details__queue-card-meta">
        {accessType !== "free" && (
          <span className="music-content-details__queue-paid">
            🔒
          </span>
        )}

        {duration && (
          <span>{duration}</span>
        )}
      </span>
    </button>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MusicContentDetailsPage() {
  const { id, contentId } = useParams<{
    id?: string;
    contentId?: string;
  }>();

  const navigate = useNavigate();

  const currentId = String(
    contentId || id || "",
  ).trim();

  const [content, setContent] =
    useState<MusicContent | null>(null);

  const [access, setAccess] =
    useState<AccessResponse | null>(null);

  const [queue, setQueue] =
    useState<QueueItem[]>([]);

  const [queueLoading, setQueueLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [purchaseRefreshKey, setPurchaseRefreshKey] =
    useState(0);

  const [autoNext, setAutoNext] =
    useState(true);

  const [activeQueueId, setActiveQueueId] =
    useState(currentId);

  const [queueDirection, setQueueDirection] =
    useState<QueueDirection | null>(null);

  const detailsRef =
    useRef<HTMLDivElement | null>(null);

  const queueItemRefs =
    useRef<Record<string, HTMLElement | null>>({});

  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------

  const isAuthenticated = useMemo(() => {
    const token =
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    return Boolean(token);
  }, []);

  // --------------------------------------------------------------------------
  // LOAD CURRENT CONTENT
  // --------------------------------------------------------------------------

  const loadContent = useCallback(
    async (targetId: string) => {
      if (!targetId) {
        setError("No music content was specified.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response =
          await musicApi.getById(targetId);

        if (!response?.content) {
          throw new Error(
            "Music content could not be found.",
          );
        }

        setContent(response.content);

        setAccess(
          response.access ?? null,
        );

        setActiveQueueId(targetId);
      } catch (err) {
        console.error(
          "[MusicDetails] Failed to load content:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this music content.",
        );

        setContent(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadContent(currentId);
  }, [currentId, loadContent]);

  // --------------------------------------------------------------------------
  // LOAD QUEUE
  // --------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadQueue() {
      setQueueLoading(true);

      try {
        /*
         * The Explore endpoint is intentionally used for the continuous
         * queue. The queue itself never grants access. Each selected item
         * still goes through ContentAccessGate + authorized playback.
         */
        const response =
          await musicApi.explore({
            limit: 50,
          } as any);

        if (cancelled) return;

        const items =
          getQueueItems(response);

        setQueue((previous) => {
          const map = new Map<string, QueueItem>();

          for (const item of previous) {
            const itemId = getContentId(item);

            if (itemId) {
              map.set(itemId, item);
            }
          }

          for (const item of items) {
            const itemId = getContentId(item);

            if (itemId) {
              map.set(itemId, item);
            }
          }

          if (
            content &&
            currentId &&
            !map.has(currentId)
          ) {
            map.set(
              currentId,
              content as QueueItem,
            );
          }

          return Array.from(map.values());
        });
      } catch (err) {
        console.warn(
          "[MusicDetails] Could not load continuous queue:",
          err,
        );

        /*
         * Queue failure should never prevent the current item from playing.
         */
        if (!cancelled && content) {
          setQueue([content as QueueItem]);
        }
      } finally {
        if (!cancelled) {
          setQueueLoading(false);
        }
      }
    }

    void loadQueue();

    return () => {
      cancelled = true;
    };
  }, [content, currentId]);

  // --------------------------------------------------------------------------
  // KEEP CURRENT ITEM IN QUEUE
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!content) return;

    const idValue = getContentId(
      content as QueueItem,
    );

    if (!idValue) return;

    setQueue((previous) => {
      if (
        previous.some(
          (item) =>
            getContentId(item) === idValue,
        )
      ) {
        return previous;
      }

      return [
        content as QueueItem,
        ...previous,
      ];
    });
  }, [content]);

  // --------------------------------------------------------------------------
  // QUEUE INDEX
  // --------------------------------------------------------------------------

  const currentQueueIndex = useMemo(() => {
    const index = queue.findIndex(
      (item) =>
        getContentId(item) === currentId,
    );

    return index >= 0 ? index : 0;
  }, [queue, currentId]);

  const previousItem = useMemo(() => {
    if (
      currentQueueIndex <= 0 ||
      queue.length === 0
    ) {
      return null;
    }

    return (
      queue[currentQueueIndex - 1] ||
      null
    );
  }, [queue, currentQueueIndex]);

  const nextItem = useMemo(() => {
    if (
      currentQueueIndex < 0 ||
      currentQueueIndex >= queue.length - 1
    ) {
      return null;
    }

    return (
      queue[currentQueueIndex + 1] ||
      null
    );
  }, [queue, currentQueueIndex]);

  // --------------------------------------------------------------------------
  // SCROLL TO QUEUE ITEM
  // --------------------------------------------------------------------------

  const scrollToQueueItem = useCallback(
    (targetId: string) => {
      const element =
        queueItemRefs.current[targetId];

      if (!element) return;

      setActiveQueueId(targetId);

      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [],
  );

  // --------------------------------------------------------------------------
  // CHANGE ITEM WITHOUT LEAVING MUSIC PAGE
  // --------------------------------------------------------------------------

  const openQueueItem = useCallback(
    async (
      item: QueueItem | null,
      direction?: QueueDirection,
    ) => {
      if (!item) return;

      const targetId =
        getContentId(item);

      if (!targetId) return;

      if (direction) {
        setQueueDirection(direction);
      }

      setActiveQueueId(targetId);

      /*
       * We intentionally keep the same route component mounted.
       * The URL is updated with replaceState instead of navigating away.
       */
      const nextUrl =
        `/music/content/${encodeURIComponent(
          targetId,
        )}`;

      window.history.replaceState(
        {},
        "",
        nextUrl,
      );

      window.dispatchEvent(
        new PopStateEvent("popstate"),
      );

      await loadContent(targetId);

      requestAnimationFrame(() => {
        scrollToQueueItem(targetId);
      });

      window.setTimeout(() => {
        setQueueDirection(null);
      }, 450);
    },
    [loadContent, scrollToQueueItem],
  );

  // --------------------------------------------------------------------------
  // NEXT
  // --------------------------------------------------------------------------

  const goNext = useCallback(() => {
    if (!nextItem) return;

    void openQueueItem(
      nextItem,
      "next",
    );
  }, [nextItem, openQueueItem]);

  // --------------------------------------------------------------------------
  // PREVIOUS
  // --------------------------------------------------------------------------

  const goPrevious = useCallback(() => {
    if (!previousItem) return;

    void openQueueItem(
      previousItem,
      "previous",
    );
  }, [previousItem, openQueueItem]);

  // --------------------------------------------------------------------------
  // AUTO NEXT
  // --------------------------------------------------------------------------

  const handleMediaEnded = useCallback(() => {
    if (!autoNext) {
      return;
    }

    if (!nextItem) {
      return;
    }

    void openQueueItem(
      nextItem,
      "next",
    );
  }, [
    autoNext,
    nextItem,
    openQueueItem,
  ]);

  // --------------------------------------------------------------------------
  // KEYBOARD CONTROLS
  // --------------------------------------------------------------------------

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target =
        event.target as HTMLElement | null;

      if (
        target &&
        (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable
        )
      ) {
        return;
      }

      if (
        event.key === "ArrowRight" &&
        nextItem
      ) {
        event.preventDefault();
        goNext();
      }

      if (
        event.key === "ArrowLeft" &&
        previousItem
      ) {
        event.preventDefault();
        goPrevious();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    nextItem,
    previousItem,
    goNext,
    goPrevious,
  ]);

  // --------------------------------------------------------------------------
  // INTERSECTION OBSERVER
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!queue.length) return;

    const elements = Object.values(
      queueItemRefs.current,
    ).filter(
      (element): element is HTMLElement =>
        Boolean(element),
    );

    if (!elements.length) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter(
              (entry) =>
                entry.isIntersecting,
            )
            .sort(
              (a, b) =>
                b.intersectionRatio -
                a.intersectionRatio,
            );

          const first = visible[0];

          if (!first) return;

          const targetId =
            first.target.getAttribute(
              "data-content-id",
            );

          if (!targetId) return;

          setActiveQueueId(targetId);
        },
        {
          threshold: [
            0.25,
            0.5,
            0.75,
          ],
          rootMargin:
            "-10% 0px -20% 0px",
        },
      );

    elements.forEach((element) =>
      observer.observe(element),
    );

    return () => {
      observer.disconnect();
    };
  }, [queue]);

  // --------------------------------------------------------------------------
  // PURCHASE
  // --------------------------------------------------------------------------

  const handlePurchased = useCallback(
    async () => {
      setPurchaseRefreshKey(
        (value) => value + 1,
      );

      if (!currentId) return;

      await loadContent(currentId);
    },
    [currentId, loadContent],
  );

  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------

  const handleRequireAuth =
    useCallback(() => {
      navigate("/login", {
        state: {
          from:
            window.location.pathname +
            window.location.search,
        },
      });
    }, [navigate]);

  // --------------------------------------------------------------------------
  // RENDER FULL
  // --------------------------------------------------------------------------

  const renderFull = useCallback(
    (): ReactNode => {
      if (!content) return null;

      return (
        <PlaybackPanel
          key={`full-${getContentId(
            content as QueueItem,
          )}-${purchaseRefreshKey}`}
          content={content}
          mode="full"
          onEnded={handleMediaEnded}
          onPrevious={goPrevious}
          onNext={goNext}
          hasPrevious={Boolean(
            previousItem,
          )}
          hasNext={Boolean(
            nextItem,
          )}
        />
      );
    },
    [
      content,
      purchaseRefreshKey,
      handleMediaEnded,
      goPrevious,
      goNext,
      previousItem,
      nextItem,
    ],
  );

  // --------------------------------------------------------------------------
  // RENDER PREVIEW
  // --------------------------------------------------------------------------

  const renderPreview = useCallback(
    (): ReactNode => {
      if (!content) return null;

      return (
        <div className="music-content-details__preview-wrapper">
          <PlaybackPanel
            key={`preview-${getContentId(
              content as QueueItem,
            )}-${purchaseRefreshKey}`}
            content={content}
            mode="preview"
            onEnded={handleMediaEnded}
            onPrevious={goPrevious}
            onNext={goNext}
            hasPrevious={Boolean(
              previousItem,
            )}
            hasNext={Boolean(
              nextItem,
            )}
          />

          <div className="music-content-details__preview-notice">
            <span>🎧</span>

            <div>
              <strong>
                Preview mode
              </strong>

              <p>
                Purchase this content to
                unlock full playback.
              </p>
            </div>
          </div>

          <MusicUnlockButton
            contentId={currentId}
            priceCents={getPriceCents(
              content as QueueItem,
            )}
            currency={getCurrency(
              content as QueueItem,
            )}
            isAuthenticated={
              isAuthenticated
            }
            onRequireAuth={
              handleRequireAuth
            }
            onPurchased={
              handlePurchased
            }
          />
        </div>
      );
    },
    [
      content,
      purchaseRefreshKey,
      handleMediaEnded,
      goPrevious,
      goNext,
      previousItem,
      nextItem,
      currentId,
      isAuthenticated,
      handleRequireAuth,
      handlePurchased,
    ],
  );

  // --------------------------------------------------------------------------
  // RENDER LOCKED
  // --------------------------------------------------------------------------

  const renderLocked = useCallback(
    (): ReactNode => {
      if (!content) return null;

      return (
        <section className="music-content-details__locked">
          <div className="music-content-details__locked-icon">
            🔒
          </div>

          <h2>
            This content is locked
          </h2>

          <p>
            Checkout is required before
            you can play this content.
          </p>

          <MusicUnlockButton
            contentId={currentId}
            priceCents={getPriceCents(
              content as QueueItem,
            )}
            currency={getCurrency(
              content as QueueItem,
            )}
            isAuthenticated={
              isAuthenticated
            }
            onRequireAuth={
              handleRequireAuth
            }
            onPurchased={
              handlePurchased
            }
          />
        </section>
      );
    },
    [
      content,
      currentId,
      isAuthenticated,
      handleRequireAuth,
      handlePurchased,
    ],
  );

  // --------------------------------------------------------------------------
  // CONTENT TYPE
  // --------------------------------------------------------------------------

  const musicAccessType =
    content
      ? getAccessType(
          content as QueueItem,
        )
      : "free";

  const coverUrl = content
    ? resolveCoverUrl(
        content as QueueItem,
      )
    : "";

  const title = content
    ? getTitle(
        content as QueueItem,
      )
    : "Music";

  const producerName = content
    ? getProducerName(
        content as QueueItem,
      )
    : "Fockis Creator";

  const description = content
    ? getDescription(
        content as QueueItem,
      )
    : "";

  const genre = content
    ? getGenre(
        content as QueueItem,
      )
    : "";

  const duration = content
    ? formatDuration(
        getDurationSeconds(
          content as QueueItem,
        ),
      )
    : "";

  // --------------------------------------------------------------------------
  // LOADING
  // --------------------------------------------------------------------------

  if (loading && !content) {
    return (
      <main className="music-content-details music-content-details--loading">
        <div className="music-content-details__loading">
          <div className="music-content-details__spinner" />

          <h2>
            Loading music…
          </h2>

          <p>
            Preparing the content and
            checking your access.
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------------------------------
  // ERROR
  // --------------------------------------------------------------------------

  if (error && !content) {
    return (
      <main className="music-content-details music-content-details--error">
        <section className="music-content-details__error">
          <div className="music-content-details__error-icon">
            !
          </div>

          <h1>
            Music content unavailable
          </h1>

          <p>{error}</p>

          <div className="music-content-details__error-actions">
            <button
              type="button"
              onClick={() =>
                void loadContent(
                  currentId,
                )
              }
            >
              Try again
            </button>

            <Link to="/music">
              Back to Music
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!content) {
    return null;
  }

  // --------------------------------------------------------------------------
  // MAIN
  // --------------------------------------------------------------------------

  return (
    <main
      ref={detailsRef}
      className={[
        "music-content-details",
        queueDirection
          ? `music-content-details--${queueDirection}`
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ================================================================== */}
      {/* TOP NAVIGATION                                                     */}
      {/* ================================================================== */}

      <header className="music-content-details__topbar">
        <Link
          to="/music"
          className="music-content-details__back"
        >
          ←
          <span>
            Back to Music
          </span>
        </Link>

        <div className="music-content-details__topbar-center">
          <span>
            {isVideo(content)
              ? "Music Video"
              : "Music"}
          </span>

          {queue.length > 0 && (
            <span>
              {currentQueueIndex + 1} /{" "}
              {queue.length}
            </span>
          )}
        </div>

        <label className="music-content-details__autonext">
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(event) =>
              setAutoNext(
                event.target.checked,
              )
            }
          />

          <span>
            Auto-next
          </span>
        </label>
      </header>

      {/* ================================================================== */}
      {/* HERO                                                               */}
      {/* ================================================================== */}

      <section className="music-content-details__hero">
        <div className="music-content-details__hero-art">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title}
            />
          ) : (
            <div className="music-content-details__hero-placeholder">
              {isVideo(content)
                ? "▶"
                : "♫"}
            </div>
          )}
        </div>

        <div className="music-content-details__hero-info">
          <div className="music-content-details__eyebrow">
            {isVideo(content)
              ? "VIDEO"
              : "MUSIC"}
          </div>

          <h1>{title}</h1>

          <p className="music-content-details__producer">
            {producerName}
          </p>

          <div className="music-content-details__metadata">
            {genre && (
              <span>{genre}</span>
            )}

            {duration && (
              <span>{duration}</span>
            )}

            <span>
              {musicAccessType ===
              "free"
                ? "Free"
                : formatPrice(
                    getPriceCents(
                      content as QueueItem,
                    ),
                    getCurrency(
                      content as QueueItem,
                    ),
                  )}
            </span>
          </div>

          {description && (
            <p className="music-content-details__description">
              {description}
            </p>
          )}
        </div>
      </section>

      {/* ================================================================== */}
      {/* NEXT / PREVIOUS BAR                                                */}
      {/* ================================================================== */}

      <nav className="music-content-details__navigation">
        <button
          type="button"
          className="music-content-details__navigation-button"
          disabled={!previousItem}
          onClick={goPrevious}
        >
          <span>←</span>

          <span>
            <small>
              Previous
            </small>

            <strong>
              {previousItem
                ? getTitle(
                    previousItem,
                  )
                : "None"}
            </strong>
          </span>
        </button>

        <div className="music-content-details__navigation-position">
          <strong>
            {currentQueueIndex + 1}
          </strong>

          <span>
            /
          </span>

          <span>
            {Math.max(
              queue.length,
              1,
            )}
          </span>
        </div>

        <button
          type="button"
          className="music-content-details__navigation-button music-content-details__navigation-button--next"
          disabled={!nextItem}
          onClick={goNext}
        >
          <span>
            <small>
              Next
            </small>

            <strong>
              {nextItem
                ? getTitle(
                    nextItem,
                  )
                : "End of queue"}
            </strong>
          </span>

          <span>→</span>
        </button>
      </nav>

      {/* ================================================================== */}
      {/* CURRENT PLAYER                                                     */}
      {/* ================================================================== */}

      <section className="music-content-details__player-section">
        <div className="music-content-details__section-heading">
          <div>
            <span>
              NOW PLAYING
            </span>

            <h2>{title}</h2>
          </div>

          {access?.level ===
            "full" && (
            <span className="music-content-details__access-status music-content-details__access-status--full">
              ✓ Full access
            </span>
          )}
        </div>

        <ContentAccessGate
          key={`${currentId}-${purchaseRefreshKey}`}
          contentId={currentId}
          accessType={musicAccessType}
          renderFull={renderFull}
          renderPreview={renderPreview}
          renderLocked={renderLocked}
        />
      </section>

      {/* ================================================================== */}
      {/* CONTINUOUS QUEUE                                                   */}
      {/* ================================================================== */}

      <section className="music-content-details__queue">
        <div className="music-content-details__queue-header">
          <div>
            <span>
              CONTINUOUS PLAY
            </span>

            <h2>
              Up next
            </h2>
          </div>

          {queueLoading ? (
            <span>
              Loading queue…
            </span>
          ) : (
            <span>
              {queue.length} items
            </span>
          )}
        </div>

        {queue.length > 0 ? (
          <div className="music-content-details__queue-list">
            {queue.map(
              (
                item,
                index,
              ) => {
                const itemId =
                  getContentId(item);

                const active =
                  itemId ===
                  activeQueueId;

                return (
                  <div
                    key={itemId}
                    ref={(element) => {
                      queueItemRefs.current[
                        itemId
                      ] = element;
                    }}
                    data-content-id={
                      itemId
                    }
                    className={[
                      "music-content-details__queue-item",
                      active
                        ? "music-content-details__queue-item--active"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <QueuePreviewCard
                      content={item}
                      index={index}
                      active={active}
                      onClick={() =>
                        void openQueueItem(
                          item,
                        )
                      }
                    />
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="music-content-details__queue-empty">
            <p>
              No additional content is
              available right now.
            </p>
          </div>
        )}
      </section>

      {/* ================================================================== */}
      {/* BOTTOM NAVIGATION                                                  */}
      {/* ================================================================== */}

      <footer className="music-content-details__bottom-navigation">
        <button
          type="button"
          disabled={!previousItem}
          onClick={goPrevious}
        >
          ← Previous
        </button>

        <button
          type="button"
          disabled={!nextItem}
          onClick={goNext}
        >
          Next →
        </button>
      </footer>
    </main>
  );
}