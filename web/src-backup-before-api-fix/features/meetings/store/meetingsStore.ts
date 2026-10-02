import { create } from "zustand";

import type { Meeting } from "../types";
import { meetingsApi } from "../services/meetingsApi";

interface MeetingsState {
  meetings: Meeting[];
  upcoming: Meeting[];
  today: Meeting[];
  recent: Meeting[];

  isLoading: boolean;
  error: string | null;

  loadMeetings: () => Promise<void>;
  loadUpcoming: () => Promise<void>;
  loadToday: () => Promise<void>;
  loadRecent: () => Promise<void>;

  getById: (id: string) => Meeting | undefined;

  setMeetings: (meetings: Meeting[]) => void;
}

/* ============================================================================
 * Helpers
 * ========================================================================== */

function mergeMeetings(
  ...lists: Meeting[][]
): Meeting[] {
  const map = new Map<string, Meeting>();

  for (const list of lists) {
    for (const meeting of list) {
      if (!meeting?.id) {
        continue;
      }

      map.set(meeting.id, meeting);
    }
  }

  return Array.from(map.values());
}

function getError(
  result:
    | { ok: true; data: Meeting[] }
    | { ok: false; error: string },
): string | null {
  return result.ok ? null : result.error;
}

/* ============================================================================
 * Store
 * ========================================================================== */

export const useMeetingsStore =
  create<MeetingsState>((set, get) => ({
    meetings: [],
    upcoming: [],
    today: [],
    recent: [],

    isLoading: false,
    error: null,

    /* ==========================================================================
     * LOAD ALL MEETINGS
     * ======================================================================== */

    loadMeetings: async () => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const [
          upcomingResult,
          todayResult,
          recentResult,
        ] = await Promise.all([
          meetingsApi.listUpcoming(),
          meetingsApi.listToday(),
          meetingsApi.listRecent(),
        ]);

        const upcomingData =
          upcomingResult.ok
            ? upcomingResult.data
            : [];

        const todayData =
          todayResult.ok
            ? todayResult.data
            : [];

        const recentData =
          recentResult.ok
            ? recentResult.data
            : [];

        const merged = mergeMeetings(
          upcomingData,
          todayData,
          recentData,
        );

        const errors = [
          getError(upcomingResult),
          getError(todayResult),
          getError(recentResult),
        ].filter(
          (message): message is string =>
            Boolean(message),
        );

        set({
          meetings: merged,
          upcoming: upcomingData,
          today: todayData,
          recent: recentData,
          isLoading: false,
          error:
            errors.length > 0
              ? errors.join(" • ")
              : null,
        });
      } catch (error) {
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load meetings.",
        });
      }
    },

    /* ==========================================================================
     * LOAD UPCOMING
     * ======================================================================== */

    loadUpcoming: async () => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const result =
          await meetingsApi.listUpcoming();

        if (!result.ok) {
          set({
            isLoading: false,
            error: result.error,
          });

          return;
        }

        set((state) => ({
          upcoming: result.data,
          meetings: mergeMeetings(
            state.meetings,
            result.data,
          ),
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load upcoming meetings.",
        });
      }
    },

    /* ==========================================================================
     * LOAD TODAY
     * ======================================================================== */

    loadToday: async () => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const result =
          await meetingsApi.listToday();

        if (!result.ok) {
          set({
            isLoading: false,
            error: result.error,
          });

          return;
        }

        set((state) => ({
          today: result.data,
          meetings: mergeMeetings(
            state.meetings,
            result.data,
          ),
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load today's meetings.",
        });
      }
    },

    /* ==========================================================================
     * LOAD RECENT
     * ======================================================================== */

    loadRecent: async () => {
      set({
        isLoading: true,
        error: null,
      });

      try {
        const result =
          await meetingsApi.listRecent();

        if (!result.ok) {
          set({
            isLoading: false,
            error: result.error,
          });

          return;
        }

        set((state) => ({
          recent: result.data,
          meetings: mergeMeetings(
            state.meetings,
            result.data,
          ),
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        set({
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load recent meetings.",
        });
      }
    },

    /* ==========================================================================
     * FIND ONE MEETING
     * ======================================================================== */

    getById: (id: string) => {
      return get().meetings.find(
        (meeting) =>
          meeting.id === id,
      );
    },

    /* ==========================================================================
     * SET MEETINGS
     * ======================================================================== */

    setMeetings: (meetings: Meeting[]) => {
      const cleanMeetings =
        meetings.filter(
          (meeting) =>
            Boolean(meeting?.id),
        );

      set({
        meetings: cleanMeetings,
      });
    },
  }));