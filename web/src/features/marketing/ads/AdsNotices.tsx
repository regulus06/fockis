/* ============================================================================
   FOCKIS ADS — NOTICES
   Small polite live-region toasts for action results.
============================================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

export interface AdsNotice {
  id: number;
  tone: "success" | "error";
  text: string;
}

export interface AdsNoticeApi {
  items: AdsNotice[];
  success: (text: string) => void;
  error: (text: string) => void;
  dismiss: (id: number) => void;
}

export function useAdsNotices(): AdsNoticeApi {
  const [items, setItems] = useState<AdsNotice[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));

    const timer = timers.current.get(id);

    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone: AdsNotice["tone"], text: string) => {
      const id = nextId.current++;

      setItems((current) => [...current.slice(-2), { id, tone, text }]);
      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4500),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;

    return () => {
      map.forEach((timer) => window.clearTimeout(timer));
      map.clear();
    };
  }, []);

  return {
    items,
    dismiss,
    success: useCallback((text: string) => push("success", text), [push]),
    error: useCallback((text: string) => push("error", text), [push]),
  };
}

export function AdsNotices({ notices }: { notices: AdsNoticeApi }) {
  return (
    <div className="fk-ads-toasts" role="status" aria-live="polite">
      {notices.items.map((item) => (
        <div key={item.id} className={`fk-ads-toast fk-ads-toast--${item.tone}`}>
          {item.tone === "success" ? (
            <CheckCircle2 size={18} aria-hidden="true" />
          ) : (
            <AlertTriangle size={18} aria-hidden="true" />
          )}
          <span>{item.text}</span>
          <button
            type="button"
            className="fk-ads-icon-btn fk-ads-icon-btn--sm"
            onClick={() => notices.dismiss(item.id)}
            aria-label="Dismiss"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
