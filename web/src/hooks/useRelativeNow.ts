import { useSyncExternalStore } from "react";

/* ============================================================================
   SHARED "NOW" CLOCK FOR RELATIVE TIMESTAMPS
   One timer for the whole app, however many posts are on screen. Only the
   components that call useRelativeNow() re-render when it ticks (the
   <time> label in each post header), never the posts, the feed list or
   its data. The timer runs only while something is subscribed, ticks
   every 60 seconds, and catches up immediately when the tab becomes
   visible again (a background tab's timers are throttled).
============================================================================ */

const TICK_MS = 60_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}

function handleVisibility() {
  if (document.visibilityState === "visible") {
    tick();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (listeners.size === 1) {
    now = Date.now();
    timer = setInterval(tick, TICK_MS);

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    }
  };
}

function getSnapshot() {
  return now;
}

/** Current time in ms, refreshed every 60 s for all subscribers at once. */
export function useRelativeNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
