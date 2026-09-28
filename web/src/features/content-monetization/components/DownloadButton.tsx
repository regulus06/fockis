import { useState } from "react";

import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

import {
  useContentAccess,
} from "../hooks/useContentAccess";

import {
  useContentDownload,
} from "../hooks/useContentDownload";

import UnlockDownloadModal from "./UnlockDownloadModal";

interface DownloadButtonProps {
  content: MonetizedContent;
}

export default function DownloadButton({
  content,
}: DownloadButtonProps) {
  const [showModal, setShowModal] =
    useState(false);

  const {
    canDownload,
  } = useContentAccess(content);

  const {
    download,
    loading,
  } = useContentDownload();

  if (
    !content.monetization
      .downloadEnabled
  ) {
    return null;
  }

  const handleDownload = async () => {
    if (canDownload) {
      await download(content);

      return;
    }

    if (
      content.monetization
        .downloadIncluded
    ) {
      return;
    }

    setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        className="content-download-button"
        onClick={handleDownload}
        disabled={loading}
      >
        <span>
          ⬇️
        </span>

        <span>
          {loading
            ? "Preparing..."
            : canDownload
              ? "Download"
              : content.monetization
                    .downloadIncluded
                ? "Download"
                : "Unlock Download"}
        </span>

        {!canDownload &&
          !content.monetization
            .downloadIncluded && (
            <span className="download-price">
              {content.monetization
                .paymentMethod ===
              "coins"
                ? "🪙"
                : "💳"}{" "}
              {
                content.monetization
                  .downloadPrice
              }
            </span>
          )}
      </button>

      <UnlockDownloadModal
        content={content}
        open={showModal}
        onClose={() =>
          setShowModal(false)
        }
      />
    </>
  );
}