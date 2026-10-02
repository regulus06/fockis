import { api } from "./api";

/** FEED */
export const getWaves = async (limit = 20, cursor?: string) => {
  const res = await api.get("/waves/feed", {
    params: { limit, cursor },
  });
  return res.data;
};

/** SINGLE WAVE */
export const getWaveById = async (id: string) => {
  const res = await api.get(`/waves/${id}`);
  return res.data;
};

/** VIEW */
export const viewWave = async (id: string) => {
  return api.post(`/waves/${id}/view`);
};

/** LIKE */
export const likeWave = async (id: string) => {
  return api.post(`/waves/${id}/like`);
};

/** SHARE */
export const shareWave = async (id: string) => {
  return api.post(`/waves/${id}/share`);
};

/** REPOST */
export const repostWave = async (id: string, payload: any) => {
  return api.post(`/waves/${id}/repost`, payload);
};

/** QUOTE */
export const quoteWave = async (id: string, payload: any) => {
  return api.post(`/waves/${id}/quote`, payload);
};