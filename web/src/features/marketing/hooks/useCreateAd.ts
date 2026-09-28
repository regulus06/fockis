import { useCallback, useState } from "react";

import { createAd } from "../services/marketingApi";

import type {
  Advertisement,
  CreateAdPayload,
} from "../types/marketingTypes";

export function useCreateAd() {
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const submit = useCallback(
    async (
      payload: CreateAdPayload,
    ): Promise<Advertisement> => {
      setSubmitting(true);
      setError(null);

      try {
        console.log(
          "[Fockis Marketing] POST /marketing/ads",
          payload,
        );

        const created =
          await createAd(payload);

        console.log(
          "[Fockis Marketing] createAd response:",
          created,
        );

        /*
         * Do not silently convert a missing response
         * into null. If the backend says 200 but returns
         * nothing, make that an explicit error.
         */
        if (!created) {
          throw new Error(
            "The server created the advertisement but returned an empty response.",
          );
        }

        return created;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to create advertisement.";

        console.error(
          "[Fockis Marketing] Create ad failed:",
          err,
        );

        setError(message);

        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return {
    submit,
    submitting,
    error,
  };
}