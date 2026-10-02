import { useState } from "react";

import {
  contentMonetizationApi,
} from "../services/contentMonetizationApi";

import {
  useContentMonetizationStore,
} from "../store/contentMonetizationStore";

import type {
  MonetizedContent,
  ContentPurchaseType,
} from "../types/contentMonetization.types";

export const useContentPurchase = () => {
  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const unlockContent =
    useContentMonetizationStore(
      (state) => state.unlockContent,
    );

  const addPurchase =
    useContentMonetizationStore(
      (state) => state.addPurchase,
    );

  const purchase = async (
    content: MonetizedContent,
    purchaseType: ContentPurchaseType,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result =
        await contentMonetizationApi.purchaseContent({
          contentId: content.id,
          purchaseType,
        });

      if (!result.success) {
        throw new Error(
          "Unable to unlock this content.",
        );
      }

      unlockContent(
        content.id,
        purchaseType,
      );

      addPurchase({
        id: crypto.randomUUID(),

        contentId: content.id,

        purchaseType,

        paymentMethod:
          result.paymentMethod,

        amount: result.amount,

        status: "completed",

        createdAt:
          new Date().toISOString(),
      });

      return result;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Purchase failed.";

      setError(message);

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    purchase,

    loading,

    error,
  };
};