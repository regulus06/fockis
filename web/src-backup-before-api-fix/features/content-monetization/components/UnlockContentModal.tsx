import type {
  MonetizedContent,
  ContentPurchaseType,
} from "../types/contentMonetization.types";

import {
  useContentPurchase,
} from "../hooks/useContentPurchase";

import ContentPriceBadge from "./ContentPriceBadge";

interface UnlockContentModalProps {
  content: MonetizedContent;

  purchaseType:
    | "watch"
    | "listen";

  open: boolean;

  onClose: () => void;
}

export default function UnlockContentModal({
  content,
  purchaseType,
  open,
  onClose,
}: UnlockContentModalProps) {
  const {
    purchase,
    loading,
    error,
  } = useContentPurchase();

  if (!open) {
    return null;
  }

  const action =
    purchaseType === "watch"
      ? "Watch"
      : "Listen";

  const description =
    purchaseType === "watch"
      ? "Unlock this video to watch it."
      : "Unlock this music to listen to it.";

  const handlePurchase = async () => {
    await purchase(
      content,
      purchaseType,
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
          🔒
        </div>

        <h2>
          Unlock {content.type === "video"
            ? "Video"
            : "Music"}
        </h2>

        <p>
          {description}
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
              Creator:{" "}
              {content.creatorName ??
                "Creator"}
            </span>
          </div>
        </div>

        <div className="unlock-modal-price">
          <span>
            {action}
          </span>

          <ContentPriceBadge
            content={content}
            purchaseType={
              purchaseType
            }
          />
        </div>

        {content.monetization
          .downloadIncluded &&
          content.monetization
            .downloadEnabled && (
            <div className="unlock-download-included">
              ✓ Download included with
              this purchase
            </div>
          )}

        {error && (
          <div className="unlock-error">
            {error}
          </div>
        )}

        <button
          type="button"
          className="unlock-primary-button"
          disabled={loading}
          onClick={handlePurchase}
        >
          {loading
            ? "Unlocking..."
            : `Unlock ${action}`}
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