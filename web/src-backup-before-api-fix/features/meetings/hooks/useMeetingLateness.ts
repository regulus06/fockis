import { useEffect, useState } from 'react';
import { LATE_THRESHOLD_MINUTES } from '../constants';
import type { MeetingStatus } from '../types';

/**
 * Derives whether a scheduled meeting should be flagged LATE on the client.
 * This is a presentation-layer convenience only — the backend remains the
 * source of truth for `MeetingStatus`; this hook never overrides a status
 * that already came back as 'live', 'ended', or 'cancelled'.
 */
export function useMeetingLateness(startTime: string, status: MeetingStatus) {
  const [isLate, setIsLate] = useState(false);

  useEffect(() => {
    if (status !== 'scheduled' && status !== 'starting_soon') {
      setIsLate(false);
      return;
    }
    const check = () => {
      const startMs = new Date(startTime).getTime();
      const graceMs = LATE_THRESHOLD_MINUTES * 60 * 1000;
      setIsLate(Date.now() > startMs + graceMs);
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, [startTime, status]);

  return isLate;
}
