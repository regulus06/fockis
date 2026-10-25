import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../api";
import type { Guest } from "../types";

/**
 * Searches Fockis users through the existing api.searchUsers endpoint and
 * maps them onto the studio Guest model. Debounced, and stale responses are
 * ignored so fast typing never shows results for an older query.
 */
export function useGuestSearch(excludeIds: Set<string>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Guest[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);
  const excludeRef = useRef(excludeIds);

  useEffect(() => {
    excludeRef.current = excludeIds;
  }, [excludeIds]);

  useEffect(() => {
    const trimmed = query.trim();
    const requestId = ++requestRef.current;

    if (!trimmed) {
      setResults([]);
      setSearching(false);
      setError(null);
      return;
    }

    setSearching(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const users = await api.searchUsers(trimmed);

        if (requestId !== requestRef.current) return;

        const mapped = users
          .map((user) => {
            const id = String(user.id ?? user._id ?? "").trim();
            const fullName = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ");
            const name =
              String(
                user.displayName ??
                  user.name ??
                  (fullName || user.username) ??
                  "Fockis User",
              ).trim() || "Fockis User";

            if (!id || excludeRef.current.has(id)) return null;

            const guest: Guest = {
              id,
              name,
              username: user.username,
              avatarUrl: user.profilePicture ?? user.avatar,
              avatarTone: "signal",
              status: "invited",
            };

            return guest;
          })
          .filter((item): item is Guest => item !== null);

        setResults(mapped);
      } catch (searchError) {
        if (requestId !== requestRef.current) return;

        console.error("[FOCKIS LIVE] Guest user search failed:", searchError);
        setResults([]);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Unable to search Fockis users.",
        );
      } finally {
        if (requestId === requestRef.current) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const clear = useCallback(() => setQuery(""), []);

  return { query, setQuery, results, searching, error, clear };
}
