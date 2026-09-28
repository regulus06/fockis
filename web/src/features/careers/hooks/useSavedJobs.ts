// web/src/features/careers/hooks/useSavedJobs.ts

import { create } from "zustand";

import { savedJobsApi } from "../services/savedJobsApi";

import type {
  SavedJob,
} from "../types";

/* ============================================================
   HELPERS
============================================================ */

function extractJobId(
  item: SavedJob & {
    job?: unknown;
  },
): string | null {
  const jobId = item.jobId;

  /*
   * Normal SavedJob response:
   *
   * {
   *   jobId: "665..."
   * }
   */
  if (typeof jobId === "string") {
    return jobId;
  }

  /*
   * Handle populated MongoDB ObjectId:
   *
   * {
   *   jobId: {
   *     _id: "665..."
   *   }
   * }
   */
  if (
    jobId &&
    typeof jobId === "object"
  ) {
    const value =
      jobId as {
        _id?: unknown;
        id?: unknown;
      };

    if (
      typeof value._id === "string"
    ) {
      return value._id;
    }

    if (
      typeof value.id === "string"
    ) {
      return value.id;
    }
  }

  return null;
}

/* ============================================================
   STATE
============================================================ */

interface SavedJobsState {
  savedJobIds: Set<string>;

  isLoading: boolean;

  load: () => Promise<void>;

  toggleSave: (
    jobId: string,
  ) => Promise<void>;

  isSaved: (
    jobId: string,
  ) => boolean;
}

/* ============================================================
   SAVED JOBS STORE
============================================================ */

export const useSavedJobs =
  create<SavedJobsState>(
    (set, get) => ({
      savedJobIds:
        new Set<string>(),

      isLoading: false,

      /* ======================================================
         LOAD SAVED JOBS

         GET /careers/saved-jobs
      ====================================================== */

      load: async () => {
        set({
          isLoading: true,
        });

        try {
          const saved =
            await savedJobsApi.getSavedJobs();

          const ids =
            Array.isArray(saved)
              ? saved
                  .map((item) =>
                    extractJobId(
                      item,
                    ),
                  )
                  .filter(
                    (
                      id,
                    ): id is string =>
                      Boolean(
                        id &&
                          id.trim(),
                      ),
                  )
              : [];

          set({
            savedJobIds:
              new Set<string>(
                ids,
              ),
          });
        } catch {
          /*
           * Do not keep stale saved-job
           * state when loading fails.
           */

          set({
            savedJobIds:
              new Set<string>(),
          });
        } finally {
          set({
            isLoading: false,
          });
        }
      },

      /* ======================================================
         TOGGLE SAVE

         SAVE:
         POST /careers/saved-jobs/:jobId

         UNSAVE:
         DELETE /careers/saved-jobs/:jobId
      ====================================================== */

      toggleSave: async (
        jobId: string,
      ) => {
        const normalizedJobId =
          jobId.trim();

        if (!normalizedJobId) {
          return;
        }

        const alreadySaved =
          get().savedJobIds.has(
            normalizedJobId,
          );

        /*
         * ----------------------------------------------------
         * OPTIMISTIC UPDATE
         * ----------------------------------------------------
         */

        set((state) => {
          const next =
            new Set<string>(
              state.savedJobIds,
            );

          if (alreadySaved) {
            next.delete(
              normalizedJobId,
            );
          } else {
            next.add(
              normalizedJobId,
            );
          }

          return {
            savedJobIds: next,
          };
        });

        try {
          /*
           * --------------------------------------------------
           * UNSAVE
           * --------------------------------------------------
           */

          if (alreadySaved) {
            await savedJobsApi.unsaveJob(
              normalizedJobId,
            );

            return;
          }

          /*
           * --------------------------------------------------
           * SAVE
           * --------------------------------------------------
           */

          await savedJobsApi.saveJob(
            normalizedJobId,
          );
        } catch (error) {
          /*
           * --------------------------------------------------
           * ROLLBACK
           * --------------------------------------------------
           */

          set((state) => {
            const next =
              new Set<string>(
                state.savedJobIds,
              );

            if (alreadySaved) {
              /*
               * Unsave failed.
               * Restore saved state.
               */
              next.add(
                normalizedJobId,
              );
            } else {
              /*
               * Save failed.
               * Remove optimistic state.
               */
              next.delete(
                normalizedJobId,
              );
            }

            return {
              savedJobIds: next,
            };
          });

          throw error;
        }
      },

      /* ======================================================
         CHECK LOCAL SAVED STATE
      ====================================================== */

      isSaved: (
        jobId: string,
      ) => {
        if (!jobId) {
          return false;
        }

        return get()
          .savedJobIds
          .has(
            jobId.trim(),
          );
      },
    }),
  );