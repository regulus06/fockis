import { api } from "./api";

// =====================
// GET COMMENTS
// =====================
export async function getComments(targetId: string) {
  const res = await api.get(`/comments/${targetId}`);
  return res.data;
}

// =====================
// CREATE COMMENT
// =====================
export async function createComment(data: {
  targetId: string;
  targetType: "post" | "wave" | "reel" | "story";
  userId: string;
  username: string;
  userPhoto?: string;
  content: string;
}) {
  const res = await api.post("/comments", data);
  return res.data;
}

// =====================
// DELETE COMMENT
// =====================
export async function deleteComment(id: string) {
  const res = await api.delete(`/comments/${id}`);
  return res.data;
}

// =====================
// LIKE COMMENT
// =====================
export async function likeComment(id: string) {
  const res = await api.post(`/comments/${id}/like`);
  return res.data;
}