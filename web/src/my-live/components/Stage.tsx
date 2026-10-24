import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CameraOff,
  ChevronDown,
  ChevronRight,
  Forward,
  Gamepad2,
  Gift,
  Heart,
  Loader2,
  MessageCircle,
  MicOff,
  SendHorizontal,
  ShieldAlert,
  Smile,
  WifiOff,
  X,
} from "lucide-react";

import type {
  ChatMessage,
  ConnectionQuality,
  DeviceState,
  Guest,
  GuestLayout,
  Phase,
  Scene,
  Product,
  SentGift,
  StreamInfo,
  StudioSourceState,
} from "../types";

import type { RemoteVideoTrack } from "livekit-client";

import { Avatar } from "./ui/Primitives";
import { formatCount } from "../utils";

/* ============================================================================
   HEARTS — only float when the real like count goes up.
   ============================================================================ */

const HEART_COLORS = ["#ff4d6d", "#2f7bff", "#ff8fab", "#5596ff", "#ffffff"];

function HeartsField({ likes }: { likes: number }) {
  const [hearts, setHearts] = useState<
    { id: number; left: number; color: string; drift: number; duration: number }[]
  >([]);

  const previousLikesRef = useRef(likes);
  const counterRef = useRef(0);

  useEffect(() => {
    const delta = likes - previousLikesRef.current;
    previousLikesRef.current = likes;

    if (delta <= 0) return;

    const burst = Math.min(delta, 6);
    const next = Array.from({ length: burst }, () => {
      counterRef.current += 1;
      return {
        id: counterRef.current,
        left: 10 + Math.random() * 60,
        color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
        drift: (Math.random() - 0.5) * 40,
        duration: 2400 + Math.random() * 1200,
      };
    });

    setHearts((current) => [...current.slice(-14), ...next]);
  }, [likes]);

  return (
    <div className="hearts-field" aria-hidden="true">
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="hearts-field__heart"
          style={{
            left: `${heart.left}%`,
            color: heart.color,
            animationDuration: `${heart.duration}ms`,
            ["--drift" as string]: `${heart.drift}px`,
          }}
          onAnimationEnd={() =>
            setHearts((current) => current.filter((item) => item.id !== heart.id))
          }
        >
          <Heart size={22} fill="currentColor" strokeWidth={0} />
        </span>
      ))}
    </div>
  );
}

function GiftToast({ gifts }: { gifts: SentGift[] }) {
  const last = gifts[gifts.length - 1];

  if (!last) return null;

  return (
    <div className="gift-toast" key={last.id} role="status">
      <span className="gift-toast__icon" aria-hidden="true">{last.giftIcon}</span>
      <span className="gift-toast__text">
        <strong>{last.username}</strong> sent a {last.giftLabel}
      </span>
    </div>
  );
}

function FeaturedProductCard({
  product,
  onDismiss,
}: {
  product: Product;
  onDismiss: () => void;
}) {
  return (
    <div className="product-slot-card">
      <button
        className="product-slot-card__dismiss"
        onClick={onDismiss}
        aria-label="Stop featuring this product"
        type="button"
      >
        <X size={12} />
      </button>

      <div className={`product-slot-card__thumb product-slot-card__thumb--${product.imageTone}`} />

      <div className="product-slot-card__info">
        <span className="product-slot-card__name">{product.name}</span>
        <span className="product-slot-card__meta">
          {product.rating > 0 && (
            <span className="product-slot-card__rating">★ {product.rating}</span>
          )}
          <span className="product-slot-card__price">{product.price}</span>
        </span>
        <span className="product-slot-card__tag">Featured for viewers</span>
      </div>
    </div>
  );
}

/* ============================================================================
   LIVE COMMENTS OVERLAY (real chat, newest at the bottom)
   ============================================================================ */

