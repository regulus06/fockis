import { useEffect, useState } from 'react';

/**
 * Formats an elapsed HH:MM:SS timer from a start timestamp.
 * Purely presentational — the authoritative meeting clock lives server-side;
 * this must never be treated as the source of truth for meeting status.
 */
export function useElapsedTimer(startedAt: string | null): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return '00:00:00';
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const h = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
  const s = String(elapsedSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
