import { create } from 'zustand';
import { savedJobsApi, type SavedJobEntry } from '../services/savedJobsApi';

interface SavedJobsState {
  entries: SavedJobEntry[];
  savedJobIds: Set<string>;
  loaded: boolean;
  isLoading: boolean;
  error: string | null;
  load: (force?: boolean) => Promise<void>;
  toggleSave: (jobId: string) => Promise<boolean>;
  isSaved: (jobId: string) => boolean;
}

/**
 * Saved jobs, shared by every Careers page.
 * GET/POST/DELETE /careers/saved-jobs
 */
export const useSavedJobs = create<SavedJobsState>((set, get) => {
  const pending = new Set<string>();
  let requestId = 0;

  return {
    entries: [],
    savedJobIds: new Set(),
    loaded: false,
    isLoading: false,
    error: null,

    load: async (force = false) => {
      if (get().loaded && !force) return;
      const current = ++requestId;
      set({ isLoading: true, error: null });
      try {
        const entries = await savedJobsApi.getSavedJobs();
        if (current !== requestId) return;
        set({ entries, savedJobIds: new Set(entries.map((e) => e.jobId)), loaded: true });
      } catch (error) {
        if (current === requestId) set({ error: error instanceof Error ? error.message : 'Unable to load saved jobs.' });
      } finally {
        if (current === requestId) set({ isLoading: false });
      }
    },

    /** Returns the new saved state. Rolls back and throws on failure. */
    toggleSave: async (jobId: string) => {
      const id = jobId?.trim();
      if (!id) throw new Error('Job ID is required.');
      if (pending.has(id)) return get().savedJobIds.has(id);
      pending.add(id);
      const wasSaved = get().savedJobIds.has(id);
      const flip = (saved: boolean) =>
        set((state) => {
          const next = new Set(state.savedJobIds);
          if (saved) next.add(id);
          else next.delete(id);
          return {
            savedJobIds: next,
            entries: saved ? state.entries : state.entries.filter((e) => e.jobId !== id),
          };
        });
      flip(!wasSaved);
      try {
        if (wasSaved) await savedJobsApi.unsaveJob(id);
        else await savedJobsApi.saveJob(id);
        if (!wasSaved) void get().load(true);
        return !wasSaved;
      } catch (error) {
        flip(wasSaved);
        throw error;
      } finally {
        pending.delete(id);
      }
    },

    isSaved: (jobId: string) => get().savedJobIds.has(jobId?.trim()),
  };
});
