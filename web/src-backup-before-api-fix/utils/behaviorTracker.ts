import { api } from "../api/api";

type EventType =
  | "view"
  | "like"
  | "share"
  | "comment"
  | "watch_time"
  | "repost"
  | "click";

export async function trackBehavior(data: {
  userId: string;
  targetId: string;
  targetType: "post" | "wave" | "story" | "product";
  event: EventType;
  duration?: number;
}) {
  try {
    await api.post("/behavior", {
      userId: data.userId,
      contentId: data.targetId,
      contentType: data.targetType,
      type: data.event,
      watchTime: data.duration || 0,
    });
  } catch (err) {
    console.log("behavior tracking error", err);
  }
}