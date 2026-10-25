import { useMemo, useRef } from "react";

import {
  shouldShowAdAtIndex,
} from "../../features/marketing/utils/adFrequency";

import {
  BUSINESS_RAIL_AFTER_POST,
  DEALS_RAIL_AFTER_POST,
  EVENTS_RAIL_AFTER_POST,
  getRailAfterPost,
} from "./railInsertionConfig";

/* ============================================================================
   FOCKIS SHOP PRODUCTS IN THE FEED SEQUENCE

   The backend returns eligible Fockis Shop products next to each feed page
   (`res.products`). They are not posts, so they are not stored as posts and
   never get fake post IDs. Instead, each product is attached to a real post
   ("anchor") and rendered directly after it, the same way ads, events and
   rails are inserted.

   Rules:
   - Only For You and Latest show products. Following and Friends stay
     limited to people the viewer follows / is friends with.
   - A product is shown at most once per feed session (deduped by its real
     product ID), across background refreshes and infinite scroll.
   - Placement is sticky: once a product is attached to a post it stays there
     for the rest of the session, so ordinary re-renders never move it.
   - Products are only attached to posts the first time those posts enter the
     feed. A product that arrives later (from a poll) is never pushed into the
     part of the feed the user has already scrolled past, so the scroll
     position does not jump.
   - Each feed session gets its own seed, so a genuine refresh (new session,
     mode change, pull to refresh) produces a different but stable order.
============================================================================ */

export type FeedProduct = Record<string, any>;

/** Feed modes that may contain Fockis Shop product posts. */
export const FEED_PRODUCT_MODES: ReadonlySet<string> = new Set([
  "for-you",
  "latest",
]);

export const FEED_PRODUCT_PLACEMENT = {
  /** The first product appears after one of these 1-based post positions. */
  firstSlotPositions: [3, 7] as const,
  /** Minimum organic posts between two product posts. */
  minPostsBetween: 6,
};

export function getFeedProductId(product: unknown): string {
  if (!product || typeof product !== "object") {
    return "";
  }

  const record = product as Record<string, unknown>;
  const raw = record._id ?? record.id;

  if (raw === null || raw === undefined) {
    return "";
  }

  if (typeof raw === "object") {
    const nested = raw as Record<string, unknown>;
    const value = nested.$oid ?? nested._id ?? String(raw);

    return typeof value === "string" && value !== "[object Object]"
      ? value.trim()
      : "";
  }

  return String(raw).trim();
}

/**
 * Mirrors the backend's feed eligibility (active, configured for the feed,
 * not expired) so a product that expires while the page is open stops being
 * placed, without trusting the client to widen the backend's rules.
 */
export function isFeedProductEligible(
  product: FeedProduct,
  nowMs: number = Date.now(),
): boolean {
  if (!getFeedProductId(product)) {
    return false;
  }

  if (product.isActive === false) {
    return false;
  }

  if (
    Array.isArray(product.displayLocations) &&
    !product.displayLocations.includes("feed")
  ) {
    return false;
  }

  if (product.feedExpiresAt) {
    const expiresAt = new Date(product.feedExpiresAt).getTime();

    if (Number.isFinite(expiresAt) && expiresAt <= nowMs) {
      return false;
    }
  }

  return true;
}

/** FNV-1a, enough to give each session a stable pseudo-random order. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/**
 * A slot after post `index` must not stack on top of an ad slot or one of
 * the fixed rails (businesses, deals, events, friends).
 */
function isOpenSlot(index: number): boolean {
  const position = index + 1;

  if (shouldShowAdAtIndex(index, 0)) {
    return false;
  }

  if (
    position === BUSINESS_RAIL_AFTER_POST ||
    position === DEALS_RAIL_AFTER_POST ||
    position === EVENTS_RAIL_AFTER_POST
  ) {
    return false;
  }

  return getRailAfterPost(index) === null;
}

interface PlacementState {
  mode: string;
  seed: number;
  /** Post render key → product ID. */
  assignments: Map<string, string>;
  /** Post render keys that have already been considered for a slot. */
  visited: Set<string>;
}

