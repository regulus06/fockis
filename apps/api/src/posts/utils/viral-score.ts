export function calculateViralScore(post: any): number {
  const likes = post.likes ?? 0;
  const comments = post.comments ?? 0;
  const shares = post.shares ?? 0;

  return likes + comments * 2 + shares * 3;
}