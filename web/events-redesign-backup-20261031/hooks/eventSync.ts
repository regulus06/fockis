import { useEffect, useState } from "react";

import type { FockisEvent } from "../types/event.types";

/* ============================================================================
   EVENT SYNC
   The same event can be on screen several times at once (feed card, rail,
   details page). When an RSVP changes in one place, every copy updates.
   Patches live only in memory for the current page session.
============================================================================ */

type Patch = Partial<FockisEvent> & { id: string };
type Listener = (patch: Patch) => void;

const patches = new Map<string, Patch>();
const listeners = new Set<Listener>();

export function publishEventPatch(patch: Patch) {
  const merged = { ...(patches.get(patch.id) ?? {}), ...patch };

  patches.set(patch.id, merged);
  listeners.forEach((listener) => listener(merged));
}

export function forgetEventPatch(id: string) {
  patches.delete(id);
}

export function useSyncedEvent<T extends FockisEvent>(event: T): T {
  const [patch, setPatch] = useState<Patch | undefined>(() => patches.get(event.id));

  useEffect(() => {
    setPatch(patches.get(event.id));

    const listener: Listener = (next) => {
      if (next.id === event.id) setPatch(next);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, [event.id]);

  // A fresher server copy (newer updatedAt) wins over an older local patch.
  if (!patch) return event;

  return { ...event, ...patch };
}
