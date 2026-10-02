import {
  useState,
} from "react";

import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

import {
  useContentAccess,
} from "../hooks/useContentAccess";

import UnlockContentModal from "./UnlockContentModal";
import DownloadButton from "./DownloadButton";

interface PaidVideoPlayerProps {
  content: MonetizedContent;

  autoPlay?: boolean;

  controls?: boolean;
}

export default function PaidVideoPlayer({
  content,
  autoPlay = false,
  controls = true,
}: PaidVideoPlayerProps) {
  const [showUnlock, setShowUnlock] =
    useState(false);

  const {
    canWatch,
  } = useContentAccess(content);

  if (!canWatch) {
    return (
      <>
        <div className="paid-video-player locked">
          {content.thumbnailUrl && (
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              className="paid-video-thumbnail"
            />
          )}

          <div className="paid-video-overlay">
            <div className="paid-video-lock">
              🔒
            </div>

            <h3>
              Paid Video
            </h3>

            <p>
              Unlock this video to watch it.
            </p>

            <button
              type="button"
              onClick={() =>
                setShowUnlock(true)
              }
              className="paid-content-button"
            >
              {content.monetization
                .paymentMethod ===
              "coins"
                ? "🪙"
                : "💳"}{" "}
              Unlock for{" "}
              {
                content.monetization
                  .watchPrice
              }
            </button>
          </div>
        </div>

        <UnlockContentModal
          content={content}
          purchaseType="watch"
          open={showUnlock}
          onClose={() =>
            setShowUnlock(false)
          }
        />
      </>
    );
  }

  return (
    <div className="paid-video-player">
      <video
        src={content.mediaUrl}
        poster={content.thumbnailUrl}
        controls={controls}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
      />

      <div className="paid-media-actions">
        <DownloadButton
          content={content}
        />
      </div>
    </div>
  );
}