function LiveChatOverlay({ messages }: { messages: ChatMessage[] }) {
  // Newest first, matching the chat panel.
  const recent = messages.slice(-5).reverse();

  if (recent.length === 0) return null;

  return (
    <ul className="stage-comments" aria-label="Recent comments">
      {recent.map((message) => (
        <li className="stage-comment" key={message.id}>
          <Avatar name={message.username} tone={message.avatarTone} size="md" />
          <span className="stage-comment__body">
            <span className="stage-comment__meta">
              <strong>{message.username}</strong>
              {message.timestamp && <span> · {message.timestamp}</span>}
            </span>
            <span className="stage-comment__text">{message.message}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================================
   REMOTE GUEST VIDEO
   ============================================================================ */

function GuestRemoteVideo({ track }: { track: RemoteVideoTrack }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    track.attach(video);
    void video.play().catch(() => {});

    return () => {
      try {
        track.detach(video);
      } catch {
        // Ignore detach errors during unmount.
      }
    };
  }, [track]);

  return <video ref={videoRef} autoPlay muted playsInline className="stage-fill-video" />;
}

function findGuestTrack(
  guest: Guest,
  guestTracks: Record<string, RemoteVideoTrack>,
) {
  const username = String(guest.username ?? "").toLowerCase();

  const identity = Object.keys(guestTracks).find(
    (key) =>
      key === guest.id ||
      key === guest.username ||
      (!!username && key.toLowerCase().includes(username)),
  );

  return identity ? guestTracks[identity] : undefined;
}

function GuestTile({
  guest,
  guestTracks,
  className,
}: {
  guest: Guest;
  guestTracks: Record<string, RemoteVideoTrack>;
  className: string;
}) {
  const track = findGuestTrack(guest, guestTracks);

  return (
    <div className={className}>
      {track ? (
        <GuestRemoteVideo track={track} />
      ) : (
        <div className="stage-tile-placeholder">
          <Avatar name={guest.name} tone={guest.avatarTone} size="lg" src={guest.avatarUrl} />
          <span>Waiting for video…</span>
        </div>
      )}
      <span className="stage-tile-name">
        {guest.status === "muted" && <MicOff size={11} aria-label="Muted" />}
        {guest.name}
      </span>
    </div>
  );
}

/* ============================================================================
   STAGE
   ============================================================================ */

interface StageProps {
  phase: Phase;
  devices: DeviceState;
  connection: ConnectionQuality;
  viewers: number;
  likes: number;
  comments?: number;
  shares?: number;
  chatMessages: ChatMessage[];
  giftFeed: SentGift[];
  featuredProduct: Product | null;
  unfeatureProduct: () => void;
  streamInfo: StreamInfo;
  guests: Guest[];
  guestLayout: GuestLayout;
  activeScene: Scene | null;
  screenStream: MediaStream | null;
  sourceState: StudioSourceState;

  // Real logged-in user
  username: string;
  avatarUrl?: string;

  // Real camera
  cameraStream: MediaStream | null;
  mediaError: string | null;
  guestTracks?: Record<string, RemoteVideoTrack>;

  // Interactions
  onSendComment?: (text: string) => void | Promise<void>;
  onShare?: () => void;
  onOpenGifts?: () => void;
  onOpenSettings?: () => void;
}

export function Stage({
  phase,
  devices,
  connection,
  viewers,
  likes,
  comments,
  shares = 0,
  chatMessages,
  giftFeed,
  featuredProduct,
  unfeatureProduct,
  streamInfo,
  guests,
  guestLayout,
  activeScene,
  screenStream,
  sourceState,
  username,
  avatarUrl,
  cameraStream,
  mediaError,
  guestTracks = {},
  onSendComment,
  onShare,
  onOpenGifts,
  onOpenSettings,
}: StageProps) {
  const isLive = phase === "live";
  const isStarting = phase === "starting";
  const isEnding = phase === "ending";
  const isBroadcasting = isLive || isEnding;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const commentRef = useRef<HTMLInputElement>(null);

  const cameraOff = devices.camera !== "connected" || !devices.cameraEnabled;

  const poorConnection =
    isLive && (connection === "poor" || connection === "reconnecting");

  const isImageSource = sourceState.activeSource === "image" && !!sourceState.imageUrl;
  const isVideoSource = sourceState.activeSource === "video" && !!sourceState.videoUrl;
  const isTextSource = sourceState.activeSource === "text" && !!sourceState.text;
  const isBrowserSource = sourceState.activeSource === "browser" && !!sourceState.browserUrl;
  const sourceIsActive = isImageSource || isVideoSource || isBrowserSource;

  const connectedGuests = guests.filter(
    (guest) => guest.status === "connected" || guest.status === "muted",
  );

  const [featuredGuestId, setFeaturedGuestId] = useState<string | null>(null);

  const featuredGuest =
    connectedGuests.find((guest) => guest.id === featuredGuestId) ??
    connectedGuests[0] ??
    null;

  const sceneName = activeScene?.name?.trim().toLowerCase() || "main camera";
  const isStartingScene = sceneName.includes("starting soon");
  const isScreenShareScene = sceneName.includes("screen");
  const isInterviewScene = sceneName.includes("interview");
  const isEndingScene = sceneName.includes("ending");
  const isCameraScene = !isScreenShareScene && !isStartingScene && !isEndingScene;

  const showGuestLayout =
    isCameraScene && connectedGuests.length > 0 && guestLayout !== "solo";

  /* ------------------------------------------------------------------------
     Attach the real camera stream to whichever <video> is mounted.
     A callback ref re-attaches when the layout swaps the element.
  ------------------------------------------------------------------------ */
  const attachCamera = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video) return;

      if (!cameraStream) {
        video.srcObject = null;
        return;
      }

      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
      }

      video.muted = true;
      video.playsInline = true;

      void video.play().catch((error) => {
        console.warn("[FOCKIS LIVE] Video autoplay failed:", error);
      });
    },
    [cameraStream],
  );

  const attachScreen = useCallback(
    (video: HTMLVideoElement | null) => {
      if (!video) return;

      if (!screenStream) {
        video.srcObject = null;
        return;
      }

      if (video.srcObject !== screenStream) {
        video.srcObject = screenStream;
      }

      video.muted = true;
      video.playsInline = true;

      void video.play().catch((error) => {
        console.warn("[FOCKIS LIVE] Screen-share preview autoplay failed:", error);
      });
    },
    [screenStream],
  );

  const sendComment = async () => {
    const text = comment.trim();
    if (!text || !onSendComment || !isLive || sendingComment) return;

    setSendingComment(true);
    try {
      await onSendComment(text);
      setComment("");
    } finally {
      setSendingComment(false);
    }
  };

  const hostVideo = (className: string) =>
    cameraStream && !cameraOff ? (
      <video ref={attachCamera} className={className} autoPlay muted playsInline />
    ) : (
      <div className="stage-tile-placeholder">
        <Avatar name={username} tone="signal" size="lg" src={avatarUrl} />
        <span>Camera off</span>
      </div>
    );

  const commentCount = comments ?? chatMessages.length;
  const category = streamInfo.category.trim();

  return (
    <div className="stage-wrap">
      <div className={`stage-frame ${showGuestLayout ? `stage-frame--${guestLayout}` : ""}`}>
        <div className="stage-frame__backdrop" aria-hidden="true" />

        {/* ============================================================
            USER SOURCES
        ============================================================ */}

        {isImageSource && (
          <img src={sourceState.imageUrl ?? ""} alt="Image source" className="stage-source-image" />
        )}

        {isVideoSource && (
          <video
            src={sourceState.videoUrl ?? ""}
            className="stage-source-video"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
          />
        )}

        {isBrowserSource && (
          <div className="stage-source-browser">
            <iframe
              src={sourceState.browserUrl ?? ""}
              title="Browser source"
              className="stage-source-browser__frame"
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-presentation allow-same-origin allow-scripts"
            />
            <div className="stage-source-browser__label">{sourceState.browserUrl}</div>
          </div>
        )}

        {/* ============================================================
            SCREEN SHARE
        ============================================================ */}

        {isScreenShareScene && screenStream && (
          <video ref={attachScreen} className="stage-screen-video" autoPlay muted playsInline />
        )}

        {/* ============================================================
            CAMERA / GUEST LAYOUTS
        ============================================================ */}

        {isCameraScene && !sourceIsActive && !showGuestLayout && cameraStream && !cameraOff && (
          <video ref={attachCamera} className="stage-camera-video" autoPlay muted playsInline />
        )}

        {showGuestLayout && (
          <div className={`stage-participants stage-participants--${guestLayout}`}>
            {guestLayout === "guest-full" && featuredGuest ? (
              <>
                <GuestTile guest={featuredGuest} guestTracks={guestTracks} className="stage-tile stage-tile--full" />
                <div className="stage-pip">
                  {hostVideo("stage-fill-video")}
                  <span className="stage-tile-name">You</span>
                </div>
              </>
            ) : (
              <>
                <div className="stage-tile">
                  {hostVideo("stage-fill-video")}
                  <span className="stage-tile-name">@{username}</span>
                </div>
                {featuredGuest && (
                  <GuestTile guest={featuredGuest} guestTracks={guestTracks} className="stage-tile" />
                )}
              </>
            )}

            {connectedGuests.length > 1 && (
              <div className="stage-participants__rail" role="group" aria-label="Choose featured guest">
                {connectedGuests.map((guest) => (
                  <button
                    key={guest.id}
                    type="button"
                    className={`stage-thumb ${featuredGuest?.id === guest.id ? "stage-thumb--active" : ""}`}
                    onClick={() => setFeaturedGuestId(guest.id)}
                    aria-pressed={featuredGuest?.id === guest.id}
                    title={`Feature ${guest.name}`}
                  >
                    <Avatar name={guest.name} tone={guest.avatarTone} size="sm" src={guest.avatarUrl} />
                    <span>{guest.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            CAMERA STATES
        ============================================================ */}

        {isCameraScene && !sourceIsActive && !showGuestLayout && (
          <>
            {mediaError &&
              devices.camera !== "permission-denied" &&
              devices.camera !== "unavailable" && (
                <div className="stage-block-state" role="alert">
                  <CameraOff size={30} />
                  <p className="stage-block-state__title">Camera unavailable</p>
                  <p className="stage-block-state__description">{mediaError}</p>
                </div>
              )}

            {devices.camera === "permission-denied" && (
              <div className="stage-block-state" role="alert">
                <ShieldAlert size={30} />
                <p className="stage-block-state__title">Camera access denied</p>
                <p className="stage-block-state__description">
                  Allow camera access in your browser settings to go live.
                </p>
              </div>
            )}

            {devices.camera === "unavailable" && !mediaError && (
              <div className="stage-block-state">
                <CameraOff size={30} />
                <p className="stage-block-state__title">No camera detected</p>
                <p className="stage-block-state__description">
                  Plug in a camera or choose a different source.
                </p>
              </div>
            )}

            {devices.camera === "connected" && !devices.cameraEnabled && (
              <div className="stage-block-state">
                <Avatar name={username} tone="signal" size="lg" src={avatarUrl} />
                <p className="stage-block-state__title">Camera is off</p>
                <p className="stage-block-state__description">
                  Viewers see your avatar and username while it's off.
                </p>
              </div>
            )}
          </>
        )}

        {isTextSource && <div className="stage-source-text">{sourceState.text}</div>}

        {/* ============================================================
            SCENE PRESENTATION
        ============================================================ */}

        {isStartingScene && (
          <div className="stage-status-overlay">
            <strong>Starting soon</strong>
            <span>We'll be live in a moment.</span>
          </div>
        )}

        {isScreenShareScene && !screenStream && (
          <div className="stage-status-overlay">
            <strong>Screen share</strong>
            <span>Choose a screen, window or tab to share.</span>
          </div>
        )}

        {isInterviewScene && guests.length === 0 && !showGuestLayout && (
          <div className="stage-status-overlay stage-status-overlay--soft">
            <strong>Interview</strong>
            <span>Invite a guest to join your stage.</span>
          </div>
        )}

        {isEndingScene && (
          <div className="stage-status-overlay">
            <strong>Thanks for watching</strong>
            <span>See you next time.</span>
          </div>
        )}

        {(isStarting || isEnding) && (
          <div className="stage-status-overlay" role="status">
            <Loader2 size={26} className="spin" />
            <span>{isStarting ? "Going live…" : "Ending stream…"}</span>
          </div>
        )}

        <div className="stage-shade" aria-hidden="true" />

        {/* ============================================================
            TOP: creator identity
        ============================================================ */}

        <div className="stage-top">
          <div className="stage-identity">
            <span className={`stage-identity__ring ${isBroadcasting ? "is-live" : ""}`}>
              <Avatar name={username} tone="signal" size="lg" src={avatarUrl} />
            </span>

            <div className="stage-identity__text">
              <span className="stage-identity__row">
                <span className="stage-identity__handle">@{username}</span>
                {/* Viewers see a Follow button here; the creator sees a preview of it. */}
                <span className="stage-follow-preview" aria-hidden="true" title="Viewers see a Follow button here">
                  + Follow
                </span>
              </span>
              <span className="stage-identity__meta">
                {isBroadcasting
                  ? `${formatCount(viewers)} viewers`
                  : "Preview · only you can see this"}
                {category && ` · ${category}`}
              </span>
            </div>

            <button
              type="button"
              className={`stage-round-btn stage-collapse ${detailsOpen ? "is-open" : ""}`}
              onClick={() => setDetailsOpen((value) => !value)}
              aria-expanded={detailsOpen}
              aria-controls="fls-stage-details"
              aria-label={detailsOpen ? "Hide stream details" : "Show stream details"}
            >
              <ChevronDown size={20} />
            </button>
          </div>

          <button
            type="button"
            className="stage-chip"
            onClick={onOpenSettings}
            disabled={!onOpenSettings}
            title="Change category"
          >
            <Gamepad2 size={17} aria-hidden="true" />
            {category || "Add a category"}
            <ChevronRight size={16} aria-hidden="true" />
          </button>

          {detailsOpen && (
            <div className="stage-details" id="fls-stage-details">
              <strong>{streamInfo.title.trim() || "Untitled live"}</strong>
              {streamInfo.description.trim() && <p>{streamInfo.description}</p>}
              <span>
                {streamInfo.visibility === "public"
                  ? "Public"
                  : streamInfo.visibility === "followers"
                    ? "Followers only"
                    : "Private"}
                {" · "}
                {activeScene?.name ?? "Main Camera"}
              </span>
            </div>
          )}

          {devices.microphone === "connected" && !devices.micEnabled && (
            <span className="stage-mic-off-chip" role="status">
              <MicOff size={12} />
              Your mic is muted
            </span>
          )}

          {isScreenShareScene && screenStream && isBroadcasting && (
            <span className="stage-mic-off-chip stage-mic-off-chip--info" role="status">
              Screen share is a studio preview — viewers still see your camera
            </span>
          )}

          {poorConnection && (
            <div className="stage-connection-banner" role="status">
              <WifiOff size={13} />
              {connection === "poor" ? "Poor connection — video quality reduced" : "Reconnecting…"}
            </div>
          )}
        </div>

        {isLive && <HeartsField likes={likes} />}

        {featuredProduct && (isLive || phase === "setup") && (
          <div className="stage-product-slot">
            <FeaturedProductCard product={featuredProduct} onDismiss={unfeatureProduct} />
          </div>
        )}

        {isLive && (
          <div className="stage-gift-slot">
            <GiftToast gifts={giftFeed} />
          </div>
        )}

        {/* ============================================================
            RIGHT RAIL
        ============================================================ */}

        <div className="stage-rail">
          <div className="stage-rail__item" title="Likes on this live">
            <span className="stage-rail__btn stage-rail__btn--static">
              <Heart size={30} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              <span className="stage-rail__count">{formatCount(likes)}</span>
            </span>
            <span className="sr-only">{likes} likes</span>
          </div>

          <button
            type="button"
            className="stage-rail__btn"
            onClick={() => commentRef.current?.focus()}
            disabled={!isLive}
            aria-label={`${commentCount} comments — write a comment`}
          >
            <MessageCircle size={28} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            <span className="stage-rail__dots" aria-hidden="true">•••</span>
            <span className="stage-rail__count">{formatCount(commentCount)}</span>
          </button>

          <button
            type="button"
            className="stage-rail__btn"
            onClick={onShare}
            disabled={!isLive || !onShare}
            aria-label={`Share this live (${shares} shares)`}
          >
            <Forward size={30} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
            <span className="stage-rail__count">{formatCount(shares)}</span>
          </button>

          <button
            type="button"
            className="stage-rail__btn stage-rail__btn--gift"
            onClick={onOpenGifts}
            disabled={!onOpenGifts}
            aria-label="Gifts"
          >
            <Gift size={34} aria-hidden="true" />
            <span className="stage-rail__count">Gift</span>
          </button>
        </div>

        {/* ============================================================
            BOTTOM: comments + composer
        ============================================================ */}

        <div className="stage-bottom">
          {isBroadcasting ? (
            <LiveChatOverlay messages={chatMessages} />
          ) : (
            <p className="stage-preview-hint">This is what your viewers will see once you go live.</p>
          )}

          <form
            className="stage-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendComment();
            }}
          >
            <div className="stage-composer__field">
              <label htmlFor="fls-stage-comment" className="sr-only">Add a comment</label>
              <input
                id="fls-stage-comment"
                ref={commentRef}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={isLive ? "Add a comment…" : "Comments open when you're live"}
                disabled={!isLive || !onSendComment}
                maxLength={500}
                autoComplete="off"
                enterKeyHint="send"
              />
              <button
                type="button"
                className="stage-composer__emoji"
                aria-label="Add a heart"
                disabled={!isLive || !onSendComment}
                onClick={() => {
                  setComment((value) => `${value}💙`);
                  commentRef.current?.focus();
                }}
              >
                <Smile size={24} />
              </button>
            </div>
            <button
              type="submit"
              className="stage-composer__send"
              disabled={!isLive || !comment.trim() || sendingComment}
              aria-label="Post comment"
            >
              <SendHorizontal size={22} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
