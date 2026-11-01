import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CameraOff,
  Heart,
  Loader2,
  MessageSquare,
  MicOff,
  Share2,
  ShieldAlert,
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

const HEART_EMOJI = [
  "❤️",
  "💛",
  "💙",
  "💜",
  "🧡",
];

function HeartsField({
  active,
}: {
  active: boolean;
}) {
  const [hearts, setHearts] = useState<
    {
      id: number;
      left: number;
      tone: number;
      drift: number;
      duration: number;
    }[]
  >([]);

  useEffect(() => {
    if (!active) {
      setHearts([]);
      return;
    }

    let counter = 0;

    const interval = window.setInterval(() => {
      counter += 1;

      setHearts((current) => [
        ...current.slice(-14),
        {
          id: counter,
          left: 60 + Math.random() * 30,
          tone: Math.floor(
            Math.random() * HEART_EMOJI.length,
          ),
          drift: (Math.random() - 0.5) * 40,
          duration:
            2600 + Math.random() * 1400,
        },
      ]);
    }, 900);

    return () => {
      window.clearInterval(interval);
    };
  }, [active]);

  return (
    <div
      className="hearts-field"
      aria-hidden="true"
    >
      {hearts.map((heart) => (
        <span
          key={heart.id}
          className="hearts-field__heart"
          style={{
            left: `${heart.left}%`,
            animationDuration: `${heart.duration}ms`,
            ["--drift" as string]: `${heart.drift}px`,
          }}
        >
          {HEART_EMOJI[heart.tone]}
        </span>
      ))}
    </div>
  );
}

function GiftToast({
  gifts,
}: {
  gifts: SentGift[];
}) {
  const last = gifts[gifts.length - 1];

  if (!last) {
    return null;
  }

  return (
    <div
      className="gift-toast"
      key={last.id}
    >
      <span className="gift-toast__icon">
        {last.giftIcon}
      </span>

      <span className="gift-toast__text">
        <strong>{last.username}</strong>{" "}
        sent a {last.giftLabel}
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
        aria-label="Unfeature product"
        type="button"
      >
        <X size={12} />
      </button>

      <div
        className={`product-slot-card__thumb product-slot-card__thumb--${product.imageTone}`}
      />

      <div className="product-slot-card__info">
        <span className="product-slot-card__name">
          {product.name}
        </span>

        <span className="product-slot-card__meta">
          <span className="product-slot-card__rating">
            ★ {product.rating}
          </span>

          <span className="product-slot-card__price">
            {product.price}
          </span>
        </span>

        <button
          className="product-slot-card__shop"
          type="button"
        >
          Shop now
        </button>
      </div>
    </div>
  );
}

function LiveChatOverlay({
  messages,
}: {
  messages: ChatMessage[];
}) {
  const recent = messages.slice(-4);

  return (
    <div className="stage-chat-feed">
      {recent.map((message) => (
        <div
          className="stage-chat-feed__row"
          key={message.id}
        >
          <Avatar
            name={message.username}
            tone={message.avatarTone}
            size="xs"
          />

          <span className="stage-chat-feed__text">
            <span className="stage-chat-feed__username">
              {message.username}
            </span>{" "}
            {message.message}
          </span>
        </div>
      ))}
    </div>
  );
}

