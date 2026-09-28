import { api } from "./api";

/* ============================================================================
   FEED TYPES
============================================================================ */

export type FeedResponse = {
  feed: any[];
  stories: any[];
  products: any[];
  page: number;
  hasMore: boolean;
};

/* ============================================================================
   GET FEED
   Backend:
   GET /feed?page=1&limit=20

   Authentication is handled by the shared `api` Axios instance.
============================================================================ */

export async function getFeed(
  page: number = 1,
  limit: number = 20,
): Promise<FeedResponse> {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 20);

  const response = await api.get<FeedResponse>("/feed", {
    params: {
      page: safePage,
      limit: safeLimit,
    },
  });

  const data = response.data;

  return {
    feed: Array.isArray(data?.feed)
      ? data.feed
      : [],

    stories: Array.isArray(data?.stories)
      ? data.stories
      : [],

    products: Array.isArray(data?.products)
      ? data.products
      : [],

    page:
      typeof data?.page === "number"
        ? data.page
        : safePage,

    hasMore:
      typeof data?.hasMore === "boolean"
        ? data.hasMore
        : false,
  };
}