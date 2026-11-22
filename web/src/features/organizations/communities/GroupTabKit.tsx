/**
 * GroupTabKit.tsx — small helpers shared by the group profile tabs.
 */

import { useCallback, useEffect, useState } from "react";

import { errorMessage } from "../ui/orgUi";
import type { GroupProfile } from "./communitiesApi";

export interface TabProps {
  organizationId: string;
  group: GroupProfile;
  notify: (tone: "ok" | "error", text: string) => void;
  /** Reload the group header (counts, membership…). */
  onChanged: () => void;
}

export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError(null);
    load(c.signal)
      .then((d) => !c.signal.aborted && setData(d))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "This section could not be loaded.")));
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export function Loading({ rows = 3, height = 54 }: { rows?: number; height?: number }) {
  return (
    <div className="mn-panel" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mn-sk" style={{ height, marginBottom: 10 }} />
      ))}
    </div>
  );
}

export function ErrorBox({ text }: { text: string }) {
  return (
    <div className="mn-alert" role="alert">
      {text}
    </div>
  );
}

/** Runs an action with toast feedback. */
export async function act(notify: TabProps["notify"], fn: () => Promise<unknown>, ok: string, fail: string): Promise<boolean> {
  try {
    await fn();
    notify("ok", ok);
    return true;
  } catch (err) {
    notify("error", errorMessage(err, fail));
    return false;
  }
}

export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
