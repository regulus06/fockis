import { audienceApi, type ContactQuery } from "../services/audienceApi";
import { useAsync } from "./useAsync";

export function useAudiences() {
  return useAsync(() => audienceApi.audiences(), []);
}

export function useContacts(query: ContactQuery) {
  return useAsync(
    () => audienceApi.contacts(query),
    [query.search, query.status, query.tagId, query.audienceId],
  );
}

export function useContact(id: string | undefined) {
  return useAsync(
    () =>
      id
        ? audienceApi.contact(id)
        : Promise.reject(new Error("No contact selected.")),
    [id],
  );
}

export function useTags() {
  return useAsync(() => audienceApi.tags(), []);
}

/**
 * Segments are not currently exposed by audienceApi.
 *
 * Keep this hook available for pages that import useSegments(),
 * but return an empty result until the segments API is added.
 */
export function useSegments() {
  return useAsync(() => Promise.resolve([]), []);
}