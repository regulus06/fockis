import { api } from "../../../api/api";
import fockisFollowApi from "../../../features/gifts/fockisprofile/service/fockisFollowApi";

/* Real discovery data (apps/api/src/feed/feed-discovery.service.ts). */

export interface TrendingTag {
  tag: string;
  posts: number;
  lastPostAt: string | null;
  thumbnail: string | null;
  thumbnailType: "image" | "video" | null;
}

export interface SuggestedPerson {
  id: string;
  name: string;
  username: string;
  avatar: string;
  verified: boolean;
  bio: string;
  mutualCount: number;
  followersCount: number;
}

export const discoveryApi = {
  trending: async (limit = 8) => (await api.get<TrendingTag[]>("/feed/discover/trending", { params: { limit } })).data ?? [],
  people: async (limit = 6, exclude: string[] = []) =>
    (await api.get<SuggestedPerson[]>("/feed/discover/people", { params: { limit, exclude: exclude.slice(-200).join(",") || undefined } })).data ?? [],
  follow: (userId: string) => fockisFollowApi.follow(userId),
  unfollow: (userId: string) => fockisFollowApi.unfollow(userId),
};
