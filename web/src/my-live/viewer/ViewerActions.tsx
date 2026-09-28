import {
  Heart,
  Share2,
  UserPlus,
  UserCheck,
} from "lucide-react";

import { formatCount } from "../utils";

interface ViewerActionsProps {
  likes: number;
  liked: boolean;
  isFollowing: boolean;
  onLike: () => void;
  onFollow: () => void;
  onShare: () => void;
}

export function ViewerActions({
  likes,
  liked,
  isFollowing,
  onLike,
  onFollow,
  onShare,
}: ViewerActionsProps) {
  return (
    <div className="viewer-actions">
      <button
        className={`viewer-action ${
          liked
            ? "viewer-action--active"
            : ""
        }`}
        type="button"
        onClick={onLike}
        aria-label="Like live stream"
      >
        <Heart
          size={20}
          fill={
            liked
              ? "currentColor"
              : "none"
          }
        />

        <span>
          {formatCount(likes)}
        </span>
      </button>

      <button
        className={`viewer-action ${
          isFollowing
            ? "viewer-action--following"
            : ""
        }`}
        type="button"
        onClick={onFollow}
      >
        {isFollowing ? (
          <UserCheck size={19} />
        ) : (
          <UserPlus size={19} />
        )}

        <span>
          {isFollowing
            ? "Following"
            : "Follow"}
        </span>
      </button>

      <button
        className="viewer-action"
        type="button"
        onClick={onShare}
      >
        <Share2 size={19} />

        <span>Share</span>
      </button>
    </div>
  );
}