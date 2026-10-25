import {
  Forward,
  Gift,
  Heart,
  MessageCircle,
  Volume2,
  VolumeX,
} from "lucide-react";

import { formatCount } from "../utils";

interface ViewerActionsProps {
  likes: number;
  liked: boolean;
  comments: number;
  muted: boolean;
  sharing?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleMute: () => void;
}

/**
 * Floating interaction rail on the right of the viewer stage.
 */
export function ViewerActions({
  likes,
  liked,
  comments,
  muted,
  sharing = false,
  onLike,
  onComment,
  onShare,
  onToggleMute,
}: ViewerActionsProps) {
  return (
    <div className="viewer-rail" role="group" aria-label="Live actions">
      <button
        className={`viewer-rail__btn ${liked ? "viewer-rail__btn--liked" : ""}`}
        type="button"
        onClick={onLike}
        aria-pressed={liked}
        aria-label={liked ? `Unlike (${likes} likes)` : `Like (${likes} likes)`}
      >
        <Heart size={30} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        <span>{formatCount(likes)}</span>
      </button>

      <button
        className="viewer-rail__btn"
        type="button"
        onClick={onComment}
        aria-label={`${comments} comments — write a comment`}
      >
        <MessageCircle size={28} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        <span>{formatCount(comments)}</span>
      </button>

      <button
        className="viewer-rail__btn"
        type="button"
        onClick={onShare}
        disabled={sharing}
        aria-label="Share this live"
      >
        <Forward size={30} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
        <span>Share</span>
      </button>

      <button
        className="viewer-rail__btn"
        type="button"
        onClick={onToggleMute}
        aria-pressed={!muted}
        aria-label={muted ? "Unmute live" : "Mute live"}
      >
        {muted ? <VolumeX size={26} aria-hidden="true" /> : <Volume2 size={26} aria-hidden="true" />}
        <span>{muted ? "Sound" : "Mute"}</span>
      </button>

      <button
        className="viewer-rail__btn viewer-rail__btn--gift"
        type="button"
        disabled
        title="Sending gifts from the web player isn't available yet"
        aria-label="Gifts (not available yet)"
      >
        <Gift size={32} aria-hidden="true" />
        <span>Gift</span>
      </button>
    </div>
  );
}
