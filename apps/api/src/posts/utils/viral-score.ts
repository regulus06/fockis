/*
 * Stored on Post.score whenever a post is liked, commented on, shared,
 * reposted, viewed or edited.
 *
 * `comments` is an array on the Post schema. The previous version
 * multiplied the array itself (`comments * 2`), which is NaN for any post
 * with comments, so safeViralScore() stored 0. Count it instead.
 *
 * Feed ranking does not score posts with this value (see
 * feed/feed-ranking.ts). FeedService only uses it to pick older,
 * well-engaged "evergreen" candidates for the For You pool.
 */

function count(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function calculateViralScore(post: any): number {
  const likes = count(post?.likes);
  const comments = count(post?.comments);
  const shares = count(post?.shares);

  return likes + comments * 2 + shares * 3;
}
