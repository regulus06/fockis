import {
  useCallback,
  useState,
  type KeyboardEvent,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  Heart,
  MessageCircle,
  RefreshCw,
  Send,
  Share2,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useLiveViewer,
} from "../hooks/useLiveViewer";

export interface LiveViewerProps {
  liveId?: string;
}

export default function LiveViewer({
  liveId: liveIdProp,
}: LiveViewerProps) {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();

  const liveId =
    liveIdProp ||
    params.id ||
    "";

  const viewer = useLiveViewer({
    streamId: liveId,
  });

  const [muted, setMuted] =
    useState(true);

  const [messageText, setMessageText] =
    useState("");

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [sharing, setSharing] =
    useState(false);

  const handleVideoRef =
    useCallback(
      (element: HTMLVideoElement | null) => {
        viewer.videoRef(element);
      },
      [viewer.videoRef],
    );

  const handleToggleMute =
    useCallback(() => {
      setMuted((current) => {
        const next = !current;
        viewer.setIsMuted(next);
        return next;
      });
    }, [viewer.setIsMuted]);

  const handleSendMessage =
    async () => {
      const text =
        messageText.trim();

      if (
        !text ||
        sendingMessage
      ) {
        return;
      }

      setSendingMessage(true);

      try {
        await viewer.sendMessage(text);
        setMessageText("");
      } catch (error) {
        console.error(
          "[LIVE VIEWER] Failed to send message:",
          error,
        );
      } finally {
        setSendingMessage(false);
      }
    };

  const handleMessageKeyDown =
    (
      event: KeyboardEvent<HTMLInputElement>,
    ) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        void handleSendMessage();
      }
    };

  const handleLike =
    async () => {
      try {
        await viewer.toggleLike();
      } catch (error) {
        console.error(
          "[LIVE VIEWER] Like failed:",
          error,
        );
      }
    };

  const handleFollow =
    async () => {
      try {
        await viewer.toggleFollow();
      } catch (error) {
        console.error(
          "[LIVE VIEWER] Follow failed:",
          error,
        );
      }
    };

  const handleShare =
    async () => {
      if (sharing) {
        return;
      }

      setSharing(true);

      try {
        await viewer.shareStream();
      } catch (error) {
        console.error(
          "[LIVE VIEWER] Share failed:",
          error,
        );
      } finally {
        setSharing(false);
      }
    };

  const handleReload =
    async () => {
      try {
        await viewer.reload();
      } catch (error) {
        console.error(
          "[LIVE VIEWER] Reload failed:",
          error,
        );
      }
    };

  const handleBack =
    () => {
      navigate("/my-live");
    };

  if (!liveId) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__error">
          <AlertCircle size={32} />

          <h2>
            Invalid live stream
          </h2>

          <p>
            No live stream ID was provided.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="live-viewer__button live-viewer__button--primary"
          >
            <ArrowLeft size={17} />
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  if (viewer.loading) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__loading">
          <RefreshCw
            size={28}
            className="live-viewer__spinner"
          />

          <h2>
            Loading live stream
          </h2>

          <p>
            Connecting to the live broadcast...
          </p>
        </div>
      </div>
    );
  }

  if (viewer.error) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__error">
          <AlertCircle size={32} />

          <h2>
            Unable to load live stream
          </h2>

          <p>
            {viewer.error}
          </p>

          <div className="live-viewer__error-actions">
            <button
              type="button"
              onClick={() => {
                void handleReload();
              }}
              className="live-viewer__button live-viewer__button--primary"
            >
              <RefreshCw size={17} />
              Try again
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="live-viewer__button"
            >
              <ArrowLeft size={17} />
              Back to Live
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!viewer.stream) {
    return (
      <div className="live-viewer">
        <div className="live-viewer__empty">
          <Users size={32} />

          <h2>
            Live stream not found
          </h2>

          <p>
            This live stream may have ended or
            is no longer available.
          </p>

          <button
            type="button"
            onClick={handleBack}
            className="live-viewer__button live-viewer__button--primary"
          >
            <ArrowLeft size={17} />
            Back to Live
          </button>
        </div>
      </div>
    );
  }

  const stream =
    viewer.stream;

  return (
    <div className="live-viewer">
      <header className="live-viewer__header">
        <button
          type="button"
          className="live-viewer__back"
          onClick={handleBack}
          aria-label="Back to live"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="live-viewer__stream-info">
          <div className="live-viewer__avatar">
            {stream.avatarUrl ? (
              <img
                src={stream.avatarUrl}
                alt={stream.displayName}
              />
            ) : (
              <span>
                {stream.displayName
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="live-viewer__identity">
            <strong>
              {stream.displayName}
            </strong>

            <span>
              @{stream.username}
            </span>
          </div>

          <div className="live-viewer__status">
            <span className="live-viewer__live-dot" />
            LIVE
          </div>
        </div>

        <button
          type="button"
          className={`live-viewer__follow ${
            viewer.isFollowing
              ? "live-viewer__follow--following"
              : ""
          }`}
          onClick={() => {
            void handleFollow();
          }}
        >
          {viewer.isFollowing ? (
            <>
              <UserCheck size={16} />
              Following
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Follow
            </>
          )}
        </button>
      </header>

      <main className="live-viewer__main">
        <div className="live-viewer__stage">
          <div className="live-viewer__video-container">
            <video
              ref={handleVideoRef}
              className="live-viewer__video"
              autoPlay
              playsInline
              muted={muted}
              controls={false}
            />

            {!viewer.connected && (
              <div className="live-viewer__video-overlay">
                <RefreshCw
                  size={28}
                  className="live-viewer__spinner"
                />

                <span>
                  Connecting to live video...
                </span>
              </div>
            )}

            {viewer.connected && (
              <div className="live-viewer__video-live">
                <span className="live-viewer__live-dot" />
                LIVE
              </div>
            )}

            <button
              type="button"
              className="live-viewer__video-mute"
              onClick={handleToggleMute}
              aria-label={
                muted
                  ? "Unmute video"
                  : "Mute video"
              }
            >
              {muted ? (
                <VolumeX size={20} />
              ) : (
                <Volume2 size={20} />
              )}
            </button>
          </div>
        </div>

        <div className="live-viewer__details">
          <div className="live-viewer__title-area">
            <h1>
              {stream.title ||
                "Live stream"}
            </h1>

            {stream.description && (
              <p>
                {stream.description}
              </p>
            )}
          </div>

          <div className="live-viewer__actions">
            <button
              type="button"
              className={`live-viewer__action ${
                viewer.liked
                  ? "live-viewer__action--active"
                  : ""
              }`}
              onClick={() => {
                void handleLike();
              }}
            >
              <Heart
                size={19}
                fill={
                  viewer.liked
                    ? "currentColor"
                    : "none"
                }
              />

              <span>
                {viewer.liked
                  ? "Liked"
                  : "Like"}
              </span>

              <span>
                {stream.likes}
              </span>
            </button>

            <button
              type="button"
              className="live-viewer__action"
              onClick={() => {
                void handleShare();
              }}
              disabled={sharing}
            >
              <Share2 size={19} />

              <span>
                {sharing
                  ? "Sharing..."
                  : "Share"}
              </span>
            </button>

            <button
              type="button"
              className="live-viewer__action"
              onClick={handleToggleMute}
            >
              {muted ? (
                <VolumeX size={19} />
              ) : (
                <Volume2 size={19} />
              )}

              <span>
                {muted
                  ? "Unmute"
                  : "Mute"}
              </span>
            </button>
          </div>
        </div>

        <section className="live-viewer__chat">
          <div className="live-viewer__chat-header">
            <div>
              <MessageCircle size={18} />

              <strong>
                Live chat
              </strong>
            </div>

            <div className="live-viewer__chat-viewers">
              <Users size={16} />

              <span>
                {stream.viewers ?? 0}
              </span>
            </div>
          </div>

          <div className="live-viewer__messages">
            {viewer.messages.length === 0 ? (
              <div className="live-viewer__no-messages">
                <MessageCircle size={24} />

                <span>
                  No messages yet.
                  Be the first to say
                  hello!
                </span>
              </div>
            ) : (
              viewer.messages.map(
                (message, index) => (
                  <div
                    className="live-viewer__message"
                    key={
                      message.id ||
                      `${index}-${message.createdAt || ""}`
                    }
                  >
                    <div className="live-viewer__message-avatar">
                      {message.avatarUrl ? (
                        <img
                          src={message.avatarUrl}
                          alt={
                            message.displayName ||
                            "Viewer"
                          }
                        />
                      ) : (
                        <span>
                          {(
                            message.displayName ||
                            message.username ||
                            "V"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="live-viewer__message-content">
                      <strong>
                        {message.displayName ||
                          message.username ||
                          "Viewer"}
                      </strong>

                      <span>
                        {message.message}
                      </span>
                    </div>
                  </div>
                )
              )
            )}
          </div>

          <div className="live-viewer__chat-input">
            <input
              type="text"
              value={messageText}
              onChange={(event) =>
                setMessageText(
                  event.target.value,
                )
              }
              onKeyDown={
                handleMessageKeyDown
              }
              placeholder="Say something..."
              maxLength={500}
              disabled={sendingMessage}
            />

            <button
              type="button"
              onClick={() => {
                void handleSendMessage();
              }}
              disabled={
                !messageText.trim() ||
                sendingMessage
              }
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export { LiveViewer };