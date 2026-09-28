import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  AiJob,
  CreateAiJobInput,
} from "../types/aiTypes";

import { aiApi } from "../services/aiApi";

const POLL_INTERVAL = 1500;

const ACTIVE_STATUSES = new Set([
  "queued",
  "pending",
  "processing",
  "generating",
  "rendering",
]);

const SUCCESS_STATUSES = new Set([
  "completed",
  "complete",
  "succeeded",
  "success",
]);

const FAILED_STATUSES = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
]);

export function useAiGeneration() {
  const [job, setJob] = useState<AiJob>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const pollingRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;

      if (pollingRef.current !== null) {
        window.clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    async (jobId: string) => {
      if (!mountedRef.current) {
        return;
      }

      try {
        const updatedJob = await aiApi.getJob(jobId);

        if (!mountedRef.current) {
          return;
        }

        setJob(updatedJob);

        const status = String(
          updatedJob.status || "",
        ).toLowerCase();

        if (
          SUCCESS_STATUSES.has(status) ||
          FAILED_STATUSES.has(status)
        ) {
          stopPolling();

          if (FAILED_STATUSES.has(status)) {
            setError(
              updatedJob.error ||
                `AI job ${status}.`,
            );
          }

          setLoading(false);
          return;
        }

        if (ACTIVE_STATUSES.has(status) || !status) {
          pollingRef.current = window.setTimeout(
            () => {
              void pollJob(jobId);
            },
            POLL_INTERVAL,
          );

          return;
        }

        /**
         * Unknown status:
         * keep polling rather than incorrectly marking
         * the generation as completed.
         */
        pollingRef.current = window.setTimeout(
          () => {
            void pollJob(jobId);
          },
          POLL_INTERVAL,
        );
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Unable to check AI generation status.";

        setError(message);
        setLoading(false);
        stopPolling();
      }
    },
    [stopPolling],
  );

  const generate = useCallback(
    async (input: CreateAiJobInput) => {
      stopPolling();

      setLoading(true);
      setError(undefined);
      setJob(undefined);

      try {
        /**
         * POST /ai/jobs
         */
        const createdJob = await aiApi.createJob(input);

        if (!mountedRef.current) {
          return createdJob;
        }

        setJob(createdJob);

        const status = String(
          createdJob.status || "",
        ).toLowerCase();

        /**
         * If the backend completed immediately,
         * don't start polling.
         */
        if (SUCCESS_STATUSES.has(status)) {
          setLoading(false);
          return createdJob;
        }

        /**
         * If the backend immediately rejected/cancelled
         * the job, surface that state.
         */
        if (FAILED_STATUSES.has(status)) {
          setError(
            createdJob.error ||
              `AI job ${status}.`,
          );

          setLoading(false);
          return createdJob;
        }

        /**
         * Normal flow:
         *
         * POST /ai/jobs
         *       ↓
         * queued
         *       ↓
         * processing
         *       ↓
         * completed
         */
        pollingRef.current = window.setTimeout(
          () => {
            void pollJob(createdJob.id);
          },
          POLL_INTERVAL,
        );

        return createdJob;
      } catch (err) {
        if (!mountedRef.current) {
          throw err;
        }

        const message =
          err instanceof Error
            ? err.message
            : "Generation failed.";

        setError(message);
        setLoading(false);

        throw err;
      }
    },
    [pollJob, stopPolling],
  );

  const cancel = useCallback(async () => {
    if (!job?.id) {
      return;
    }

    try {
      const cancelledJob =
        await aiApi.cancelJob(job.id);

      if (!mountedRef.current) {
        return cancelledJob;
      }

      setJob(cancelledJob);
      setLoading(false);
      stopPolling();

      return cancelledJob;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to cancel AI generation.";

      if (mountedRef.current) {
        setError(message);
      }

      throw err;
    }
  }, [job?.id, stopPolling]);

  return {
    job,
    loading,
    error,
    generate,
    cancel,
  };
}

export default useAiGeneration;