import { useEffect, useRef, useState } from "react";

/* ============================================================================
   PULL TO REFRESH (touch screens)
   Only starts when the page is scrolled to the very top and the finger
   moves down. Releasing past PULL_TRIGGER_PX calls onRefresh(); anything
   shorter springs back. The page itself never moves, so nothing in the
   list is rearranged by the gesture. Listeners are passive — scrolling is
   never blocked. While mounted, the browser's own pull-to-refresh (a full
   page reload) is turned off with overscroll-behavior-y.
============================================================================ */

export const PULL_TRIGGER_PX = 72;
const PULL_MAX_PX = 110;
/** Finger travel is damped so the indicator lags behind the finger. */
const RESISTANCE = 0.5;

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  enabled = true,
) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";

    const setDistance = (value: number) => {
      pullRef.current = value;
      setPull(value);
    };

    const onStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) {
        return;
      }

      startYRef.current = window.scrollY <= 0 ? event.touches[0].clientY : null;
    };

    const onMove = (event: TouchEvent) => {
      if (startYRef.current === null) {
        return;
      }

      if (window.scrollY > 0) {
        startYRef.current = null;
        setDistance(0);
        return;
      }

      const delta = (event.touches[0].clientY - startYRef.current) * RESISTANCE;
      setDistance(Math.max(0, Math.min(PULL_MAX_PX, delta)));
    };

    const onEnd = async () => {
      if (startYRef.current === null) {
        return;
      }

      startYRef.current = null;
      const reached = pullRef.current >= PULL_TRIGGER_PX;
      setDistance(0);

      if (!reached) {
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);

      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);

    return () => {
      root.style.overscrollBehaviorY = previous;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [enabled]);

  return { pull, refreshing };
}
