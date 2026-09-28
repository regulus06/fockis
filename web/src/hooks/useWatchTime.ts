import { useEffect, useRef } from "react";
import { trackBehavior } from "../utils/behaviorTracker";

export function useWatchTime(
  targetId: string,
  targetType: "post" | "wave",
  userId: string
) {
  const startTime = useRef<number>(0);

  const start = () => {
    startTime.current = Date.now();
  };

  const end = () => {
    const duration = Date.now() - startTime.current;

    if (!userId || !targetId) return;

    trackBehavior({
      userId,
      targetId,
      targetType,
      event: "watch_time",
      duration,
    });
  };

  return { start, end };
}