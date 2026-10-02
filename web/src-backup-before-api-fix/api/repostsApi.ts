import { api } from "./api";

export type RepostPayload = {
  userId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  musicUrl?: string;
  caption?: string;

  originalWaveId?: string;

  repostTo?: {
    userId?: string;
    visibility?: "public" | "friends" | "private";
  };

  quote?: {
    text?: string;
  };
};

export async function createRepost(data: RepostPayload) {
  const res = await api.post("/reposts", data);
  return res.data;
}

export async function getFeedReposts() {
  const res = await api.get("/reposts/feed");
  return res.data;
}