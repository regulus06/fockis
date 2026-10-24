import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

import { travelApi } from "../services/travelApi";
import { wishlistApi } from "../services/wishlistApi";
import type { WishlistItem } from "../services/wishlistApi";

/**
 * ============================================================================
 * FOCKIS TRAVEL — FAVORITES (heart buttons)
 * ============================================================================
 *
 * Thin shared layer over the existing wishlist API:
 *
 *   GET    /travel/wishlist
 *   POST   /travel/wishlist/:listingId
 *   DELETE /travel/wishlist/:listingId
 *
 * One module-level store so every heart on the page shows the same state
 * after a single load. Signed-out visitors are sent to the Travel sign-in
 * page instead of being shown a heart that silently does nothing.
 * ============================================================================
 */

type Status = "idle" | "loading" | "ready" | "error";

let savedIds = new Set<string>();
let status: Status = "idle";
const pending = new Set<string>();
const listeners = new Set<() => void>();
interface FavoritesSnapshot {
  savedIds: Set<string>;
  status: Status;
  pending: Set<string>;
}

let snapshot: FavoritesSnapshot = { savedIds, status, pending: new Set<string>() };

function emit() {
  snapshot = { savedIds, status, pending: new Set(pending) };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function itemListingId(item: WishlistItem): string {
  const direct = item.listingId as unknown;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") {
    const record = direct as Record<string, unknown>;
    if (record._id || record.id) return String(record._id || record.id);
  }
  const listing = item.listing as Record<string, unknown> | undefined;
  if (listing && (listing._id || listing.id)) return String(listing._id || listing.id);
  return "";
}

async function loadFavorites(force = false) {
  if (!travelApi.hasAuthToken()) return;
  if (!force && (status === "loading" || status === "ready")) return;

  status = "loading";
  emit();

  try {
    const items = await wishlistApi.list();
    savedIds = new Set(items.map(itemListingId).filter(Boolean));
    status = "ready";
  } catch (error) {
    console.error("[Fockis Travel] Unable to load wishlist:", error);
    status = "error";
  }

  emit();
}

export function useTravelFavorites() {
  const navigate = useNavigate();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void loadFavorites();
  }, []);

  const isSaved = useCallback(
    (listingId: string) => Boolean(listingId) && state.savedIds.has(listingId),
    [state.savedIds],
  );

  const isPending = useCallback(
    (listingId: string) => state.pending.has(listingId),
    [state.pending],
  );

  const toggle = useCallback(
    async (listingId: string) => {
      if (!listingId) return;

      if (!travelApi.hasAuthToken()) {
        navigate("/travel/sign-in");
        return;
      }

      if (pending.has(listingId)) return;

      const wasSaved = savedIds.has(listingId);
      pending.add(listingId);
      savedIds = new Set(savedIds);
      if (wasSaved) savedIds.delete(listingId);
      else savedIds.add(listingId);
      emit();

      try {
        if (wasSaved) await wishlistApi.remove(listingId);
        else await wishlistApi.add(listingId);
      } catch (error) {
        console.error("[Fockis Travel] Wishlist update failed:", error);
        // Roll back the optimistic change so the heart matches the server.
        savedIds = new Set(savedIds);
        if (wasSaved) savedIds.add(listingId);
        else savedIds.delete(listingId);
      } finally {
        pending.delete(listingId);
        emit();
      }
    },
    [navigate],
  );

  return {
    isSaved,
    isPending,
    toggle,
    status: state.status,
    refresh: () => loadFavorites(true),
  };
}

export default useTravelFavorites;
