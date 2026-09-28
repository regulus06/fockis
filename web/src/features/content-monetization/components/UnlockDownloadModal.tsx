import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

import {
  useContentPurchase,
} from "../hooks/useContentPurchase";

import ContentPriceBadge from "./ContentPriceBadge";

interface UnlockDownloadModalProps {
  content: MonetizedContent;

  open: boolean;

  onClose: () => void;
}

export default function UnlockDownloadModal({
  content,
  open,
  onClose,
}: UnlockDownloadModalProps) {
  const {
    purchase,
    loading,
    error,
  } = useContentPurchase();

  if (!open) {
    return null;
  }

  const handleUnlock = async () => {
    await purchase(
      content,
      "download",
    );

    onClose();
  };

  return (
    <div className="unlock-modal-backdrop">
      <div className="unlock-modal">
        <button
          type="button"
          className="unlock-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="unlock-modal-icon">
          ⬇️
        </div>

        <h2>
          Unlock Download
        </h2>

        <p>
          The creator requires a separate
          purchase to download this content.
        </p>

        <div className="unlock-modal-content">
          {content.thumbnailUrl && (
            <img
              src={content.thumbnailUrl}
              alt={content.title}
            />
          )}

          <div>
            <strong>
              {content.title}
            </strong>

            <span>
              {content.type === "video"
                ? "Video"
                : "Music"}
            </span>
          </div>
        </div>

        <div className="unlock-modal-price">
          <span>
            Download
          </span>

          <ContentPriceBadge
            content={content}
            purchaseType="download"
          />
        </div>

        {error && (
          <div className="unlock-error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="unlock-primary-button"
          disabled={loading}
          onClick={handleUnlock}
        >
          {loading
            ? "Unlocking..."
            : "Unlock Download"}
        </button>

        <button
          type="button"
          className="unlock-secondary-button"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}