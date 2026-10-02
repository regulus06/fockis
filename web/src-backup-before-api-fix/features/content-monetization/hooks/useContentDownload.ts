import { useState } from "react";

import {
  contentMonetizationApi,
} from "../services/contentMonetizationApi";

import {
  useContentMonetizationStore,
} from "../store/contentMonetizationStore";

import type {
  MonetizedContent,
} from "../types/contentMonetization.types";

export const useContentDownload = () => {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isUnlocked =
    useContentMonetizationStore(
      (state) => state.isUnlocked,
    );

  const download = async (
    content: MonetizedContent,
  ) => {
    setError(null);

    if (
      !content.monetization.downloadEnabled
    ) {
      setError(
        "Downloads are disabled by the creator.",
      );

      return;
    }

    if (
      !isUnlocked(
        content.id,
        "download",
      )
    ) {
      setError(
        "Download access has not been unlocked.",
      );

      return;
    }

    setLoading(true);

    try {
      const result =
        await contentMonetizationApi.getDownloadUrl(
          content.id,
        );

      const link =
        document.createElement("a");

      link.href = result.downloadUrl;

      link.download =
        content.title || "fockis-content";

      link.target = "_blank";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Download failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    download,

    loading,

    error,
  };
};