function createState(mode: string): PlacementState {
  return {
    mode,
    seed: (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0,
    assignments: new Map(),
    visited: new Set(),
  };
}

const EMPTY_PLACEMENTS: ReadonlyMap<string, FeedProduct> = new Map();

export interface PlaceablePost {
  id: string;
  feedKey?: string;
}

export function getPostRenderKey(post: PlaceablePost): string {
  return String(post.feedKey ?? post.id);
}

/**
 * Returns a map of post render key → product to render right after that
 * post. Recomputed only when the posts, products or mode change.
 */
export function useFeedProductPlacements(
  posts: readonly PlaceablePost[],
  products: readonly FeedProduct[],
  mode: string,
): ReadonlyMap<string, FeedProduct> {
  const stateRef = useRef<PlacementState | null>(null);

  return useMemo(() => {
    if (!FEED_PRODUCT_MODES.has(mode)) {
      stateRef.current = null;
      return EMPTY_PLACEMENTS;
    }

    // useFockisFeed clears products and posts together when the feed is
    // reset (mode change, refresh, new session): start a new session here.
    if (
      !stateRef.current ||
      stateRef.current.mode !== mode ||
      (posts.length === 0 && products.length === 0)
    ) {
      stateRef.current = createState(mode);
    }

    const state = stateRef.current;
    const nowMs = Date.now();

    const productsById = new Map<string, FeedProduct>();

    for (const product of products) {
      if (!isFeedProductEligible(product, nowMs)) {
        continue;
      }

      const id = getFeedProductId(product);

      if (!productsById.has(id)) {
        productsById.set(id, product);
      }
    }

    const keys = posts.map(getPostRenderKey);
    const keySet = new Set(keys);

    // Drop placements whose post left the feed (deleted, hidden) or whose
    // product is no longer eligible.
    for (const [anchorKey, productId] of state.assignments) {
      if (!keySet.has(anchorKey) || !productsById.has(productId)) {
        state.assignments.delete(anchorKey);
      }
    }

    const placedIds = new Set(state.assignments.values());

    const queue = Array.from(productsById.keys())
      .filter((id) => !placedIds.has(id))
      .sort(
        (a, b) =>
          hashString(`${state.seed}:${a}`) -
            hashString(`${state.seed}:${b}`) || a.localeCompare(b),
      );

    const anchoredIndexes = keys
      .map((key, index) => (state.assignments.has(key) ? index : -1))
      .filter((index) => index >= 0);

    const { firstSlotPositions, minPostsBetween } = FEED_PRODUCT_PLACEMENT;
    const firstSlot =
      firstSlotPositions[state.seed % firstSlotPositions.length];

    let lastProductIndex = Number.NEGATIVE_INFINITY;
    let anchorPointer = 0;

    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];

      while (
        anchorPointer < anchoredIndexes.length &&
        anchoredIndexes[anchorPointer] <= index
      ) {
        anchorPointer += 1;
      }

      if (state.assignments.has(key)) {
        lastProductIndex = index;
        continue;
      }

      const firstVisit = !state.visited.has(key);
      state.visited.add(key);

      if (!firstVisit || queue.length === 0) {
        continue;
      }

      if (index + 1 < firstSlot) {
        continue;
      }

      if (index - lastProductIndex < minPostsBetween) {
        continue;
      }

      const nextAnchor = anchoredIndexes[anchorPointer];

      if (
        nextAnchor !== undefined &&
        nextAnchor - index < minPostsBetween
      ) {
        continue;
      }

      if (!isOpenSlot(index)) {
        continue;
      }

      const productId = queue.shift();

      if (productId) {
        state.assignments.set(key, productId);
        lastProductIndex = index;
      }
    }

    if (state.assignments.size === 0) {
      return EMPTY_PLACEMENTS;
    }

    const placements = new Map<string, FeedProduct>();

    for (const [anchorKey, productId] of state.assignments) {
      const product = productsById.get(productId);

      if (product) {
        placements.set(anchorKey, product);
      }
    }

    return placements;
  }, [posts, products, mode]);
}