function GuestRemoteVideo({
  track,
}: {
  track: RemoteVideoTrack;
}) {
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

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="stage-guest-tile__video"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

interface StageProps {
  phase: Phase;
  devices: DeviceState;
  connection: ConnectionQuality;
  viewers: number;
  likes: number;
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

  // REAL LOGGED-IN USER
  username: string;
  avatarUrl?: string;

  // REAL CAMERA
  cameraStream: MediaStream | null;
  mediaError: string | null;
  guestTracks?: Record<string, RemoteVideoTrack>;
}

export function Stage({
  phase,
  devices,
  connection,
  viewers,
  likes,
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
}: StageProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const screenVideoRef =
    useRef<HTMLVideoElement | null>(null);

  const isLive = phase === "live";
  const isStarting = phase === "starting";
  const isEnding = phase === "ending";

  const cameraOff =
    devices.camera !== "connected" ||
    !devices.cameraEnabled;

  const poorConnection =
    isLive &&
    (connection === "poor" ||
      connection === "reconnecting");

  const isImageSource =
    sourceState.activeSource === "image" &&
    !!sourceState.imageUrl;

  const isVideoSource =
    sourceState.activeSource === "video" &&
    !!sourceState.videoUrl;

  const isTextSource =
    sourceState.activeSource === "text" &&
    !!sourceState.text;

  const isBrowserSource =
    sourceState.activeSource === "browser" &&
    !!sourceState.browserUrl;

  const sourceIsActive =
    isImageSource ||
    isVideoSource ||
    isTextSource ||
    isBrowserSource;

  const connectedGuests = guests.filter(
    (guest) =>
      guest.status === "connected" ||
      guest.status === "muted",
  );

  const [featuredGuestId, setFeaturedGuestId] =
    useState<string | null>(null);

  useEffect(() => {
    if (connectedGuests.length === 0) {
      setFeaturedGuestId(null);
      return;
    }

    if (
      !featuredGuestId ||
      !connectedGuests.some(
        (guest) => guest.id === featuredGuestId,
      )
    ) {
      setFeaturedGuestId(connectedGuests[0].id);
    }
  }, [connectedGuests, featuredGuestId]);

  const featuredGuest =
    connectedGuests.find(
      (guest) => guest.id === featuredGuestId,
    ) ?? connectedGuests[0] ?? null;

  const guestLimit = connectedGuests.length;

  const sceneName =
    activeScene?.name?.trim().toLowerCase() ||
    "main camera";

  const isStartingScene =
    sceneName.includes("starting soon");

  const isScreenShareScene =
    sceneName.includes("screen share") ||
    sceneName.includes("screen");

  const isInterviewScene =
    sceneName.includes("interview");

  const isEndingScene =
    sceneName.includes("ending");

  /*
   * ================================================================
   * ATTACH REAL CAMERA STREAM
   * ================================================================
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

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
      console.warn(
        "[FOCKIS LIVE] Video autoplay failed:",
        error,
      );
    });

    console.log(
      "[FOCKIS LIVE] Camera stream attached to video element.",
      {
        videoTracks:
          cameraStream.getVideoTracks().length,
        audioTracks:
          cameraStream.getAudioTracks().length,
      },
    );

    return () => {
      if (video.srcObject === cameraStream) {
        video.srcObject = null;
      }
    };
  }, [cameraStream]);

  /*
   * Attach the real browser screen-share stream when the Screen Share scene
   * is active.
   */
  useEffect(() => {
    const video = screenVideoRef.current;

    if (!video) {
      return;
    }

    if (!screenStream || !isScreenShareScene) {
      video.srcObject = null;
      return;
    }

    video.srcObject = screenStream;
    video.muted = true;
    video.playsInline = true;

    void video.play().catch((error) => {
      console.warn(
        "[FOCKIS LIVE] Screen-share preview autoplay failed:",
        error,
      );
    });

    return () => {
      if (video.srcObject === screenStream) {
        video.srcObject = null;
      }
    };
  }, [isScreenShareScene, screenStream]);

  return (
    <div className="stage-wrap">
      <div className="stage-frame">
        <div className="stage-frame__texture">
          <div className="stage-frame__glow stage-frame__glow--a" />
          <div className="stage-frame__glow stage-frame__glow--b" />
          <div className="stage-frame__desk-line" />
          <div className="stage-frame__vignette" />
        </div>

        {/* ============================================================
            USER SOURCES
        ============================================================ */}

        {isImageSource && (
          <img
            src={sourceState.imageUrl ?? ""}
            alt="Live source"
            className="stage-source-image"
          />
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
            <div className="stage-source-browser__label">
              {sourceState.browserUrl}
            </div>
          </div>
        )}

        {isTextSource && (
          <div className="stage-source-text">
            {sourceState.text}
          </div>
        )}

        {/* ============================================================
            SCREEN SHARE
        ============================================================ */}

        {isScreenShareScene && screenStream && (
          <video
            ref={screenVideoRef}
            className="stage-camera-video"
            autoPlay
            muted
            playsInline
          />
        )}

        {/* ============================================================
            CAMERA ERROR
        ============================================================ */}

        {!isScreenShareScene &&
          !isStartingScene &&
          !isEndingScene &&
          mediaError &&
          devices.camera !== "permission-denied" &&
          devices.camera !== "unavailable" && (
            <div className="stage-block-state">
              <CameraOff size={30} />

              <p className="stage-block-state__title">
                Camera unavailable
              </p>

              <p className="stage-block-state__description">
                {mediaError}
              </p>
            </div>
          )}

        {!isScreenShareScene &&
          !isStartingScene &&
          !isEndingScene &&
          devices.camera ===
            "permission-denied" && (
          <div className="stage-block-state">
            <ShieldAlert size={30} />

            <p className="stage-block-state__title">
              Camera access denied
            </p>

            <p className="stage-block-state__description">
              Allow camera access in your browser
              settings to go live.
            </p>
          </div>
        )}

        {!isScreenShareScene &&
          !isStartingScene &&
          !isEndingScene &&
          devices.camera ===
            "unavailable" && (
          <div className="stage-block-state">
            <CameraOff size={30} />

            <p className="stage-block-state__title">
              No camera detected
            </p>

            <p className="stage-block-state__description">
              Plug in a camera or choose a
              different video source.
            </p>
          </div>
        )}

        {!isScreenShareScene &&
          !isStartingScene &&
          !isEndingScene &&
          devices.camera ===
            "connected" &&
          !devices.cameraEnabled && (
            <div className="stage-block-state">
              <CameraOff size={30} />

              <p className="stage-block-state__title">
                Camera is off
              </p>

              <p className="stage-block-state__description">
                Viewers see your avatar and
                username while it's off.
              </p>
            </div>
          )}

        {/* ============================================================
            SCALABLE PARTICIPANT STAGE

            Solo:
              host fills the stage.

            Side by side:
              host + featured guest share the main area.

            Guest full screen:
              featured guest fills the main area while everyone else
              remains visible in the participant rail.

            Grid 2 / Grid 4:
              the main area remains responsive and every connected
              participant stays available in the rail.

            This intentionally does not hard-limit the stage to four
            people. The rail can contain many participants and scrolls.
        ============================================================ */}

        {connectedGuests.length > 0 && !cameraOff && (
          <div
            className="stage-participants"
            data-layout={guestLayout}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              pointerEvents: "none",
            }}
          >
            <div className="stage-participants__main"
              style={{
                flex: 1,
                minHeight: 0,
                position: "relative",
                display: "flex",
                overflow: "hidden",
                paddingBottom: 88,
              }}>
              {guestLayout === "solo" ? (
                <video
                  ref={videoRef}
                  className="stage-camera-video stage-participants__host-video"
                  autoPlay
                  muted
                  playsInline
                />
              ) : guestLayout === "side-by-side" ? (
                <div className="stage-participants__split"
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}>
                  <div className="stage-participants__host-card"
                    style={{
                      position: "relative",
                      minWidth: 0,
                      overflow: "hidden",
                      borderRadius: 16,
                    }}>
                    {cameraStream && (
                      <video
                        ref={videoRef}
                        className="stage-participants__video"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        autoPlay
                        muted
                        playsInline
                      />
                    )}
                    <span className="stage-participants__name">
                      @{username}
                    </span>
                  </div>

                  {featuredGuest && (
                    <div className="stage-participants__featured-card"
                    style={{
                      position: "relative",
                      minWidth: 0,
                      overflow: "hidden",
                      borderRadius: 16,
                    }}>
                      {(() => {
                        const identity = Object.keys(guestTracks).find(
                          (key) =>
                            key === featuredGuest.id ||
                            key === featuredGuest.username ||
                            key.toLowerCase().includes(
                              String(featuredGuest.username ?? "").toLowerCase(),
                            ),
                        );
                        const track = identity
                          ? guestTracks[identity]
                          : undefined;

                        return track ? (
                          <GuestRemoteVideo track={track} />
                        ) : (
                          <Avatar
                            name={featuredGuest.name}
                            tone={featuredGuest.avatarTone}
                            size="lg"
                          />
                        );
                      })()}
                      <span className="stage-participants__name">
                        {featuredGuest.name}
                      </span>
                    </div>
                  )}
                </div>
              ) : guestLayout === "guest-full" ? (
                <div className="stage-participants__featured-full"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    borderRadius: 16,
                  }}>
                  {featuredGuest && (() => {
                    const identity = Object.keys(guestTracks).find(
                      (key) =>
                        key === featuredGuest.id ||
                        key === featuredGuest.username ||
                        key.toLowerCase().includes(
                          String(featuredGuest.username ?? "").toLowerCase(),
                        ),
                    );
                    const track = identity
                      ? guestTracks[identity]
                      : undefined;

                    return track ? (
                      <GuestRemoteVideo track={track} />
                    ) : (
                      <Avatar
                        name={featuredGuest.name}
                        tone={featuredGuest.avatarTone}
                        size="lg"
                      />
                    );
                  })()}
                  <span className="stage-participants__name">
                    {featuredGuest?.name ?? "Guest"}
                  </span>
                </div>
              ) : (
                <div className="stage-participants__host-featured"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    borderRadius: 16,
                  }}>
                  {cameraStream && (
                    <video
                      ref={videoRef}
                      className="stage-participants__video"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      autoPlay
                      muted
                      playsInline
                    />
                  )}
                  <span className="stage-participants__name">
                    @{username}
                  </span>
                </div>
              )}
            </div>

            <div
              className="stage-participants__rail"
              role="list"
              style={{
                position: "absolute",
                left: 12,
                right: 12,
                bottom: 12,
                zIndex: 5,
                display: "flex",
                gap: 8,
                overflowX: "auto",
                overflowY: "hidden",
                padding: 4,
                pointerEvents: "auto",
                scrollbarWidth: "thin",
              }}
              aria-label="Live participants"
            >
              <button
                type="button"
                className={`stage-participant-thumb stage-participant-thumb--host${
                  guestLayout !== "guest-full" && !featuredGuestId
                    ? " is-active"
                    : ""
                }`}
                onClick={() => setFeaturedGuestId(null)}
                title={`Feature @${username}`}
                style={{
                  position: "relative",
                  flex: "0 0 88px",
                  width: 88,
                  height: 56,
                  overflow: "hidden",
                  borderRadius: 10,
                  border: !featuredGuestId ? "2px solid white" : "1px solid rgba(255,255,255,.25)",
                  background: "rgba(10,10,14,.88)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {cameraStream ? (
                  <video
                    className="stage-participant-thumb__video"
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    ref={(element) => {
                      if (element && element.srcObject !== cameraStream) {
                        element.srcObject = cameraStream;
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                  />
                ) : (
                  <Avatar name={username} tone="signal" size="sm" />
                )}
                <span className="stage-participant-thumb__label">
                  You
                </span>
              </button>

              {connectedGuests.map((guest) => {
                const identity = Object.keys(guestTracks).find(
                  (key) =>
                    key === guest.id ||
                    key === guest.username ||
                    key.toLowerCase().includes(
                      String(guest.username ?? "").toLowerCase(),
                    ),
                );
                const track = identity
                  ? guestTracks[identity]
                  : undefined;

                return (
                  <button
                    type="button"
                    role="listitem"
                    className={`stage-participant-thumb${
                      featuredGuest?.id === guest.id
                        ? " is-active"
                        : ""
                    }`}
                    key={guest.id}
                    onClick={() => setFeaturedGuestId(guest.id)}
                    title={`Feature ${guest.name}`}
                    style={{
                      position: "relative",
                      flex: "0 0 88px",
                      width: 88,
                      height: 56,
                      overflow: "hidden",
                      borderRadius: 10,
                      border: featuredGuest?.id === guest.id ? "2px solid white" : "1px solid rgba(255,255,255,.25)",
                      background: "rgba(10,10,14,.88)",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {track ? (
                      <GuestRemoteVideo track={track} />
                    ) : (
                      <Avatar
                        name={guest.name}
                        tone={guest.avatarTone}
                        size="sm"
                      />
                    )}
                    <span className="stage-participant-thumb__label">
                      {guest.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            NO GUESTS: keep the normal host camera presentation.
        ============================================================ */}

        {connectedGuests.length === 0 && (
          <div className="stage-host-only">
            {!sourceIsActive &&
              !isScreenShareScene &&
              !isStartingScene &&
              !isEndingScene &&
              !cameraOff &&
              cameraStream && (
                <video
                  ref={videoRef}
                  className="stage-camera-video"
                  autoPlay
                  muted
                  playsInline
                />
              )}
          </div>
        )}

        {/* ============================================================
            TOP OVERLAY
        ============================================================ */}

        <div className="stage-top-overlay">
          <div className="stage-identity-row">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={username}
                className="stage-identity-photo"
              />
            ) : (
              <Avatar
                name={username}
                tone="signal"
                size="md"
              />
            )}

            <div className="stage-identity-text">
              <span className="stage-handle">
                @{username}
              </span>

              {isLive || isEnding ? (
                <span className="stage-live-tag">
                  <span className="stage-live-tag__dot" />
                  LIVE {formatCount(viewers)}
                </span>
              ) : (
                <span className="stage-preview-tag">
                  Preview · only you can see this
                </span>
              )}
            </div>

            {(isLive || isEnding) && (
              <button
                className="stage-follow-btn"
                type="button"
              >
                Follow
              </button>
            )}
          </div>

          {devices.microphone ===
            "connected" &&
            !devices.micEnabled && (
              <span className="stage-mic-off-chip">
                <MicOff size={11} />
                Muted
              </span>
            )}
        </div>

        {/* ============================================================
            REAL SCENE PRESENTATION
        ============================================================ */}

        {isStartingScene && (
          <div className="stage-status-overlay">
            <span className="stage-live-tag__dot" />
            <strong>Starting Soon</strong>
            <span>We'll be live in a moment.</span>
          </div>
        )}

        {isScreenShareScene && !screenStream && (
          <div className="stage-status-overlay">
            <span>Choose a screen or window to share.</span>
          </div>
        )}

        {isInterviewScene && guests.length === 0 && (
          <div className="stage-status-overlay">
            <strong>Interview</strong>
            <span>Invite a guest to join your stage.</span>
          </div>
        )}

        {isEndingScene && (
          <div className="stage-status-overlay">
            <strong>Thanks for watching</strong>
            <span>Your live stream is ending.</span>
          </div>
        )}

        {/* ============================================================
            STARTING
        ============================================================ */}

        {isStarting && (
          <div className="stage-status-overlay">
            <Loader2
              size={26}
              className="spin"
            />
            <span>Going live…</span>
          </div>
        )}

        {/* ============================================================
            ENDING
        ============================================================ */}

        {isEnding && (
          <div className="stage-status-overlay">
            <Loader2
              size={26}
              className="spin"
            />
            <span>Ending stream…</span>
          </div>
        )}

        {/* ============================================================
            CONNECTION
        ============================================================ */}

        {poorConnection && (
          <div className="stage-connection-banner">
            <WifiOff size={13} />

            {connection === "poor"
              ? "Poor connection — video quality reduced"
              : "Reconnecting…"}
          </div>
        )}

        {/* ============================================================
            HEARTS
        ============================================================ */}

        {isLive && (
          <HeartsField active={isLive} />
        )}

        {/* ============================================================
            RIGHT RAIL
        ============================================================ */}

        {(isLive || isEnding) && (
          <div className="stage-right-rail">
            <button
              className="stage-rail-btn"
              type="button"
            >
              <Heart size={20} />
              <span>
                {formatCount(likes)}
              </span>
            </button>

            <button
              className="stage-rail-btn"
              type="button"
            >
              <Share2 size={19} />
              <span>Share</span>
            </button>
          </div>
        )}

        {/* ============================================================
            PRODUCT
        ============================================================ */}

        {featuredProduct &&
          (isLive || phase === "setup") && (
            <div className="stage-product-slot">
              <FeaturedProductCard
                product={featuredProduct}
                onDismiss={unfeatureProduct}
              />
            </div>
          )}

        {/* ============================================================
            GIFTS
        ============================================================ */}

        {isLive && (
          <div className="stage-gift-slot">
            <GiftToast gifts={giftFeed} />
          </div>
        )}

        {/* ============================================================
            BOTTOM OVERLAY
        ============================================================ */}

        <div className="stage-bottom-overlay">
          <p className="stage-title">
            {streamInfo.title}
          </p>

          {isLive ? (
            <LiveChatOverlay
              messages={chatMessages}
            />
          ) : (
            <p className="stage-preview-hint">
              This is what your viewers will see
              once you go live.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Keep this import available for the existing icon set.
void MessageSquare;