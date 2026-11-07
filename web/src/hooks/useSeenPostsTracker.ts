import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================================
   SEEN POSTS TRACKER
   Reports posts the viewer actually looked at, so the next ranking can
   demote them (Post.viewedBy → seenByViewer in feed-ranking.ts).

   A post counts as seen when at least half of its card, OR a card that
   fills at least half of the screen, stays visible for SEEN_DWELL_MS.
   The second rule matters for tall cards (a portrait photo or video on a
   phone): when a card is more than twice the screen height, half of it
   can never be on screen at once, so the first rule alone never fired
   and those posts were never demoted as seen. IDs are queued and sent in batches to
   POST /feed/seen — never one request per post:
   - every FLUSH_INTERVAL_MS while there is something queued
   - as soon as MAX_BATCH IDs are queued
   - when the page is hidden or closed (keepalive request)
   - before a manual refresh (flush() is awaited, so the new ranking
     already knows what was just seen)

   Cards are found by their data-post-id attribute inside the root
   element, including cards added later by infinite scroll.
============================================================================ */

export const SEEN_DWELL_MS = 1_000;
const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH = 20;
const VISIBLE_RATIO = 0.5;
/** Share of the screen a (tall) card must fill to count as visible. */
const VIEWPORT_FILL_RATIO = 0.5;
const VISIBILITY_THRESHOLDS = Array.from(
  { length: 21 },
  (_, index) => index / 20,
);

export type SendSeen = (
  postIds: string[],
  options: { keepalive: boolean },
) => Promise<void>;

export function useSeenPostsTracker({
  enabled,
  send,
}: {
  enabled: boolean;
  send: SendSeen;
}) {
  const sendRef = useRef(send);
  const enabledRef = useRef(enabled);
  const queueRef = useRef<Set<string>>(new Set());
  /** Reported (or queued) during this page life; never sent twice. */
  const reportedRef = useRef<Set<string>>(new Set());
  const dwellTimersRef = useRef<Map<string, number>>(new Map());
  const [root, setRoot] = useState<HTMLElement | null>(null);

  sendRef.current = send;
  enabledRef.current = enabled;

  const flush = useCallback(async (keepalive = false) => {
    if (!enabledRef.current || queueRef.current.size === 0) {
      return;
    }

    const ids = Array.from(queueRef.current);
    queueRef.current = new Set();

    try {
      await sendRef.current(ids, { keepalive });
    } catch {
      // Best effort: a lost batch only means a post is not demoted.
    }
  }, []);

  const markSeen = useCallback(
    (id: string) => {
      if (reportedRef.current.has(id)) {
        return;
      }

      reportedRef.current.add(id);
      queueRef.current.add(id);

      if (queueRef.current.size >= MAX_BATCH) {
        void flush();
      }
    },
    [flush],
  );

  /* Observe cards inside the root, including ones added later. */
  useEffect(() => {
    if (
      !enabled ||
      !root ||
      typeof IntersectionObserver === "undefined" ||
      typeof MutationObserver === "undefined"
    ) {
      return;
    }

    const timers = dwellTimersRef.current;

    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.postId;

          if (!id || reportedRef.current.has(id)) {
            continue;
          }

          const viewportHeight =
            entry.rootBounds?.height ?? window.innerHeight;

          const visible =
            entry.isIntersecting &&
            (entry.intersectionRatio >= VISIBLE_RATIO ||
              entry.intersectionRect.height >=
                viewportHeight * VIEWPORT_FILL_RATIO);

          if (visible && !timers.has(id)) {
            timers.set(
              id,
              window.setTimeout(() => {
                timers.delete(id);
                markSeen(id);
              }, SEEN_DWELL_MS),
            );
          } else if (!visible && timers.has(id)) {
            window.clearTimeout(timers.get(id));
            timers.delete(id);
          }
        }
      },
      // Fine-grained thresholds so the callback also fires as a tall card
      // scrolls through "fills half the screen", not only at 0 and 50%.
      { threshold: VISIBILITY_THRESHOLDS },
    );

    const observed = new WeakSet<Element>();

    const scan = () => {
      root.querySelectorAll<HTMLElement>("[data-post-id]").forEach((card) => {
        if (!observed.has(card)) {
          observed.add(card);
          intersection.observe(card);
        }
      });
    };

    scan();

    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      intersection.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, [enabled, markSeen, root]);

  /* Periodic flush, and a keepalive flush when the page goes away. */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => void flush(), FLUSH_INTERVAL_MS);

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        void flush(true);
      }
    };

    const onPageHide = () => void flush(true);

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      void flush(true);
    };
  }, [enabled, flush]);

  /** setRoot is the callback ref for the element containing the cards. */
  return { setRoot, flush };
}
