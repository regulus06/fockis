import { useMemo } from "react";

import {
  useContentMonetizationStore,
} from "../store/contentMonetizationStore";

import type {
  MonetizedContent,
  ContentPurchaseType,
} from "../types/contentMonetization.types";

export const useContentAccess = (
  content: MonetizedContent,
) => {
  const access =
    useContentMonetizationStore(
      (state) =>
        state.access[content.id],
    );

  const isUnlocked =
    useContentMonetizationStore(
      (state) => state.isUnlocked,
    );

  const checkAccess = (
    purchaseType: ContentPurchaseType,
  ): boolean => {
    if (!content.monetization.enabled) {
      return true;
    }

    return isUnlocked(
      content.id,
      purchaseType,
    );
  };

  const requiresPayment = useMemo(
    () =>
      content.monetization.enabled,
    [content.monetization.enabled],
  );

  return {
    access,

    requiresPayment,

    canWatch:
      content.type === "video"
        ? checkAccess("watch")
        : false,

    canListen:
      content.type === "music"
        ? checkAccess("listen")
        : false,

    canDownload:
      content.monetization.downloadEnabled
        ? checkAccess("download")
        : false,

    checkAccess,
  };
};