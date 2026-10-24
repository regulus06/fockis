import { useEffect, useMemo, useState } from "react";

import type { FockisEvent } from "../types/event.types";
import { isEventActive, nextTransition } from "../utils/eventTime";

const MAX_TIMEOUT = 6 * 60 * 60 * 1000;
const BASELINE_TICK = 60_000;

/**
 * Current time, re-rendered exactly when one of `events` changes status
 * (starts or ends), plus a baseline minute tick and on tab focus. A page
 * left open across an event's end time therefore drops that event at the
 * end instant instead of keeping it until the next reload.
 */
export function useEventClock(events: Array<Pick<FockisEvent, "startDate" | "endDate" | "isCancelled">>): number {
  const [now, setNow] = useState(() => Date.now());
  const next = useMemo(() => nextTransition(events, now), [events, now]);

  useEffect(() => {
    if (next === null) return;

    const delay = Math.min(MAX_TIMEOUT, Math.max(0, next - Date.now()) + 50);
    const timer = window.setTimeout(() => setNow(Date.now()), delay);

    return () => window.clearTimeout(timer);
  }, [next]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, BASELINE_TICK);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", tick);
    };
  }, []);

  return now;
}

/** Events still active at `now` (cancelled and ended removed). */
export function useActiveEvents<T extends Pick<FockisEvent, "startDate" | "endDate" | "isCancelled">>(
  events: T[],
): { active: T[]; now: number } {
  const now = useEventClock(events);
  const active = useMemo(() => events.filter((event) => isEventActive(event, now)), [events, now]);

  return { active, now };
}
