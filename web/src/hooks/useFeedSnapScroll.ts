import { useEffect } from "react";

/*
 * TikTok-style feed on phones:
 *  - Each post snaps to the top of the screen, one post per swipe.
 *  - Pinch-zoom and double-tap zoom are blocked while the home feed is open.
 *
 * Styles live in styles/FockisFeedSnap.scss and only apply while the
 * `fk-feed-snap` class is on <html>, so other pages are unaffected.
 *
 * Pass `enabled = false` to switch it off (for example while a modal,
 * the Waves player or the mobile sidebar is open).
 */
export function useFeedSnapScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const root = document.documentElement;
    root.classList.add("fk-feed-snap");

    // iOS Safari ignores user-scalable=no, so block its gesture events.
    const blockGesture = (event: Event) => event.preventDefault();

    // Two fingers on screen = pinch. One finger is left alone so scrolling works.
    const blockPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    // Double-tap zoom. Taps on inputs and buttons are left alone.
    let lastTouchEnd = 0;
    const blockDoubleTapZoom = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest("input, textarea, select, button, a, [contenteditable='true']")) {
        lastTouchEnd = 0;
        return;
      }

      const now = Date.now();

      if (now - lastTouchEnd < 300) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    };

    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("gestureend", blockGesture, { passive: false });
    document.addEventListener("touchmove", blockPinch, { passive: false });
    document.addEventListener("touchend", blockDoubleTapZoom, { passive: false });

    return () => {
      root.classList.remove("fk-feed-snap");
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
      document.removeEventListener("touchmove", blockPinch);
      document.removeEventListener("touchend", blockDoubleTapZoom);
    };
  }, [enabled]);
}
