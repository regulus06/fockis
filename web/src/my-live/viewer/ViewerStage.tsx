import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  Loader2,
  SendHorizontal,
  Smile,
  UserCheck,
  VolumeX,
} from "lucide-react";

import type {
  LiveViewerStream,
  ViewerChatMessage,
} from "../hooks/useLiveViewer";

import { formatCount, formatRelativeTime } from "../utils";
import { ViewerActions } from "./ViewerActions";

// ============================================================================
// PROPS
// ============================================================================

export interface ViewerStageProps {
  stream: LiveViewerStream;

  /** LiveKit attaches the remote track through this ref (useLiveViewer). */
  videoRef: (element: HTMLVideoElement | null) => void;

  connected: boolean;
  muted: boolean;
  onToggleMute: () => void;

  messages: ViewerChatMessage[];
  liked: boolean;
  isFollowing: boolean;
  sharing?: boolean;

  onLike: () => void;
  onFollow: () => void;
  onShare: () => void;
  onSend: (message: string) => void | Promise<void>;
}

// ============================================================================
// VIEWER STAGE — immersive video with sparse overlays
// ============================================================================

export const ViewerStage = forwardRef<HTMLInputElement, ViewerStageProps>(function ViewerStage(
  {
    stream,
    videoRef,
    connected,
    muted,
    onToggleMute,
    messages,
    liked,
    isFollowing,
    sharing = false,
    onLike,
    onFollow,
    onShare,
    onSend,
  },
  commentRef,
) {
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const localInputRef = useRef<HTMLInputElement | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  /*
   * Direct playback URL is only a fallback for streams that are not
   * delivered through LiveKit. LiveKit streams attach via videoRef.
   */
  const usesLiveKit = Boolean(stream.token || stream.roomName);
  const fallbackUrl = usesLiveKit ? "" : stream.playbackUrl || stream.streamUrl || "";

  const setVideoRef = (element: HTMLVideoElement | null) => {
    internalVideoRef.current = element;
    videoRef(element);
  };

  const setInputRef = (element: HTMLInputElement | null) => {
    localInputRef.current = element;
    if (typeof commentRef === "function") commentRef(element);
    else if (commentRef) commentRef.current = element;
  };

  useEffect(() => {
    const video = internalVideoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = internalVideoRef.current;
    if (!video || !fallbackUrl) return;

    video.src = fallbackUrl;
    video.load();
    void video.play().catch(() => {});

    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [fallbackUrl]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = comment.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSend(text);
      setComment("");
    } finally {
      setSending(false);
    }
  };

  const recent = messages.slice(-4).reverse();
  const name = stream.displayName || stream.username || "Fockis creator";
  const hasVideo = usesLiveKit || !!fallbackUrl;

  return (
    <section className="viewer-stage" aria-label={`${name} live video`}>
      <div className="viewer-stage__frame">
        <video
          ref={setVideoRef}
          className="viewer-stage__video"
          autoPlay
          playsInline
          muted={muted}
          controls={false}
          preload="auto"
        />

        {!hasVideo && (
          <div className="viewer-stage__state">
            <strong>Live video unavailable</strong>
            <span>The creator hasn't started sending video yet.</span>
          </div>
        )}

        {hasVideo && !connected && usesLiveKit && (
          <div className="viewer-stage__state" role="status">
            <Loader2 size={28} className="viewer-spin" aria-hidden="true" />
            <span>Connecting to live video…</span>
          </div>
        )}

        <div className="viewer-stage__shade" aria-hidden="true" />

        {/* ---------------------------------------------------- identity */}
        <div className="viewer-stage__top">
          <span className="viewer-stage__ring">
            {stream.avatarUrl ? (
              <img src={stream.avatarUrl} alt="" />
            ) : (
              <span>{name.charAt(0).toUpperCase()}</span>
            )}
          </span>

          <div className="viewer-stage__identity">
            <span className="viewer-stage__row">
              <strong>@{stream.username || name}</strong>
              <button
                type="button"
                className={`viewer-follow ${isFollowing ? "viewer-follow--on" : ""}`}
                onClick={onFollow}
                aria-pressed={isFollowing}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={15} aria-hidden="true" />
                    Following
                  </>
                ) : (
                  "+ Follow"
                )}
              </button>
            </span>
            <span className="viewer-stage__meta">
              {formatCount(stream.viewers)} viewers
            </span>
          </div>
        </div>

        {muted && hasVideo && (
          <button type="button" className="viewer-stage__unmute" onClick={onToggleMute}>
            <VolumeX size={16} aria-hidden="true" />
            Tap to unmute
          </button>
        )}

        <ViewerActions
          likes={stream.likes}
          liked={liked}
          comments={messages.length}
          muted={muted}
          sharing={sharing}
          onLike={onLike}
          onComment={() => localInputRef.current?.focus()}
          onShare={onShare}
          onToggleMute={onToggleMute}
        />

        {/* ---------------------------------------------------- comments */}
        <div className="viewer-stage__bottom">
          {recent.length > 0 && (
            <ul className="viewer-comments" aria-label="Recent comments">
              {recent.map((item, index) => {
                const author = item.displayName || item.username || "Viewer";
                return (
                  <li className="viewer-comment" key={item.id || `${index}-${item.createdAt ?? ""}`}>
                    <span className="viewer-comment__avatar" aria-hidden="true">
                      {item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : author.charAt(0).toUpperCase()}
                    </span>
                    <span className="viewer-comment__body">
                      <span className="viewer-comment__meta">
                        <strong>{author}</strong>
                        {item.createdAt && <> · {formatRelativeTime(item.createdAt)}</>}
                      </span>
                      <span className="viewer-comment__text">{item.message}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <form className="viewer-composer" onSubmit={submit}>
            <div className="viewer-composer__field">
              <label htmlFor="viewer-stage-comment" className="viewer-sr-only">Add a comment</label>
              <input
                id="viewer-stage-comment"
                ref={setInputRef}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                autoComplete="off"
                enterKeyHint="send"
              />
              <button
                type="button"
                className="viewer-composer__emoji"
                aria-label="Add a heart"
                onClick={() => {
                  setComment((value) => `${value}💙`);
                  localInputRef.current?.focus();
                }}
              >
                <Smile size={22} />
              </button>
            </div>
            <button type="submit" className="viewer-composer__send" disabled={!comment.trim() || sending} aria-label="Post comment">
              <SendHorizontal size={21} />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
});

export default ViewerStage;
