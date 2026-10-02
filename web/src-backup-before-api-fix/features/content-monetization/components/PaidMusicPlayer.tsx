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

interface PaidMusicPlayerProps {
  content: MonetizedContent;

  autoPlay?: boolean;
}

export default function PaidMusicPlayer({
  content,
  autoPlay = false,
}: PaidMusicPlayerProps) {
  const [showUnlock, setShowUnlock] =
    useState(false);

  const {
    canListen,
  } = useContentAccess(content);

  if (!canListen) {
    return (
      <>
        <div className="paid-music-player locked">
          <div className="paid-music-art">
            {content.thumbnailUrl ? (
              <img
                src={
                  content.thumbnailUrl
                }
                alt={content.title}
              />
            ) : (
              <span>🎵</span>
            )}
          </div>

          <div className="paid-music-info">
            <strong>
              {content.title}
            </strong>

            <span>
              {content.creatorName ??
                "Creator"}
            </span>

            <div className="paid-music-lock">
              🔒 Music locked
            </div>

            <button
              type="button"
              className="paid-content-button"
              onClick={() =>
                setShowUnlock(true)
              }
            >
              {content.monetization
                .paymentMethod ===
              "coins"
                ? "🪙"
                : "💳"}{" "}
              Listen for{" "}
              {
                content.monetization
                  .listenPrice
              }
            </button>
          </div>
        </div>

        <UnlockContentModal
          content={content}
          purchaseType="listen"
          open={showUnlock}
          onClose={() =>
            setShowUnlock(false)
          }
        />
      </>
    );
  }

  return (
    <div className="paid-music-player">
      <div className="paid-music-art">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
          />
        ) : (
          <span>🎵</span>
        )}
      </div>

      <div className="paid-music-controls">
        <div>
          <strong>
            {content.title}
          </strong>

          <span>
            {content.creatorName ??
              "Creator"}
          </span>
        </div>

        <audio
          src={content.mediaUrl}
          controls
          autoPlay={autoPlay}
          preload="metadata"
        />

        <DownloadButton
          content={content}
        />
      </div>
    </div>
  );
}